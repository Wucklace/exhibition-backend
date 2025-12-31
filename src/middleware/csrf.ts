import type { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { config } from '../config/env.js'

/**
 * CSRF Protection Middleware
 * 
 * How it works:
 * 1. Server generates a CSRF token and sends it in a cookie
 * 2. Frontend reads the cookie and includes it in request headers
 * 3. Server validates the header matches the cookie
 * 
 * This prevents attackers from making requests from other sites
 */

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate CSRF token
 */
function generateCsrfToken(): string {
  return crypto
    .createHmac('sha256', config.csrf.secret)
    .update(crypto.randomBytes(32).toString('hex'))
    .digest('hex')
}

/**
 * Set CSRF token in cookie
 * Call this on auth routes to issue new tokens
 */
export function setCsrfToken(_req: Request, res: Response): string {
  const token = generateCsrfToken()
  
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // MUST be false so JS can read it
    secure: config.server.isProduction, // HTTPS only in production
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  })
  
  return token
}

/**
 * Verify CSRF token on state-changing requests
 * Use on: POST, PUT, PATCH, DELETE
 */
export function verifyCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip CSRF check for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next()
    return
  }
  
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]
  const headerToken = req.headers[CSRF_HEADER_NAME] as string
  
  if (!cookieToken || !headerToken) {
    res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      message: 'Invalid request origin'
    })
    return
  }
  
  if (cookieToken !== headerToken) {
    res.status(403).json({
      success: false,
      error: 'CSRF token mismatch',
      message: 'Invalid request origin'
    })
    return
  }
  
  next()
}

/**
 * Middleware to automatically set CSRF token on GET requests
 */
export function ensureCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    setCsrfToken(req, res)
  }
  next()
}