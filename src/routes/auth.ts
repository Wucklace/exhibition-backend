// src/routes/auth.ts
import { Router } from 'express'
import { verifyWalletSignature, getExpectedMessage } from '../services/walletVerifier.js'
import { generateToken } from '../services/jwtService.js'
import { setCsrfToken } from '../middleware/csrf.js'
import { authLimiter } from '../middleware/rateLimiter.js'
import { config } from '../config/env.js'
import type { VerifyWalletRequest } from '../types/index.js'

const router = Router()

/**
 * POST /api/auth/verify
 * Verify wallet signature and issue JWT token
 * 
 * FIXED: Auth cookie now supports cross-subdomain access
 */
router.post('/verify', authLimiter, async (req, res) => {
  try {
    const { address, signature, message } = req.body as VerifyWalletRequest
    
    // Validate inputs
    if (!address || !signature || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Address, signature, and message are required'
      })
      return
    }
    
    // Verify signature
    const verification = await verifyWalletSignature(address, signature, message)
    
    if (!verification.isValid) {
      res.status(401).json({
        success: false,
        error: 'Verification failed',
        message: verification.error || 'Invalid signature'
      })
      return
    }
    
    // Generate JWT token
    const token = generateToken(address)
    
    // Set httpOnly cookie with JWT (FIXED for cross-subdomain)
    res.cookie('auth_token', token, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: config.server.isProduction, // HTTPS only in production
      sameSite: config.server.isProduction ? 'none' : 'strict', // 'none' required for cross-subdomain
      domain: config.server.isProduction ? '.exhibitiondefi.xyz' : undefined, // Share across subdomains
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    })
    
    // Set CSRF token (also fixed for cross-subdomain in csrf.ts)
    const csrfToken = setCsrfToken(req, res)
    
    res.json({
      success: true,
      message: 'Authentication successful',
      data: {
        address: verification.recoveredAddress,
        csrfToken, // Send CSRF token in response for initial setup
      }
    })
    
  } catch (error) {
    console.error('Auth verify error:', error)
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Internal server error'
    })
  }
})

/**
 * POST /api/auth/logout
 * Clear auth cookies
 */
router.post('/logout', (_req, res) => {
  // Clear cookies with same domain settings
  res.clearCookie('auth_token', {
    domain: config.server.isProduction ? '.exhibitiondefi.xyz' : undefined,
    secure: config.server.isProduction,
    sameSite: config.server.isProduction ? 'none' : 'strict',
  })
  
  res.clearCookie('csrf_token', {
    domain: config.server.isProduction ? '.exhibitiondefi.xyz' : undefined,
    secure: config.server.isProduction,
    sameSite: config.server.isProduction ? 'none' : 'strict',
  })
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  })
})

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
router.get('/me', async (req, res) => {
  const token = req.cookies?.auth_token
  
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Not authenticated'
    })
    return
  }
  
  const { verifyToken } = await import('../services/jwtService.js')
  const decoded = verifyToken(token)
  
  if (!decoded) {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    })
    return
  }
  
  res.json({
    success: true,
    data: {
      address: decoded.address,
      expiresAt: decoded.exp * 1000
    }
  })
})

/**
 * GET /api/auth/message
 * Get the message that should be signed
 */
router.get('/message', (_req, res) => {
  res.json({
    success: true,
    data: {
      message: getExpectedMessage()
    }
  })
})

export default router