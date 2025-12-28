// src/services/contractVerifier.ts
import { ethers } from 'ethers'
import { config } from '../config/env.js'
import { PROJECT_CONTRACT_ABI } from '../config/abi.js'

// Get contract address from environment variables
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS 

let provider: ethers.JsonRpcProvider | null = null
let contract: ethers.Contract | null = null

function getContract(): ethers.Contract {
  if (!contract) {
    if (!config.chain.rpcUrl) {
      throw new Error('RPC_URL not configured')
    }
    
    if (!CONTRACT_ADDRESS) {
      throw new Error('CONTRACT_ADDRESS not configured')
    }
    
    console.log('[Contract Init] Using RPC:', config.chain.rpcUrl)
    console.log('[Contract Init] Contract Address:', CONTRACT_ADDRESS)
    
    // Use direct RPC URL, not the proxy
    provider = new ethers.JsonRpcProvider(config.chain.rpcUrl)
    contract = new ethers.Contract(CONTRACT_ADDRESS, PROJECT_CONTRACT_ABI, provider)
    
    console.log('[Contract Init] ✅ Contract initialized successfully')
  }
  
  return contract
}

export async function verifyProjectOwner(
  projectId: string,
  walletAddress: string
): Promise<boolean> {
  try {
    // Validate inputs
    if (!projectId || !walletAddress) {
      console.error('[Contract] Invalid projectId or walletAddress')
      return false
    }
    
    // Normalize wallet address
    const normalizedWallet = walletAddress.toLowerCase()
    
    // Convert projectId to BigInt for contract call
    let projectIdBigInt: bigint
    try {
      projectIdBigInt = BigInt(projectId)
    } catch (error) {
      console.error('[Contract] Invalid projectId format:', projectId)
      return false
    }
    
    // Get contract instance
    const contractInstance = getContract()
    
    // Call getProjectDetails - returns [project, progressPercentage, timeRemaining, canContribute, requiredLiquidityTokens, depositedLiquidityTokens, totalContributors]
    const result = await contractInstance.getProjectDetails(projectIdBigInt)
    
    // Extract project struct (first element in the returned tuple)
    const project = result[0]
    
    // Extract owner address from the project struct
    const projectOwner = project.projectOwner
    
    if (!projectOwner) {
      console.error('[Contract] Project owner not found for project:', projectId)
      return false
    }
    
    // Validate it's a valid address
    if (!ethers.isAddress(projectOwner)) {
      console.error('[Contract] Invalid address returned from contract:', projectOwner)
      return false
    }
    
    // Compare addresses (case-insensitive)
    const normalizedOwner = projectOwner.toLowerCase()
    const isOwner = normalizedWallet === normalizedOwner
    
    console.log(`[Contract] Ownership check - Project: ${projectId}, User: ${normalizedWallet}, Owner: ${normalizedOwner}, Match: ${isOwner}`)
    
    return isOwner
    
  } catch (error) {
    console.error('[Contract] Verification error:', error instanceof Error ? error.message : error)
    return false
  }
}

export async function getProjectOwner(
  projectId: string
): Promise<string | null> {
  try {
    if (!projectId) return null
    
    const projectIdBigInt = BigInt(projectId)
    const contractInstance = getContract()
    
    // Call getProjectDetails
    const result = await contractInstance.getProjectDetails(projectIdBigInt)
    
    // Extract project struct (first element)
    const project = result[0]
    const projectOwner = project.projectOwner
    
    if (!projectOwner || !ethers.isAddress(projectOwner)) {
      return null
    }
    
    return projectOwner.toLowerCase()
    
  } catch (error) {
    console.error('Error getting project owner:', error)
    return null
  }
}

export async function projectExists(projectId: string): Promise<boolean> {
  try {
    const owner = await getProjectOwner(projectId)
    
    if (!owner || owner === '0x0000000000000000000000000000000000000000') {
      console.log(`[Project Check] Project ${projectId} does not exist or has zero address`)
      return false
    }
    
    console.log(`[Project Check] Project ${projectId} exists with owner:`, owner)
    return true
  } catch (error) {
    console.error('Error checking project existence:', error)
    return false
  }
}