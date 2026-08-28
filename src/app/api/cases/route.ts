import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'
import { getWorkflowTemplate } from '@/lib/workflow-templates'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'case', 'view')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const caseType = searchParams.get('caseType')
    const priority = searchParams.get('priority')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (status) where.status = status
    if (caseType) where.caseType = caseType
    if (priority) where.priority = priority
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { reference: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const cases = await db.case.findMany({
      where,
      include: {
        client: { select: { id: true, fullName: true } },
        assignments: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(cases)
  } catch (error) {
    console.error('List cases error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'case', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()
  try {
    const { searchParams } = new URL(request.url)
    const generateWorkflow = searchParams.get('generateWorkflow') === 'true'

    const body = await request.json()
    const caze = await db.case.create({
      data: {
        reference: body.reference,
        title: body.title,
        description: body.description,
        caseType: body.caseType,
        status: body.status,
        priority: body.priority,
        isSecret: body.isSecret || false,
        tenantId: body.tenantId,
        clientId: body.clientId,
        adversary: body.adversary,
        jurisdiction: body.jurisdiction,
        amountInDispute: body.amountInDispute,
        billingType: body.billingType,
        assignments: body.assignments?.length
          ? { create: (body.assignments as string[]).map((userId: string) => ({ userId, tenantId: body.tenantId })) }
          : undefined,
      },
      include: { client: { select: { id: true, fullName: true } }, assignments: { include: { user: { select: { id: true, fullName: true } } } } },
    })

    // Auto-generate workflow tasks if requested
    let workflowResult = null
    if (generateWorkflow) {
      const template = getWorkflowTemplate(caze.caseType)
      if (template) {
        const baseDate = new Date(caze.createdAt)
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
                tenantId: caze.tenantId,
                caseId: caze.id,
              },
            })
          })
        )
        workflowResult = { taskCount: tasks.length, templateName: template.label }
      }
    }

    return NextResponse.json({ ...caze, workflow: workflowResult }, { status: 201 })
  } catch (error) {
    console.error('Create case error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
