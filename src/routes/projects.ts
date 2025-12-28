import { Router } from 'express'
import { authenticateJWT } from '../middleware/auth.js'
import { verifyCsrfToken } from '../middleware/csrf.js'
import { walletLimiter } from '../middleware/rateLimiter.js'
import { validateUrl, sanitizeInput, sanitizeNumeric } from '../utils/sanitize.js'
import { ProjectMetadataModel } from '../models/ProjectMetadata.js'
import { verifyProjectOwner, projectExists } from '../services/contractVerifier.js'
import type { ProjectCreateRequest } from '../types/index.js'
import rateLimit from 'express-rate-limit'

const router = Router()

// Constants for validation
const MAX_OVERVIEW_LENGTH = 500
const MAX_URL_LENGTH = 2048
const MAX_PROJECT_ID_LENGTH = 100

/**
 * Rate limiter specifically for metadata updates
 * More restrictive than general API - prevents spam/abuse
 */
import { config } from '../config/env.js'

const metadataLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.floor(config.rateLimit.maxRequests / 10), // 10x stricter than API limit
  keyGenerator: (req) => req.user?.address || req.ip || 'unknown',
  message: {
    success: false,
    message: 'Too many metadata updates. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * POST /api/projects/create
 * Create a new project (protected)
 */
router.post(
  '/create',
  authenticateJWT,
  verifyCsrfToken,
  walletLimiter,
  async (req, res) => {
    try {
      const data = req.body as ProjectCreateRequest
      
      // Sanitize text inputs
      const tokenName = sanitizeInput(data.tokenName)
      const tokenSymbol = sanitizeInput(data.tokenSymbol)
      
      // Validate URL (SSRF protection)
      const tokenLogoURI = validateUrl(data.tokenLogoURI)
      if (!tokenLogoURI) {
        res.status(400).json({
          success: false,
          error: 'Invalid token logo URL',
          message: 'Only HTTPS and IPFS URLs are allowed'
        })
        return
      }
      
      // Sanitize numeric inputs
      const fundingGoal = sanitizeNumeric(data.fundingGoal)
      const softCap = sanitizeNumeric(data.softCap)
      const tokenPrice = sanitizeNumeric(data.tokenPrice)
      
      if (!fundingGoal || !softCap || !tokenPrice) {
        res.status(400).json({
          success: false,
          error: 'Invalid numeric values'
        })
        return
      }
      
      // TODO: Call your smart contract or database
      // Example: await createProjectOnChain(...)
      
      res.json({
        success: true,
        message: 'Project created successfully',
        data: {
          tokenName,
          tokenSymbol,
          tokenLogoURI,
          owner: req.user!.address
        }
      })
      
    } catch (error) {
      console.error('Create project error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create project'
      })
    }
  }
)

/**
 * POST /api/projects/:id/contribute
 * Contribute to a project (protected)
 */
router.post(
  '/:id/contribute',
  authenticateJWT,
  verifyCsrfToken,
  walletLimiter,
  async (req, res) => {
    try {
      const projectId = req.params.id
      const amount = sanitizeNumeric(req.body.amount)
      
      if (!amount) {
        res.status(400).json({
          success: false,
          error: 'Invalid contribution amount'
        })
        return
      }
      
      // TODO: Process contribution
      
      res.json({
        success: true,
        message: 'Contribution recorded',
        data: {
          projectId,
          amount,
          contributor: req.user!.address
        }
      })
      
    } catch (error) {
      console.error('Contribute error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to process contribution'
      })
    }
  }
)

/**
 * GET /api/projects/:id
 * Get project details (public)
 */
router.get('/:id', async (req, res) => {
  try {
    // Guard against excessively long IDs (DoS prevention)
    if (req.params.id?.length > MAX_PROJECT_ID_LENGTH) {
      res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      })
      return
    }
    
    const projectId = sanitizeInput(req.params.id)
    
    // TODO: Fetch project from database/chain
    
    res.json({
      success: true,
      data: {
        id: projectId,
        // ... project data
      }
    })
    
  } catch (error) {
    console.error('Get project error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project'
    })
  }
})

// =============================================
// METADATA ENDPOINTS (SECURED WITH BLOCKCHAIN VERIFICATION)
// =============================================

/**
 * GET /api/projects/:id/metadata
 * Get project metadata (public)
 */
router.get('/:id/metadata', async (req, res) => {
  try {
    // Guard against excessively long IDs
    if (req.params.id?.length > MAX_PROJECT_ID_LENGTH) {
      res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      })
      return
    }
    
    const projectId = sanitizeInput(req.params.id)
    
    const metadata = await ProjectMetadataModel.getByProjectId(projectId)
    
    if (!metadata) {
      res.status(404).json({
        success: false,
        message: 'Metadata not found'
      })
      return
    }
    
    res.json({
      success: true,
      data: metadata
    })
  } catch (error) {
    console.error('Error fetching metadata:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metadata'
    })
  }
})

