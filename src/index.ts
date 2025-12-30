// src/index.ts
import app from './server.js'
import { connectDatabase } from './config/database.js'

/**
 * Vercel Serverless Function Entry Point
 * 
 * Exports the Express app as a Vercel serverless function.
 * Vercel automatically handles:
 * - Request routing
 * - Lambda function invocation
 * - Response handling
 * 
 * Database connection is established before handling requests.
*/

// Initialize database connection
connectDatabase().catch((error) => {
  console.error('Failed to connect to database:', error)
  // Don't exit in serverless - let Vercel handle retries
})

export default app