import { Router } from 'express'
import { authenticateJWT } from '../middleware/auth.js'
import { verifyCsrfToken } from '../middleware/csrf.js'
import { walletLimiter } from '../middleware/rateLimiter.js'
import { validateUrl, sanitizeInput, sanitizeNumeric } from '../utils/sanitize.js'
import { ProjectMetadataModel } from '../models/ProjectMetadata.js'
import type { ProjectCreateRequest } from '../types/index.js'

const router = Router()

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
// METADATA ENDPOINTS (NEW)
// =============================================

/**
 * GET /api/projects/:id/metadata
 * Get project metadata (public)
 */
router.get('/:id/metadata', async (req, res) => {
  try {
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
 * POST /api/projects/:id/metadata
 * Create/update project metadata (protected - project owner only)
 */
router.post(
  '/:id/metadata',
  authenticateJWT,
  verifyCsrfToken,
  async (req, res) => {
    try {
      const projectId = sanitizeInput(req.params.id)
      const { twitter, website, overview, ownerAddress } = req.body
      const walletAddress = req.user?.address
      
      if (!walletAddress) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        })
        return
      }
      
      // Verify the authenticated wallet matches the project owner
      if (walletAddress.toLowerCase() !== ownerAddress?.toLowerCase()) {
        res.status(403).json({
          success: false,
          message: 'Only project owner can update metadata'
        })
        return
      }
      
      // Validate URLs if provided
      if (twitter) {
        const validTwitter = validateUrl(twitter)
        if (!validTwitter) {
          res.status(400).json({
            success: false,
            message: 'Invalid Twitter URL'
          })
          return
        }
      }
      
      if (website) {
        const validWebsite = validateUrl(website)
        if (!validWebsite) {
          res.status(400).json({
            success: false,
            message: 'Invalid website URL'
          })
          return
        }
      }
      
      // Sanitize overview text
      const sanitizedOverview = overview ? sanitizeInput(overview) : undefined
      
      const metadata = await ProjectMetadataModel.upsert(
        projectId,
        walletAddress,
        {
          twitter: twitter || undefined,
          website: website || undefined,
          overview: sanitizedOverview
        }
      )
      
      res.json({
        success: true,
        data: metadata
      })
    } catch (error) {
      console.error('Error saving metadata:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to save metadata'
      })
    }
  }
)

export default router