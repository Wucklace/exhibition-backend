// src/routes/rpc.ts
import express from 'express'
import { config } from '../config/env.js'

const router = express.Router()

router.post('/', async (req, res) => {
  try {
    if (!config.chain.rpcUrl) {
      return res.status(500).json({
        success: false,
        error: 'RPC_URL not configured in backend',
      })
    }

    const response = await fetch(config.chain.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()
    return res.status(response.status).json(data)

  } catch (err) {
    const error = err as Error
    console.error('RPC Proxy Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to contact blockchain RPC endpoint',
      message: error.message,
    })
  }
})

export default router