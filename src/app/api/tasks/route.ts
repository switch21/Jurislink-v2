import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { fireNotification } from '@/lib/notify'
import { auditAction } from '@/lib/auditLog'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'task', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const caseId = searchParams.get('caseId')
    const search = searchParams.get('search')
    const userId = searchParams.get('userId')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (status) where.status = status
    if (priority) where.priority = priority
    if (caseId) where.caseId = caseId
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    // If userId is provided, filter to tasks on cases the user is assigned to
    if (userId && tenantId) {
      const userCaseAssignments = await db.caseAssignment.findMany({
        where: { userId, tenantId },
        select: { caseId: true },
      })
      const userCaseIds = userCaseAssignments.map((a) => a.caseId)

      if (userCaseIds.length > 0) {
        // Merge with existing OR if search is also present
        const caseFilter = {
          OR: [
            { caseId: { in: userCaseIds } },
            { caseId: null },
          ],
        }
        if (where.OR) {
          // Both userId filter and search filter
          where.AND = [
            { OR: where.OR },
            caseFilter,
          ]
          delete where.OR
        } else {
          Object.assign(where, caseFilter)
        }
      }
    }

    const tasks = await db.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Batch-resolve case refs, assignees and counts (avoids N+1 queries that
    // pushed this endpoint past Vercel's 10s limit and caused 500s in prod)
    const caseIds = [...new Set(tasks.map((t: { caseId: string | null }) => t.caseId).filter(Boolean))] as string[]

    const [cases, assignments, countRows] = await Promise.all([
      caseIds.length > 0
        ? db.case.findMany({
            where: { id: { in: caseIds } },
            select: { id: true, reference: true, title: true },
          })
        : Promise.resolve([]),
      caseIds.length > 0
        ? db.caseAssignment.findMany({
            where: { caseId: { in: caseIds } },
            include: { user: { select: { id: true, fullName: true } } },
          })
        : Promise.resolve([]),
      db.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = $2)::int AS completed FROM tasks WHERE ($1::uuid IS NULL OR tenant_id = $1)',
        tenantId || null,
        'terminee',
      ),
    ])

    const caseById = new Map((cases as Array<{ id: string; reference: string; title: string }>).map((c) => [c.id, c]))
    const assigneesByCase = new Map<string, Array<{ userId: string; fullName: string }>>()
    for (const a of assignments as Array<{ caseId: string; user: { id: string; fullName: string } }>) {
      const list = assigneesByCase.get(a.caseId) || []
      list.push({ userId: a.user.id, fullName: a.user.fullName })
      assigneesByCase.set(a.caseId, list)
    }

    const tasksWithAssignees = tasks.map((task: { caseId: string | null }) => ({
      ...task,
      case: task.caseId ? caseById.get(task.caseId) || null : null,
      event: null,
      assignedUsers: task.caseId ? assigneesByCase.get(task.caseId) || [] : [],
    }))

    const counts = (countRows?.[0] as { total: number; completed: number } | undefined) || { total: 0, completed: 0 }

    return NextResponse.json({ tasks: tasksWithAssignees, _count: { total: counts.total, completed: counts.completed } })
  } catch (error) {
    console.error('List tasks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'task', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const body = await request.json()
    const { title, tenantId, description, priority, dueDate, caseId, eventId, assignedUserIds } = body

    if (!title || !tenantId) {
      return NextResponse.json({ error: 'title and tenantId are required' }, { status: 400 })
    }

    const task = await db.task.create({
      data: {
        title,
        tenantId,
        description: description ?? null,
        priority: priority ?? 'normal',
        status: 'a_faire',
        dueDate: dueDate ? new Date(dueDate) : null,
        caseId: caseId ?? null,
        eventId: eventId ?? null,
      },
      include: {
        case: { select: { id: true, reference: true, title: true } },
        event: { select: { id: true, title: true } },
      },
    })

    // Create CaseAssignments if assignedUserIds is provided and caseId exists
    if (Array.isArray(assignedUserIds) && assignedUserIds.length > 0 && caseId) {
      const assignmentData = assignedUserIds.map((userId: string) => ({
        userId,
        caseId,
        tenantId,
      }))
      await db.caseAssignment.createMany({
        data: assignmentData,
        skipDuplicates: true,
      })
    }

    // Trigger notification (fire-and-forget)
    fireNotification({
      tenantId,
      type: 'tache',
      title: 'Nouvelle tâche',
      message: `Nouvelle tâche : ${title}`,
      resourceType: 'task',
      resourceId: task.id,
    })

    await auditAction(request, auth, 'Tâche créée', {
      resourceType: 'Task',
      resourceId: task.id,
      tenantId,
      metadata: { titre: title },
    })

    // Resolve assigned users for the response
    let assignedUsers: Array<{ userId: string; fullName: string }> = []
    if (caseId) {
      const assignments = await db.caseAssignment.findMany({
        where: { caseId },
        include: { user: { select: { id: true, fullName: true } } },
      })
      assignedUsers = assignments.map((a) => ({
        userId: a.userId,
        fullName: a.user.fullName,
      }))
    }

    return NextResponse.json({ ...task, assignedUsers }, { status: 201 })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
