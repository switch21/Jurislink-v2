import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse, requireTenantAccess } from '@/lib/auth-server'
import { getWorkflowTemplate } from '@/lib/workflow-templates'
import { enforceLimit } from '@/lib/plan-limits'

// Allowed sort fields for sanitisation
const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'title', 'reference', 'status', 'priority', 'caseType', 'nextDueDate'] as const
const SORT_ORDERS = ['asc', 'desc'] as const

type SortField = (typeof SORTABLE_FIELDS)[number]
type SortOrder = (typeof SORT_ORDERS)[number]

export async function GET(request: Request) {
  const auth = await authenticate(request, 'case', 'view')
  if (isErrorResponse(auth)) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)

    // Pagination
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
    const skip = (page - 1) * limit

    // Sorting
    const sortByRaw = searchParams.get('sortBy') || 'createdAt'
    const sortOrderRaw = searchParams.get('sortOrder') || 'desc'
    const sortBy: SortField = SORTABLE_FIELDS.includes(sortByRaw as SortField) ? (sortByRaw as SortField) : 'createdAt'
    const sortOrder: SortOrder = SORT_ORDERS.includes(sortOrderRaw as SortOrder) ? (sortOrderRaw as SortOrder) : 'desc'

    // Filters — always scope to authenticated tenant
    const where: Record<string, unknown> = { tenantId: auth.tenantId }

    const status = searchParams.get('status')
    if (status) where.status = status

    const caseType = searchParams.get('caseType')
    if (caseType) where.caseType = caseType

    const priority = searchParams.get('priority')
    if (priority) where.priority = priority

    const clientId = searchParams.get('clientId')
    if (clientId) where.clientId = clientId

    const outcome = searchParams.get('outcome')
    if (outcome) where.outcome = outcome

    const paymentStatus = searchParams.get('paymentStatus')
    if (paymentStatus) where.paymentStatus = paymentStatus

    const search = searchParams.get('search')
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ]
    }

    const assignedTo = searchParams.get('assignedTo')
    if (assignedTo) {
      where.assignments = { some: { userId: assignedTo } }
    }

    const tag = searchParams.get('tag')
    if (tag) {
      where.taggings = { some: { tagId: tag } }
    }

    const [cases, total] = await Promise.all([
      db.case.findMany({
        where,
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
          createdAt: true,
          updatedAt: true,
          tenantId: true,
          clientId: true,
          client: { select: { id: true, fullName: true, company: true } },
          assignments: {
            select: {
              userId: true,
              user: { select: { id: true, fullName: true, email: true } },
            },
          },
          taggings: {
            select: {
              tag: { select: { id: true, name: true, color: true } },
            },
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
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      db.case.count({ where }),
    ])

    // Flatten tags from taggings
    const casesWithTags = cases.map((c) => ({
      ...c,
      tags: c.taggings.map((t) => t.tag),
      taggings: undefined,
    }))

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({ cases: casesWithTags, total, page, totalPages })
  } catch (error) {
    console.error('Liste des dossiers erreur:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'case', 'create')
  if (isErrorResponse(auth)) return auth

  // Plan limit check
  if (auth.tenantId) {
    try {
      const limitDb = getDb()
      const currentCount = await limitDb.case.count({ where: { tenantId: auth.tenantId } })
      const limitCheck = await enforceLimit('cases', auth.tenantId, limitDb, currentCount)
      if (!limitCheck.allowed) {
        await limitDb.$disconnect().catch(() => {})
        return NextResponse.json({ error: limitCheck.message || 'Limite de dossiers atteinte' }, { status: 403 })
      }
      await limitDb.$disconnect().catch(() => {})
    } catch (_e) { /* proceed on error */ }
  }

  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const generateWorkflow = searchParams.get('generateWorkflow') === 'true'

    const body = await request.json()
    const tagIds: string[] = body.tagIds || []
    const assignmentIds: string[] = body.assignments || body.assignmentIds || []

    // Remove fields that go through other paths
    const { tagIds: _tid, assignmentIds: _aid, assignments: _a, ...caseData } = body

    // Create case with assignments in a transaction
    const caze = await db.$transaction(async (tx) => {
      const created = await tx.case.create({
        data: {
          ...caseData,
          nextDueDate: caseData.nextDueDate ? new Date(caseData.nextDueDate) : null,
          outcome: caseData.outcome || null,
          paymentStatus: caseData.paymentStatus || null,
          tenantId: auth.tenantId!,
          assignments: assignmentIds.length
            ? { create: assignmentIds.map((userId: string) => ({ userId, tenantId: auth.tenantId! })) }
            : undefined,
        },
        include: {
          client: { select: { id: true, fullName: true, company: true } },
          assignments: {
            include: { user: { select: { id: true, fullName: true, email: true } } },
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

      // Create taggings
      if (tagIds.length > 0) {
        await tx.caseTagging.createMany({
          data: tagIds.map((tagId: string) => ({
            caseId: created.id,
            tagId,
            tenantId: auth.tenantId!,
          })),
          skipDuplicates: true,
        })
      }

      return created
    })

    // Fetch the case again with tags populated
    const result = await db.case.findUnique({
      where: { id: caze.id },
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
        createdAt: true,
        updatedAt: true,
        tenantId: true,
        clientId: true,
        client: { select: { id: true, fullName: true, company: true } },
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

    const caseWithTags = result
      ? { ...result, tags: result.taggings.map((t) => t.tag), taggings: undefined }
      : caze

    // Auto-generate workflow tasks if requested
    let workflowResult: { taskCount: number; templateName: string } | null = null
    if (generateWorkflow) {
      const template = getWorkflowTemplate(caseData.caseType)
      if (template) {
        const baseDate = new Date(caze.createdAt)
        const firstAssigneeId = caze.assignments.length > 0 ? caze.assignments[0].userId : null
        const tasks = await db.$transaction(
          template.tasks.map((t) => {
            const dueDate = new Date(baseDate)
            dueDate.setDate(dueDate.getDate() + t.dayOffset)
            return db.task.create({
              data: {
                title: t.title,
                description: t.description,
                status: 'a_faire',
                priority: t.priority,
                dueDate,
                tenantId: auth.tenantId!,
                caseId: caze.id,
                assignedToId: firstAssigneeId,
              },
            })
          })
        )
        workflowResult = { taskCount: tasks.length, templateName: template.label }
      }
    }

    return NextResponse.json({ ...caseWithTags, workflow: workflowResult }, { status: 201 })
  } catch (error: any) {
    console.error('Création dossier erreur:', error)
    return NextResponse.json({ error: error?.message || 'Erreur interne du serveur' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
