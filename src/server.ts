import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from './config/env.js'
import { connectDatabase } from './config/database.js'
import { apiLimiter, rpcLimiter, authLimiter  } from './middleware/rateLimiter.js'
import { sanitizeRequestBody, sanitizeQueryParams } from './middleware/sanitization.js'
import { ensureCsrfToken } from './middleware/csrf.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import projectRoutes from './routes/projects.js'
import rpcRoutes from './routes/rpc.js'

/**
 * Exhibition Backend - Production-Grade Security
 * 
 * Security Features:
 * ✅ httpOnly cookies for JWT (XSS protection)
 * ✅ CSRF tokens for state-changing requests
 * ✅ Input sanitization (XSS prevention)
 * ✅ URL validation (SSRF protection)
 * ✅ Rate limiting (DDoS/brute force protection)
 * ✅ Wallet signature verification
 * ✅ Optional whitelist enforcement
 * ✅ Helmet security headers
 * ✅ CORS configuration
 * ✅ MongoDB database connection
 */

const app = express()

// =============================================
// 0. TRUST PROXY (Required for Vercel/serverless)
// =============================================
app.set('trust proxy', 1)

// =============================================
// 1. SECURITY HEADERS (Helmet)
// =============================================
if (config.security.helmetEnabled) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      }
    },
    crossOriginEmbedderPolicy: false,
  }))
}

// =============================================
// 2. CORS CONFIGURATION
// =============================================
app.use(cors({
  origin: config.cors.origin,
  credentials: true, // Required for cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}))

// =============================================
// 3. BODY PARSING
// =============================================
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// =============================================
// 4. RATE LIMITING
// =============================================
//app.use('/api', apiLimiter)

// =============================================
// 5. INPUT SANITIZATION
// =============================================
app.use(sanitizeRequestBody)
app.use(sanitizeQueryParams)

// =============================================
// 6. CSRF TOKEN SETUP
// =============================================
app.use(ensureCsrfToken)

// =============================================
// 7. ROOT & HEALTH CHECK
// =============================================
app.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'Exhibition Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      projects: '/api/projects/*'
    }
  })
})

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Exhibition Backend is running',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
  })
})

// =============================================
// 8. API ROUTES
// =============================================
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/projects', apiLimiter, projectRoutes)
app.use('/api/rpc', rpcRoutes, rpcLimiter)

// =============================================
// 9. ERROR HANDLING
// =============================================
app.use(notFoundHandler)
app.use(errorHandler)

// =============================================
// 10. START SERVER (Local Development Only)
// =============================================
// Only start Express server if not in Vercel serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = config.server.port || 3000
  
  // Connect to database first, then start server
  connectDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════╗
║   🚀 Exhibition Backend Started           ║
╠════════════════════════════════════════════╣
║   Port: ${PORT.toString().padEnd(35)}║
║   Mode: ${config.server.nodeEnv.padEnd(35)}║
║   CORS: ${config.cors.origin.padEnd(35)}║
║   Database: ${config.database.dbName.padEnd(30)}║
║   Whitelist: ${(config.auth.walletWhitelist.length > 0 ? `${config.auth.walletWhitelist.length} wallets` : 'Disabled').padEnd(29)}║
╚════════════════════════════════════════════╝
    `)
      })
    })
    .catch((error) => {
      console.error('❌ Failed to start server:', error)
      process.exit(1)
    })
}

export default app