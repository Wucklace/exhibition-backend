// src/middleware/csrf.ts
import type { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { config } from '../config/env.js'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

function generateCsrfToken(): string {
  return crypto
    .createHmac('sha256', config.csrf.secret)
    .update(crypto.randomBytes(32).toString('hex'))
    .digest('hex')
}

/**
 * Set CSRF token in cookie
 */
export function setCsrfToken(_req: Request, res: Response): string {
  const token = generateCsrfToken()
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // allow JS access
    secure: config.server.isProduction,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  })
  return token
}

/**
 * Middleware: Ensure CSRF token exists on GET requests
 */
export function ensureCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET') {
    if (!req.cookies?.[CSRF_COOKIE_NAME]) {
      setCsrfToken(req, res)
    }
  }
  next()
}

/**
 * Middleware: Verify CSRF token on state-changing requests
 */
export function verifyCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]
  const headerToken = req.headers[CSRF_HEADER_NAME] as string

  if (!cookieToken || !headerToken) {
    res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      message: 'Invalid request origin',
    })
    return
  }

  if (cookieToken !== headerToken) {
    res.status(403).json({
      success: false,
      error: 'CSRF token mismatch',
      message: 'Invalid request origin',
    })
    return
  }

  next()
}