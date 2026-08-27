import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate } from '@/lib/auth-server'
import { getWorkflowTemplate } from '@/lib/workflow-templates'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'task', 'create')
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const db = getDb()

  try {
    // Fetch the case with its type and tenant
    const caze = await db.case.findUnique({
      where: { id },
      select: {
        id: true,
        caseType: true,
        tenantId: true,
        createdAt: true,
        reference: true,
        title: true,
        assignments: {
          select: { userId: true },
        },
      },
    })

    if (!caze) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Tenant access check
    if (auth.role !== 'root_admin' && auth.tenantId !== caze.tenantId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Get workflow template
    const template = getWorkflowTemplate(caze.caseType)
    if (!template) {
      return NextResponse.json(
        { error: `Aucun modèle de workflow pour le type « ${caze.caseType} »` },
        { status: 400 }
      )
    }

    // Deduplication check: look for tasks matching the first template task title (within this case)
    const firstTaskTitle = template.tasks[0].title
    const existingCount = await db.task.count({
      where: {
        caseId: id,
        title: { contains: firstTaskTitle.slice(0, 20) },
      },
    })

    if (existingCount > 0) {
      return NextResponse.json({
        error: 'Le workflow a déjà été appliqué à ce dossier',
        alreadyApplied: true,
        existingTaskCount: existingCount,
      }, { status: 409 })
    }

    // Calculate due dates based on case creation date
    const baseDate = new Date(caze.createdAt)

    // Create tasks in a transaction
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
            caseId: id,
          },
          include: {
            case: { select: { id: true, reference: true, title: true } },
          },
        })
      })
    )

    return NextResponse.json({
      created: true,
      taskCount: tasks.length,
      tasks,
      templateName: template.label,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
  finally {
    await db.$disconnect().catch(() => {})
  }
}
