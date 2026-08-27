import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { getDb } from '@/lib/db'
import { randomUUID } from 'crypto'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { getUploadsDir } from '@/lib/uploads'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export async function POST(request: Request) {
  const auth = await authenticate(request, 'tenant', 'update')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const formData = await request.formData()
    const file = formData.get('logo') as File | null
    const tenantId = formData.get('tenantId') as string | null

    if (!file || !tenantId) {
      return NextResponse.json({ error: 'Fichier et tenantId requis' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé (PNG, JPEG, WebP, SVG)' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 2 Mo)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Resize to max 400x400, keep aspect ratio
    const processed = file.type === 'image/svg+xml'
      ? buffer
      : await sharp(buffer)
          .resize(400, 400, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png()
          .toBuffer()

    const uploadsDir = await getUploadsDir()
    const logoDir = path.join(uploadsDir, 'logos')
    await mkdir(logoDir, { recursive: true })

    const ext = file.type === 'image/svg+xml' ? 'svg' : 'png'
    const filename = `${tenantId}_${randomUUID().slice(0, 8)}.${ext}`
    const filepath = path.join(logoDir, filename)

    await writeFile(filepath, processed)

    const logoUrl = `/uploads/logos/${filename}`

    // Update tenant
    const tenant = await db.tenant.update({
      where: { id: tenantId },
      data: { logoUrl },
    })

    return NextResponse.json({ logoUrl, tenant })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
