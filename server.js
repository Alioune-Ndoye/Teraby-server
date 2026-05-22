import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'

import mongoose from 'mongoose'
import connectDB from './config/db.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

// ─── Routes ───────────────────────────────────────────────────────────────────
import bookingRoutes   from './routes/bookingRoutes.js'
import { confirmPage }  from './controllers/bookingController.js'
import scheduleRoutes  from './routes/scheduleRoutes.js'
import whatsappRoutes  from './routes/whatsappRoutes.js'
import aiRoutes        from './routes/aiRoutes.js'
import agentRoutes     from './routes/agentRoutes.js'
import galleryRoutes            from './routes/galleryRoutes.js'
import teamRoutes               from './routes/teamRoutes.js'
import serviceBackgroundRoutes  from './routes/serviceBackgroundRoutes.js'

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express()
const httpServer = createServer(app)

// ─── WebSocket server ─────────────────────────────────────────────────────────
export const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (ws) => {
  console.log('📡 WebSocket client connected')
  ws.send(JSON.stringify({ type: 'connected', message: 'Teraby real-time updates active' }))

  ws.on('close', () => console.log('📡 WebSocket client disconnected'))
  ws.on('error', (err) => console.error('WebSocket error:', err.message))
})

// Broadcast helper used by controllers to push live updates to the dashboard
export const broadcast = (type, payload) => {
  const message = JSON.stringify({ type, payload, ts: Date.now() })
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(message)
  })
}

// ─── Security & parsing ───────────────────────────────────────────────────────
app.use(helmet())
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL  || 'http://localhost:3001',
  process.env.ADMIN_URL     || 'http://localhost:3002',
  'http://localhost:3000',
  'http://localhost:4173',   // vite preview
  'https://teraby-client.vercel.app',
  'https://teraby-admin.vercel.app',
  'https://teraby.fr',
  'https://www.teraby.fr',
]

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Twilio webhook needs raw body — parse BEFORE express.json()
app.use('/api/whatsapp/webhook', express.urlencoded({ extended: false }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

// ─── Global rate limit ────────────────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      Number(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later.' },
}))

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const mongoState = mongoose.connection.readyState
  // 0=disconnected 1=connected 2=connecting 3=disconnecting
  res.json({
    status:    'ok',
    service:   'Teraby Backend',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb:   mongoState === 1 ? 'connected' : 'disconnected',
    mongoState,
  })
})

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/bookings',   bookingRoutes)
app.use('/api/schedule',   scheduleRoutes)
app.use('/api/whatsapp',   whatsappRoutes)
app.use('/api/ai',         aiRoutes)
app.use('/api/agents',     agentRoutes)
app.use('/api/gallery',              galleryRoutes)
app.use('/api/team',                 teamRoutes)
app.use('/api/service-backgrounds',  serviceBackgroundRoutes)

// ─── Mobile confirm page — opened from WhatsApp link ─────────────────────────
// Must be outside /api/* to avoid rate limiting and work as a plain page URL
import asyncHandler from './middleware/asyncHandler.js'
app.get('/confirm/:token', asyncHandler(confirmPage))

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ success: true, message: 'Teraby API is running', version: '1.0.0' })
})

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Teraby backend running on port ${PORT}`)
    console.log(`   ENV:    ${process.env.NODE_ENV || 'development'}`)
    console.log(`   Health: http://localhost:${PORT}/health\n`)
  })
})

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully`)
  httpServer.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))
