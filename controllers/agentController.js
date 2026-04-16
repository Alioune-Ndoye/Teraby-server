import AgentLog from '../models/AgentLog.js'
import { runAgent } from '../services/openclawService.js'
import { success, created } from '../utils/responseHelper.js'

const VALID_AGENTS = ['CustomerSupport', 'BookingAssistant', 'Operations']

// ─── POST /api/agents/run ─────────────────────────────────────────────────────
export const runAgentHandler = async (req, res) => {
  const { agentName, task, bookingId, sessionId } = req.body

  if (!VALID_AGENTS.includes(agentName)) {
    return res.status(400).json({
      success: false,
      message: `Invalid agent. Choose from: ${VALID_AGENTS.join(', ')}`,
    })
  }
  if (!task?.trim()) {
    return res.status(400).json({ success: false, message: 'task is required' })
  }

  const result = await runAgent(agentName, task, { bookingId, sessionId })
  return created(res, result, `Agent ${agentName} terminé`)
}

// ─── GET /api/agents/logs ─────────────────────────────────────────────────────
export const getLogs = async (req, res) => {
  const { agentName, status, limit = 20 } = req.query
  const filter = {}
  if (agentName) filter.agentName = agentName
  if (status)    filter.status    = status

  const logs = await AgentLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean()

  return success(res, logs)
}

// ─── GET /api/agents/logs/:id ─────────────────────────────────────────────────
export const getLog = async (req, res) => {
  const log = await AgentLog.findById(req.params.id)
  if (!log) return res.status(404).json({ success: false, message: 'Log introuvable' })
  return success(res, log)
}
