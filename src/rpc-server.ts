// src/rpc-server.ts
import express from 'express'
import cors from 'cors'
import { rpcLimiter } from './middleware/rateLimiter.js'
import rpcRoutes from './routes/rpc.js'

/**
 * RPC Server – Hard Isolated
 * 
 * Rules:
 * - NO database
 * - NO cookies
 * - NO CSRF
 * - NO auth
 * - Stateless only
 */

const app = express()

// Required for Vercel / proxies
app.set('trust proxy', 1)

// Minimal CORS for RPC
app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}))

// RPC payloads only
app.use(express.json({ limit: '2mb' }))

// Rate limit specifically for RPC
app.use('/api/rpc', rpcLimiter, rpcRoutes)

export default app