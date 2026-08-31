import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse, requireTenantAccess } from '@/lib/auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'case', 'view')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const { id } = await params
    const caze = await db.case.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        title: true,
        description: true,
        caseType: true,
        status: true,
        outcome: true,
        paymentStatus: true,
        priority: true,
        isSecret: true,
        adversary: true,
        jurisdiction: true,
        amountInDispute: true,
        billingType: true,
        nextDueDate: true,
        aiAnalysis: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
        clientId: true,
        tenant: { select: { id: true, name: true, slug: true } },
        client: { select: { id: true, fullName: true, company: true, email: true, phone: true } },
        assignments: {
          select: {
            userId: true,
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        notes: {
          include: {
            author: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        events: {
          include: {
            assignments: {
              include: {
                user: { select: { id: true, fullName: true } },
              },
            },
          },
          orderBy: { startTime: 'desc' },
        },
        taggings: {
          select: { tag: { select: { id: true, name: true, color: true } } },
        },
        _count: {
          select: {
            tasks: true,
            notes: true,
            documents: true,
            assignments: true,
            events: true,
            invoices: true,
          },
        },
      },
    })

    if (!caze) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Tenant check
    if (!requireTenantAccess(auth, caze.tenantId)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const caseWithTags = {
      ...caze,
      tags: caze.taggings.map((t) => t.tag),
      taggings: undefined,
    }

    return NextResponse.json(caseWithTags)
  } catch (error) {
    console.error('Récupération dossier erreur:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'case', 'edit')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()

    const tagIds: string[] = body.tagIds || []
    const assignmentIds: string[] = body.assignmentIds || []
    const tasks: Array<{ id?: string; assignedToId?: string; [key: string]: unknown }> = body.tasks || []

    // Remove fields that go through other paths
    const {
      tagIds: _tid,
      assignmentIds: _aid,
      tasks: _tasks,
      ...caseData
    } = body

    // Perform all updates in a transaction
    await db.$transaction(async (tx) => {
      // Verify case exists and belongs to tenant
      const existing = await tx.case.findUnique({
        where: { id },
        select: { tenantId: true },
      })
      if (!existing) throw new Error('Dossier non trouvé')
      if (!requireTenantAccess(auth, existing.tenantId)) throw new Error('Accès refusé')

      // Update case fields
      await tx.case.update({
        where: { id },
        data: {
          ...caseData,
          nextDueDate: caseData.nextDueDate ? new Date(caseData.nextDueDate) : (caseData.nextDueDate === null ? null : undefined),
        },
      })

      // Update assignments if provided
      if (assignmentIds.length > 0 || body.assignmentIds !== undefined) {
        await tx.caseAssignment.deleteMany({ where: { caseId: id } })
        if (assignmentIds.length > 0) {
          await tx.caseAssignment.createMany({
            data: assignmentIds.map((userId: string) => ({
              userId,
              caseId: id,
              tenantId: existing.tenantId,
            })),
            skipDuplicates: true,
          })
        }
      }

      // Update taggings
      await tx.caseTagging.deleteMany({ where: { caseId: id } })
      if (tagIds.length > 0) {
        await tx.caseTagging.createMany({
          data: tagIds.map((tagId: string) => ({
            caseId: id,
            tagId,
            tenantId: existing.tenantId,
          })),
          skipDuplicates: true,
        })
      }

      // Update tasks' assignedToId if tasks array provided
      for (const task of tasks) {
        if (task.id && task.assignedToId !== undefined) {
          await tx.task.update({
            where: { id: task.id },
            data: { assignedToId: task.assignedToId || null },
          })
        }
      }
    })

    // Fetch and return the updated case with full details
    const updated = await db.case.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        title: true,
        description: true,
        caseType: true,
        status: true,
        outcome: true,
        paymentStatus: true,
        priority: true,
        isSecret: true,
        adversary: true,
        jurisdiction: true,
        amountInDispute: true,
        billingType: true,
        nextDueDate: true,
        aiAnalysis: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
        clientId: true,
        client: { select: { id: true, fullName: true, company: true, email: true, phone: true } },
        assignments: {
          select: {
            userId: true,
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        taggings: {
          select: { tag: { select: { id: true, name: true, color: true } } },
        },
        _count: {
          select: {
            tasks: true,
            notes: true,
            documents: true,
            assignments: true,
            events: true,
            invoices: true,
          },
        },
      },
    })

    const caseWithTags = updated
      ? { ...updated, tags: updated.taggings.map((t) => t.tag), taggings: undefined }
      : null

    return NextResponse.json(caseWithTags)
  } catch (error: any) {
    console.error('Mise à jour dossier erreur:', error)
    const status = error?.message === 'Dossier non trouvé' ? 404
      : error?.message === 'Accès refusé' ? 403
      : 500
    return NextResponse.json({ error: error?.message || 'Erreur interne du serveur' }, { status })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'case', 'delete')
  if (isErrorResponse(auth)) return auth

  const db = getDb()
  try {
    const { id } = await params

    // Verify case exists and tenant access
    const existing = await db.case.findUnique({
      where: { id },
      select: { tenantId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }
    if (!requireTenantAccess(auth, existing.tenantId)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await db.case.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Suppression dossier erreur:', error)
    return NextResponse.json({ error: error?.message || 'Erreur interne du serveur' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
