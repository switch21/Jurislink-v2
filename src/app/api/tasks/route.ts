import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { fireNotification } from '@/lib/notify'

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
      include: {
        case: {
          select: { id: true, reference: true, title: true },
        },
        event: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // For each task, resolve assigned users via case assignments
    const tasksWithAssignees = await Promise.all(
      tasks.map(async (task) => {
        let assignedUsers: Array<{ userId: string; fullName: string }> = []
        if (task.caseId) {
          const assignments = await db.caseAssignment.findMany({
            where: { caseId: task.caseId },
            include: { user: { select: { id: true, fullName: true } } },
          })
          assignedUsers = assignments.map((a) => ({
            userId: a.userId,
            fullName: a.user.fullName,
          }))
        }
        return {
          ...task,
          assignedUsers,
        }
      })
    )

    // Completed vs total count for dashboard
    const countWhere: Record<string, unknown> = {}
    if (tenantId) countWhere.tenantId = tenantId

    const [total, completed] = await Promise.all([
      db.task.count({ where: countWhere }),
      db.task.count({ where: { ...countWhere, status: 'terminee' } }),
    ])

    return NextResponse.json({ tasks: tasksWithAssignees, _count: { total, completed } })
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
