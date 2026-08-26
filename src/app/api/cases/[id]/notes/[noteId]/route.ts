import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate } from '@/lib/auth-server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const auth = await authenticate(request, 'case', 'delete')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id, noteId } = await params
    const note = await db.caseNote.findUnique({ where: { id: noteId } })
    if (!note || note.caseId !== id) {
      return NextResponse.json({ error: 'Note non trouvée' }, { status: 404 })
    }
    await db.caseNote.delete({ where: { id: noteId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete note error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
