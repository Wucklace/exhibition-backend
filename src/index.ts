// src/index.ts
import app from './server.js'

/**
 * Vercel Serverless Function Entry Point
 * 
 * Exports the Express app as a Vercel serverless function.
 * Vercel automatically handles:
 * - Request routing
 * - Lambda function invocation
 * - Response handling
 * - Scaling
*/
export default app