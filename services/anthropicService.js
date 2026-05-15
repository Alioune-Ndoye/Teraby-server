import Anthropic from '@anthropic-ai/sdk'
import { CHAT_SYSTEM_PROMPT } from '../utils/promptTemplates.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL   = 'claude-sonnet-4-6'
const MAX_TOKENS = 1024

// ─── Single chat turn (with history) ─────────────────────────────────────────
/**
 * Send a message and get a reply from Claude.
 * @param {Array}  history  - Prior messages: [{role, content}]
 * @param {string} userMsg  - The new user message
 * @param {string} system   - Optional system prompt override
 * @returns {string} assistant reply text
 */
export const chat = async (history = [], userMsg, system = CHAT_SYSTEM_PROMPT) => {
  const messages = [
    ...history.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: userMsg },
  ]

  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages,
  })

  return response.content[0]?.text ?? ''
}

// ─── Tool-use call (for agent orchestration) ──────────────────────────────────
/**
 * Run a single Claude tool-use request.
 * @param {string} system   - Agent system prompt
 * @param {Array}  messages - Conversation so far
 * @param {Array}  tools    - Anthropic tool definitions
 * @returns {object} full Anthropic response
 */
export const toolUseCall = async (system, messages, tools) => {
  return client.messages.create({
    model:      MODEL,
    max_tokens: 2048,
    system,
    tools,
    messages,
  })
}

// ─── Streaming chat (optional, returns stream object) ────────────────────────
export const streamChat = async (history = [], userMsg, system = CHAT_SYSTEM_PROMPT) => {
  const messages = [
    ...history.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: userMsg },
  ]

  return client.messages.stream({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages,
  })
}
