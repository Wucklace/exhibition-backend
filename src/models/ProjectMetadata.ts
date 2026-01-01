import { getDatabase } from '../config/database.js'
import { ObjectId } from 'mongodb'

export interface ProjectMetadata {
  _id?: ObjectId
  projectId: string
  twitter?: string
  website?: string
  overview?: string
  ownerAddress: string
  lastUpdated: number
  createdAt: number
}

const COLLECTION_NAME = 'project_metadata'

export class ProjectMetadataModel {
  /**
   * Get metadata for a project
   */
  static async getByProjectId(projectId: string): Promise<ProjectMetadata | null> {
    const db = getDatabase()
    const collection = db.collection<ProjectMetadata>(COLLECTION_NAME)
    
    const metadata = await collection.findOne({ projectId })
    return metadata
  }

  /**
   * Create or update metadata for a project
   */
  static async upsert(
    projectId: string,
    ownerAddress: string,
    data: {
      twitter?: string
      website?: string
      overview?: string
    }
  ): Promise<ProjectMetadata> {
    const db = getDatabase()
    const collection = db.collection<ProjectMetadata>(COLLECTION_NAME)
    
    const now = Date.now()
    
    const result = await collection.findOneAndUpdate(
      { projectId },
      {
        $set: {
          ...data,
          ownerAddress: ownerAddress.toLowerCase(),
          lastUpdated: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      }
    )
    
    return result as ProjectMetadata
  }

  /**
   * Delete metadata for a project
   */
  static async delete(projectId: string): Promise<boolean> {
    const db = getDatabase()
    const collection = db.collection<ProjectMetadata>(COLLECTION_NAME)
    
    const result = await collection.deleteOne({ projectId })
    return result.deletedCount > 0
  }
}