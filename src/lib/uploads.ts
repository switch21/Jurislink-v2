import path from 'path'
import { mkdir } from 'fs/promises'
import os from 'os'

/**
 * Get the writable uploads directory path.
 * In serverless environments (Vercel/Lambda), process.cwd() is read-only.
 * Use /tmp (or OS temp dir) which is always writable.
 */
function getUploadsBase(): string {
  // Check if we're in a serverless/readonly environment
  const isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL
  if (isServerless) {
    return path.join(os.tmpdir(), 'jurislink-uploads')
  }
  return path.join(process.cwd(), 'uploads')
}

let _resolvedDir: string | null = null

/** Get (and ensure) the uploads directory — cached after first call */
export async function getUploadsDir(): Promise<string> {
  if (_resolvedDir) return _resolvedDir
  const dir = getUploadsBase()
  await mkdir(dir, { recursive: true })
  _resolvedDir = dir
  return dir
}

/** Reset cached path (useful for testing) */
export function resetUploadsDir() {
  _resolvedDir = null
}
