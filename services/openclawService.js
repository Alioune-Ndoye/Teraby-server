/**
 * OpenClaw — lightweight agent orchestration built on Claude tool use.
 *
 * Each agent runs a ReAct loop:
 *   1. Claude receives the task + available tools
 *   2. Claude emits a tool_use block  → we execute the tool
 *   3. We feed the tool result back as a tool_result message
 *   4. Repeat until Claude emits a text-only stop_reason ("end_turn")
 *
 * Agents: CustomerSupport | BookingAssistant | Operations
 */

import { toolUseCall } from './anthropicService.js'
import { AGENT_PROMPTS } from '../utils/promptTemplates.js'
import AgentLog from '../models/AgentLog.js'
import Booking from '../models/Booking.js'
import { groupByDay, startOfMonth, endOfMonth } from '../utils/scheduleHelper.js'

// ─── Tool registry ────────────────────────────────────────────────────────────
const TOOLS = {
  // --- Booking tools ---
  get_booking: {
    definition: {
      name: 'get_booking',
      description: 'Retrieve a booking by its ID.',
      input_schema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Booking MongoDB _id' } },
        required: ['id'],
      },
    },
    execute: async ({ id }) => {
      const b = await Booking.findById(id).lean()
      return b ?? { error: 'Not found' }
    },
  },

  list_bookings: {
    definition: {
      name: 'list_bookings',
      description: 'List bookings with optional status filter.',
      input_schema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'accepted', 'declined', 'completed'] },
          limit:  { type: 'number' },
        },
      },
    },
    execute: async ({ status, limit = 20 }) => {
      const filter = status ? { status } : {}
      return Booking.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
    },
  },

  check_slot: {
    definition: {
      name: 'check_slot',
      description: 'Check if a time slot is available on a given date.',
      input_schema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'ISO date string' },
          time: { type: 'string', description: 'HH:MM format' },
        },
        required: ['date', 'time'],
      },
    },
    execute: async ({ date, time }) => {
      const conflict = await Booking.hasConflict(date, time)
      return { available: !conflict, date, time }
    },
  },

  update_booking_status: {
    definition: {
      name: 'update_booking_status',
      description: 'Update the status of a booking.',
      input_schema: {
        type: 'object',
        properties: {
          id:     { type: 'string' },
          status: { type: 'string', enum: ['accepted', 'declined', 'completed'] },
          note:   { type: 'string' },
        },
        required: ['id', 'status'],
      },
    },
    execute: async ({ id, status, note }) => {
      const b = await Booking.findById(id)
      if (!b) return { error: 'Booking not found' }
      b.status = status
      if (note) b.statusHistory.push({ status, note, changedAt: new Date() })
      await b.save()
      return { success: true, id, status }
    },
  },

  get_monthly_stats: {
    definition: {
      name: 'get_monthly_stats',
      description: 'Return booking counts and revenue estimate for the current month.',
      input_schema: { type: 'object', properties: {} },
    },
    execute: async () => {
      const start = startOfMonth(new Date())
      const end   = endOfMonth(new Date())
      const bookings = await Booking.find({ date: { $gte: start, $lte: end } }).lean()
      const byStatus = bookings.reduce((acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1
        return acc
      }, {})
      const revenue = bookings
        .filter((b) => b.status !== 'declined')
        .reduce((sum, b) => sum + (b.estimatedPrice || 0), 0)
      return { total: bookings.length, byStatus, estimatedRevenue: revenue, groupedByDay: groupByDay(bookings) }
    },
  },
}

// ─── Agent definitions ────────────────────────────────────────────────────────
const AGENT_TOOLS = {
  CustomerSupport:  ['get_booking', 'list_bookings', 'update_booking_status'],
  BookingAssistant: ['check_slot', 'list_bookings', 'get_booking'],
  Operations:       ['list_bookings', 'get_monthly_stats', 'check_slot'],
}

// ─── Run an agent ─────────────────────────────────────────────────────────────
export const runAgent = async (agentName, task, { bookingId, sessionId } = {}) => {
  const log = await AgentLog.create({ agentName, task, bookingId, sessionId })

  const toolNames  = AGENT_TOOLS[agentName] || []
  const toolDefs   = toolNames.map((n) => TOOLS[n].definition)
  const systemPrompt = AGENT_PROMPTS[agentName]

  const messages = [{ role: 'user', content: task }]
  const MAX_STEPS = 10
  let steps = 0

  try {
    while (steps < MAX_STEPS) {
      steps++
      const response = await toolUseCall(systemPrompt, messages, toolDefs)

      // Push assistant turn
      messages.push({ role: 'assistant', content: response.content })

      // If no tool calls — we're done
      const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')
      if (toolUseBlocks.length === 0) {
        const resultText = response.content.find((b) => b.type === 'text')?.text ?? ''
        log.status      = 'completed'
        log.completedAt = new Date()
        log.result      = resultText
        log.steps       = messages
          .filter((m) => m.role === 'assistant')
          .flatMap((m) => m.content)
          .filter((b) => b.type === 'tool_use')
          .map((b) => ({ tool: b.name, input: b.input }))
        await log.save()
        return { success: true, result: resultText, logId: log._id }
      }

      // Execute each tool call
      const toolResults = []
      for (const block of toolUseBlocks) {
        const handler = TOOLS[block.name]
        let output
        if (!handler) {
          output = { error: `Unknown tool: ${block.name}` }
        } else {
          try {
            output = await handler.execute(block.input)
          } catch (e) {
            output = { error: e.message }
          }
        }
        log.steps.push({ tool: block.name, input: block.input, output })
        toolResults.push({
          type:        'tool_result',
          tool_use_id: block.id,
          content:     JSON.stringify(output),
        })
      }

      // Feed tool results back
      messages.push({ role: 'user', content: toolResults })
    }

    // Hit max steps
    log.status      = 'failed'
    log.completedAt = new Date()
    log.error       = 'Max steps reached'
    await log.save()
    return { success: false, error: 'Max steps reached', logId: log._id }
  } catch (err) {
    log.status      = 'failed'
    log.completedAt = new Date()
    log.error       = err.message
    await log.save()
    throw err
  }
}
