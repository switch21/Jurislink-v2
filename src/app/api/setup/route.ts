import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { requireRootAdmin } from '@/lib/auth-server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const auth = await requireRootAdmin(request)
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    // Add column if missing (using raw SQL via Prisma)
    try {
      await db.$executeRawUnsafe(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='users' AND column_name='password'
          ) THEN
            ALTER TABLE users ADD COLUMN password TEXT;
          END IF;
        END $$;
      `)
    } catch {}

    // Set default password for users without one
    const pw = await hash('Admin@123', 10)
    const res = await db.user.updateMany({
      where: { password: null as unknown as string },
      data: { password: pw },
    })

    await db.$disconnect().catch(() => {})
    return NextResponse.json({ ok: true, message: `OK. ${res.count} mot(s) de passe mis à jour.` })
  } catch (error) {
    await db.$disconnect().catch(() => {})
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
