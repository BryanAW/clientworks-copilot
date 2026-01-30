import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

import express from 'express'
import cors from 'cors'
import { initOpenAI } from './utils/openai.js'
import clientRoutes from './routes/clients.js'
import marketRoutes from './routes/market.js'
import agentRoutes from './routes/agent.js'
import auditRoutes from './routes/audit.js'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/clients', clientRoutes)
app.use('/api/market', marketRoutes)
app.use('/api/agent', agentRoutes)
app.use('/api/audit', auditRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3000

// Initialize and start server
async function startServer() {
  // Initialize OpenAI (logs status once)
  await initOpenAI()
  
  app.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`)
    console.log(`✓ Demo mode - all responses are mock data`)
  })
}

startServer()
