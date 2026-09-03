import { getSupabase, isStorageAvailable } from './supabase'
import { writeFile, readFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'

const BUCKET_NAME = 'documents'

// ==================== Public API ====================

/** Upload a file. Returns the storage key (used as filePath in DB). */
export async function uploadFile(
  file: File | Buffer | Uint8Array,
  fileName: string,
  mimeType?: string | null,
  prefix?: string,
): Promise<string> {
  if (isStorageAvailable()) {
    return uploadToSupabase(file, fileName, mimeType, prefix)
  }
  // Warn in serverless environments where local storage is ephemeral
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.error('[storage] CRITICAL: Supabase Storage is not configured. File uploads will be LOST after this request. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  return uploadToLocal(file, fileName, prefix)
}

/** Download a file by storage key. Returns the file buffer. */
export async function downloadFile(storageKey: string): Promise<Buffer> {
  if (storageKey.startsWith('sb://')) {
    return downloadFromSupabase(storageKey)
  }
  return downloadFromLocal(storageKey)
}

/** Delete a file by storage key. */
export async function deleteFile(storageKey: string): Promise<void> {
  if (storageKey.startsWith('sb://')) {
    await deleteFromSupabase(storageKey)
  } else {
    await deleteFromLocal(storageKey)
  }
}

/** Get a public or signed URL for a file (Supabase only). */
export function getPublicUrl(storageKey: string): string | null {
  if (!storageKey.startsWith('sb://')) return null
  const supabase = getSupabase()
  if (!supabase) return null
  const pathInBucket = storageKey.replace('sb://', '')
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(pathInBucket)
  return data.publicUrl
}

// ==================== Supabase Storage ====================

async function uploadToSupabase(
  file: File | Buffer | Uint8Array,
  fileName: string,
  mimeType?: string | null,
  prefix?: string,
): Promise<string> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase non configuré')

  const ext = path.extname(fileName)
  const uniqueName = `${prefix ? prefix + '/' : ''}${randomUUID()}${ext}`

  let buffer: Buffer | Uint8Array
  let contentType = mimeType || 'application/octet-stream'

  if (file instanceof File) {
    buffer = Buffer.from(await file.arrayBuffer())
    if (file.type) contentType = file.type
  } else {
    buffer = file
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(uniqueName, buffer, { contentType, upsert: false })

  if (error) throw new Error(`Erreur Supabase Storage: ${error.message}`)

  return `sb://${uniqueName}`
}

async function downloadFromSupabase(storageKey: string): Promise<Buffer> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase non configuré')

  const pathInBucket = storageKey.replace('sb://', '')
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(pathInBucket)

  if (error) throw new Error(`Fichier introuvable: ${error.message}`)
  return Buffer.from(await data.arrayBuffer())
}

async function deleteFromSupabase(storageKey: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  const pathInBucket = storageKey.replace('sb://', '')
  await supabase.storage.from(BUCKET_NAME).remove([pathInBucket])
}

// ==================== Local fallback ====================

function getLocalDir(): string {
  const isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL
  return isServerless
    ? path.join(os.tmpdir(), 'jurislink-uploads')
    : path.join(process.cwd(), 'uploads')
}

async function ensureLocalDir(): Promise<string> {
  const dir = getLocalDir()
  await mkdir(dir, { recursive: true })
  return dir
}

async function uploadToLocal(
  file: File | Buffer | Uint8Array,
  fileName: string,
  prefix?: string,
): Promise<string> {
  const dir = await ensureLocalDir()
  const ext = path.extname(fileName)
  const uniqueName = `${prefix ? prefix + '/' : ''}${randomUUID()}${ext}`
  const filePath = path.join(dir, uniqueName)

  if (prefix) {
    await mkdir(path.join(dir, prefix), { recursive: true })
  }

  let buffer: Buffer | Uint8Array
  if (file instanceof File) {
    buffer = Buffer.from(await file.arrayBuffer())
  } else {
    buffer = file
  }

  await writeFile(filePath, buffer)
  return uniqueName
}

async function downloadFromLocal(storageKey: string): Promise<Buffer> {
  const dir = await ensureLocalDir()
  const filePath = path.join(dir, storageKey)
  return readFile(filePath)
}

async function deleteFromLocal(storageKey: string): Promise<void> {
  const dir = getLocalDir()
  const filePath = path.join(dir, storageKey)
  try {
    await unlink(filePath)
  } catch {
    // File may already be deleted
  }
}