/**
 * Helper: Validate and sanitize Twitter URL
 */
function validateTwitterUrl(url: string): string | null {
  if (!url || url.length > MAX_URL_LENGTH) return null
  
  const validated = validateUrl(url)
  if (!validated) return null
  
  try {
    const urlObj = new URL(validated)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Must be from x.com or twitter.com
    if (!hostname.includes('twitter.com') && !hostname.includes('x.com')) {
      return null
    }
    
    return validated
  } catch {
    return null
  }
}

/**
 * Helper: Validate and sanitize website URL
 */
function validateWebsiteUrl(url: string): string | null {
  if (!url || url.length > MAX_URL_LENGTH) return null
  
  const validated = validateUrl(url)
  if (!validated) return null
  
  return validated
}

/**
 * POST /api/projects/:id/metadata
 * Create/update project metadata (protected - project owner only)
 * 
 * ✅ SECURED: Verifies ownership against blockchain smart contract
 */
router.post(
  '/:id/metadata',
  authenticateJWT,
  verifyCsrfToken,
  //metadataLimiter,
  async (req, res) => {
    try {
      // Guard against excessively long IDs
      if (req.params.id?.length > MAX_PROJECT_ID_LENGTH) {
        res.status(400).json({
          success: false,
          message: 'Invalid project ID'
        })
        return
      }
      
      const projectId = sanitizeInput(req.params.id)
      const { twitter, website, overview } = req.body
      const walletAddress = req.user?.address
      
      if (!walletAddress) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        })
        return
      }
      
      // ✅ CRITICAL SECURITY: Verify project exists on blockchain
      const exists = await projectExists(projectId)
      if (!exists) {
        res.status(404).json({
          success: false,
          message: 'Project not found on blockchain'
        })
        return
      }
      
      // ✅ CRITICAL SECURITY: Verify ownership from blockchain
      const isOwner = await verifyProjectOwner(projectId, walletAddress)
      
      if (!isOwner) {
        res.status(403).json({
          success: false,
          message: 'Only project owner can update metadata'
        })
        return
      }
      
      // ✅ Validate and sanitize Twitter URL
      let sanitizedTwitter: string | undefined = undefined
      if (twitter) {
        if (typeof twitter !== 'string' || twitter.length > MAX_URL_LENGTH) {
          res.status(400).json({
            success: false,
            message: 'Twitter URL too long or invalid'
          })
          return
        }
        
        const validTwitter = validateTwitterUrl(twitter)
        if (!validTwitter) {
          res.status(400).json({
            success: false,
            message: 'Invalid Twitter URL. Must be from x.com or twitter.com'
          })
          return
        }
        sanitizedTwitter = validTwitter
      }
      
      // ✅ Validate and sanitize website URL
      let sanitizedWebsite: string | undefined = undefined
      if (website) {
        if (typeof website !== 'string' || website.length > MAX_URL_LENGTH) {
          res.status(400).json({
            success: false,
            message: 'Website URL too long or invalid'
          })
          return
        }
        
        const validWebsite = validateWebsiteUrl(website)
        if (!validWebsite) {
          res.status(400).json({
            success: false,
            message: 'Invalid website URL'
          })
          return
        }
        sanitizedWebsite = validWebsite
      }
      
      // ✅ Sanitize and enforce length limit on overview
      let sanitizedOverview: string | undefined = undefined
      if (overview) {
        if (typeof overview !== 'string') {
          res.status(400).json({
            success: false,
            message: 'Invalid overview format'
          })
          return
        }
        
        if (overview.length > MAX_OVERVIEW_LENGTH) {
          res.status(400).json({
            success: false,
            message: `Overview too long. Maximum ${MAX_OVERVIEW_LENGTH} characters allowed.`
          })
          return
        }
        
        const cleaned = sanitizeInput(overview)
        if (cleaned.length > 0) {
          sanitizedOverview = cleaned
        }
      }
      
      // ✅ Save sanitized data - use verified wallet address from JWT
      const metadata = await ProjectMetadataModel.upsert(
        projectId,
        walletAddress, // Use authenticated wallet (already verified as owner)
        {
          twitter: sanitizedTwitter,
          website: sanitizedWebsite,
          overview: sanitizedOverview
        }
      )
      
      res.json({
        success: true,
        data: metadata
      })
    } catch (error) {
      console.error('Error saving metadata:', error)
      
      // Don't leak internal errors to client
      res.status(500).json({
        success: false,
        message: 'Failed to save metadata'
      })
    }
  }
)

export default router