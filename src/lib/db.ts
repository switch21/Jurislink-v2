import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

// For use in API routes — creates a fresh client per request (safe for Vercel serverless + PgBouncer)
export function getDb() {
  // Explicitly read DATABASE_URL to ensure it's captured at module evaluation time
  const url = process.env.DATABASE_URL || ''
  return new PrismaClient({
    datasourceUrl: url || undefined,
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  })
}

// Legacy singleton — still works for non-serverless envs
export const db = globalForPrisma.prisma ?? (() => {
  const url = process.env.DATABASE_URL || ''
  return new PrismaClient({
    datasourceUrl: url || undefined,
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  })
})()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
