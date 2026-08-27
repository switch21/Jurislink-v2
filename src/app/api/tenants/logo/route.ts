import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { getSupabase, isStorageAvailable } from '@/lib/supabase'
import { uploadFile } from '@/lib/storage'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export async function POST(request: Request) {
  const auth = await authenticate(request, 'tenant', 'edit')
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
      return NextResponse.json({ error: 'Type non autorisé (PNG, JPEG, WebP, SVG)' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 2 Mo)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const processed = file.type === 'image/svg+xml'
      ? buffer
      : await sharp(buffer)
          .resize(400, 400, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png()
          .toBuffer()

    const ext = file.type === 'image/svg+xml' ? 'svg' : 'png'
    const logoFileName = `${tenantId}_logo.${ext}`

    const storageKey = await uploadFile(processed, logoFileName, ext === 'svg' ? 'image/svg+xml' : 'image/png', 'logos')

    // For Supabase, try to get a public URL
    let logoUrl = `/api/tenants/logo?file=${encodeURIComponent(storageKey)}`
    if (isStorageAvailable() && storageKey.startsWith('sb://')) {
      const supabase = getSupabase()
      if (supabase) {
        const pathInBucket = storageKey.replace('sb://', '')
        const { data } = supabase.storage.from('documents').getPublicUrl(pathInBucket)
        logoUrl = data.publicUrl
      }
    }

    const tenant = await db.tenant.update({
      where: { id: tenantId },
      data: { logoUrl },
    })

    return NextResponse.json({ logoUrl, tenant })
  } catch (error) {
    console.error('Logo upload error:', error)
    const msg = error instanceof Error ? error.message : "Erreur lors de l'upload"
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
