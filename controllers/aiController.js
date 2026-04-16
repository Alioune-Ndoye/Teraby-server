import ChatLog from '../models/ChatLog.js'
import { chat } from '../services/anthropicService.js'
import { success } from '../utils/responseHelper.js'
import { v4 as uuidv4 } from 'uuid'

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────
export const chatHandler = async (req, res) => {
  const { message, sessionId: incomingSessionId } = req.body

  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: 'message is required' })
  }

  const sessionId = incomingSessionId || uuidv4()

  // Load or create session log
  let log = await ChatLog.findOne({ sessionId })
  if (!log) {
    log = await ChatLog.create({
      sessionId,
      userAgent: req.headers['user-agent'],
      ip:        req.ip,
    })
  }

  // Build history for Claude (last 20 messages to stay within context)
  const history = log.messages.slice(-20).map(({ role, content }) => ({ role, content }))

  const reply = await chat(history, message)

  // Persist both turns
  log.messages.push({ role: 'user', content: message })
  log.messages.push({ role: 'assistant', content: reply })
  await log.save()

  return success(res, { reply, sessionId })
}

// ─── GET /api/ai/sessions ─────────────────────────────────────────────────────
export const getSessions = async (_req, res) => {
  const sessions = await ChatLog.find()
    .sort({ updatedAt: -1 })
    .limit(50)
    .select('sessionId messageCount resolved createdAt updatedAt')
    .lean()
  return success(res, sessions)
}

// ─── GET /api/ai/sessions/:sessionId ─────────────────────────────────────────
export const getSession = async (req, res) => {
  const log = await ChatLog.findOne({ sessionId: req.params.sessionId })
  if (!log) return res.status(404).json({ success: false, message: 'Session introuvable' })
  return success(res, log)
}
