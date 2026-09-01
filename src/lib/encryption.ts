import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

/**
 * AES-256-GCM encryption utility for confidential documents.
 * Uses ENCRYPTION_KEY env var (32-byte hex string) or a deterministic dev fallback.
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits — recommended for GCM
const AUTH_TAG_LENGTH = 16

/** Resolve the 32-byte encryption key from env or dev fallback */
function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY
  if (envKey && envKey.length === 64 && /^[0-9a-f]{64}$/i.test(envKey)) {
    return Buffer.from(envKey, 'hex')
  }
  // Deterministic fallback for development — NEVER use in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ENCRYPTION_KEY non configuré ou invalide. Définissez une variable d\'environnement de 64 caractères hexadécimaux.',
    )
  }
  return Buffer.from(
    'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    'hex',
  )
}

/**
 * Encrypt a buffer using AES-256-GCM.
 * @returns Object with encrypted buffer (includes auth tag appended) and hex IV string.
 */
export function encryptBuffer(plainBuffer: Buffer): { encrypted: Buffer; iv: string } {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final(), cipher.getAuthTag()])
  return { encrypted, iv: iv.toString('hex') }
}

/**
 * Decrypt a buffer encrypted with AES-256-GCM.
 * @param encryptedBuffer Buffer that includes the 16-byte auth tag at the end.
 * @param iv Hex string of the IV used during encryption.
 */
export function decryptBuffer(encryptedBuffer: Buffer, iv: string): Buffer {
  const key = getKey()
  const ivBuffer = Buffer.from(iv, 'hex')

  if (ivBuffer.length !== IV_LENGTH) {
    throw new Error(`IV invalide : attendu ${IV_LENGTH} octets, reçu ${ivBuffer.length}`)
  }

  const authTag = encryptedBuffer.subarray(-AUTH_TAG_LENGTH)
  const ciphertext = encryptedBuffer.subarray(0, -AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

/**
 * Encrypt a file in-place on disk.
 * Reads the file, encrypts it, and overwrites the original.
 * @param absolutePath Absolute path to the file.
 * @returns The hex IV string used (store in DB).
 */
export async function encryptFile(absolutePath: string): Promise<{ iv: string }> {
  const plainBuffer = await readFile(absolutePath)
  const { encrypted, iv } = encryptBuffer(plainBuffer)
  await writeFile(absolutePath, encrypted)
  return { iv }
}

/**
 * Decrypt a file in-place on disk.
 * @param absolutePath Absolute path to the encrypted file.
 * @param iv Hex string of the IV used during encryption.
 */
export async function decryptFile(absolutePath: string, iv: string): Promise<void> {
  const encryptedBuffer = await readFile(absolutePath)
  const plainBuffer = decryptBuffer(encryptedBuffer, iv)
  await writeFile(absolutePath, plainBuffer)
}
