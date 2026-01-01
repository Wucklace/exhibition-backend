import { MongoClient, Db } from 'mongodb'
import { config } from './env.js'

let client: MongoClient | null = null
let db: Db | null = null

export async function connectDatabase(): Promise<Db> {
  if (db) {
    return db // Return existing connection
  }

  try {
    client = new MongoClient(config.database.mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
    })

    await client.connect()
    db = client.db(config.database.dbName)
    
    console.log('✅ MongoDB connected successfully')
    return db
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error)
    throw error
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase() first.')
  }
  return db
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
    console.log('MongoDB connection closed')
  }
}