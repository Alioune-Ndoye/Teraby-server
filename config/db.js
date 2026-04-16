import mongoose from 'mongoose'

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 3000

let retries = 0

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    console.log(`✅ MongoDB connected: ${conn.connection.host}`)
    retries = 0
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`)

    if (retries < MAX_RETRIES) {
      retries++
      console.log(`🔄 Retrying connection (${retries}/${MAX_RETRIES}) in ${RETRY_DELAY_MS / 1000}s...`)
      setTimeout(connectDB, RETRY_DELAY_MS)
    } else {
      console.error('💀 Max retries reached. Exiting.')
      process.exit(1)
    }
  }
}

// Log connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting reconnect...')
  if (retries < MAX_RETRIES) connectDB()
})

mongoose.connection.on('error', (err) => {
  console.error(`❌ Mongoose error: ${err.message}`)
})

export default connectDB
