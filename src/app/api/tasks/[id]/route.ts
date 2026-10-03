import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { fireNotification } from '@/lib/notify'
import { auditAction } from '@/lib/auditLog'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'task', 'view')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const task = await db.task.findUnique({
      where: { id },
      include: {
        case: { select: { id: true, reference: true, title: true } },
        event: { select: { id: true, title: true } },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json(task)
  } catch (error) {
    console.error('Get task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'task', 'edit')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
    }
    if (body.caseId !== undefined) {
      updateData.caseId = body.caseId ?? null
    }
    if (body.eventId !== undefined) {
      updateData.eventId = body.eventId ?? null
    }

    // Handle status transition
    let oldStatus: string | undefined
    if (body.status !== undefined) {
      const existing = await db.task.findUnique({ where: { id }, select: { status: true } })
      oldStatus = existing?.status
      updateData.status = body.status
    }

    const task = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        case: { select: { id: true, reference: true, title: true } },
        event: { select: { id: true, title: true } },
      },
    })

    // Notification: task status changed
    if (oldStatus && body.status && oldStatus !== body.status) {
      const statusLabel = body.status === 'terminee' ? 'terminée' : body.status === 'en_cours' ? 'en cours' : body.status === 'a_faire' ? 'à faire' : body.status
      const caseRef = task.case?.reference || ''
      fireNotification({
        tenantId: task.tenantId,
        type: 'tache',
        title: 'Statut de tâche modifié',
        message: `« ${task.title} »${caseRef ? ` (${caseRef})` : ''} → ${statusLabel}`,
        resourceType: 'task',
        resourceId: task.id,
      })
    }

    await auditAction(request, auth, 'Tâche modifiée', {
      resourceType: 'Task',
      resourceId: id,
      tenantId: task.tenantId,
      metadata:
        oldStatus && body.status && oldStatus !== body.status
          ? { titre: task.title, statut: `${oldStatus} → ${body.status}` }
          : { titre: task.title },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'task', 'delete')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const existing = await db.task.findUnique({
      where: { id },
      select: { tenantId: true, title: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    await db.task.delete({ where: { id } })

    await auditAction(request, auth, 'Tâche supprimée', {
      resourceType: 'Task',
      resourceId: id,
      tenantId: existing.tenantId,
      metadata: { titre: existing.title },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
