import { MongoClient, Db } from 'mongodb'
import { config } from './env.js'

let client: MongoClient | null = null
let db: Db | null = null
let connectionPromise: Promise<Db> | null = null

/**
 * Connect to MongoDB optimized for Vercel serverless
 * Uses connection pooling and fast timeouts
 */
export async function connectDatabase(): Promise<Db> {
  // Return existing connection immediately
  if (db && client) {
    return db
  }
  
  // If connection in progress, wait for it
  if (connectionPromise) {
    return connectionPromise
  }
  
  // Start new connection with serverless-optimized settings
  connectionPromise = (async () => {
    try {
      client = new MongoClient(config.database.mongoUri, {
        // Serverless-optimized connection pool
        maxPoolSize: 1,  // Single connection per function instance
        minPoolSize: 0,  // Don't maintain minimum connections
        
        // Fast timeouts for serverless
        connectTimeoutMS: 5000,     // 5s instead of 30s
        serverSelectionTimeoutMS: 5000,  // 5s to select server
        socketTimeoutMS: 10000,     // 10s for operations
        
        // Retry configuration
        retryWrites: true,
        retryReads: true,
        
        // Keep connections alive
        maxIdleTimeMS: 60000,  // Close idle connections after 1 min
      })
      
      await client.connect()
      db = client.db(config.database.dbName)
      
      console.log('✅ MongoDB connected successfully')
      return db
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error)
      // Reset state on failure so next request can retry
      connectionPromise = null
      client = null
      db = null
      throw error
    }
  })()
  
  return connectionPromise
}

/**
 * Get database instance, auto-connecting if needed
 */
export async function getDatabase(): Promise<Db> {
  return await connectDatabase()
}

/**
 * Close database connection (for graceful shutdown)
 */
export async function closeDatabase(): Promise<void> {
  if (client) {
    try {
      await client.close()
    } catch (error) {
      console.error('Error closing MongoDB:', error)
    } finally {
      client = null
      db = null
      connectionPromise = null
    }
  }
}