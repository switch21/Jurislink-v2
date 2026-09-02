import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, requireTenantAccess } from '@/lib/auth-server'

interface TaskDef {
  title: string
  daysOffset: number
  priority: string
}

const WORKFLOW_BY_CASE_TYPE: Record<string, TaskDef[]> = {
  civil: [
    { title: 'Recueillir les pièces du dossier', daysOffset: 0, priority: 'haute' },
    { title: "Rédiger l'assignation", daysOffset: 3, priority: 'haute' },
    { title: "Signifier l'assignation à l'adversaire", daysOffset: 7, priority: 'haute' },
    { title: 'Préparer les conclusions', daysOffset: 21, priority: 'normale' },
    { title: 'Vérifier les échéances de procédure', daysOffset: 1, priority: 'normale' },
  ],
  penal: [
    { title: 'Constituer le dossier pénal', daysOffset: 0, priority: 'urgente' },
    { title: 'Déposer une plainte', daysOffset: 2, priority: 'urgente' },
    { title: "Préparer l'audience", daysOffset: 7, priority: 'haute' },
    { title: 'Rassembler les preuves', daysOffset: 3, priority: 'haute' },
  ],
  commercial: [
    { title: 'Analyser le contrat commercial', daysOffset: 0, priority: 'haute' },
    { title: 'Rédiger la mise en demeure', daysOffset: 3, priority: 'haute' },
    { title: 'Préparer la citation', daysOffset: 10, priority: 'normale' },
  ],
  social: [
    { title: "Vérifier les droits du salarié", daysOffset: 0, priority: 'haute' },
    { title: "Préparer la saisine du conseil de prud'hommes", daysOffset: 5, priority: 'haute' },
    { title: 'Rassembler les pièces justificatives', daysOffset: 2, priority: 'normale' },
  ],
  administratif: [
    { title: 'Étudier la décision administrative', daysOffset: 0, priority: 'haute' },
    { title: 'Préparer le recours', daysOffset: 7, priority: 'haute' },
    { title: 'Déposer le recours devant le tribunal administratif', daysOffset: 14, priority: 'normale' },
  ],
}

export async function POST(request: Request) {
  const auth = await authenticate(request, 'task', 'create')
  if (auth instanceof NextResponse) return auth
  const db = getDb()

  try {
    const body = await request.json()
    const { caseId, tenantId, customTasks } = body as {
      caseId: string
      tenantId: string
      customTasks?: TaskDef[]
    }

    if (!caseId || !tenantId) {
      return NextResponse.json(
        { error: 'caseId et tenantId sont requis' },
        { status: 400 },
      )
    }

    // Tenant check
    if (!requireTenantAccess(auth, tenantId)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Fetch the case
    const caze = await db.case.findUnique({
      where: { id: caseId },
      include: {
        assignments: {
          select: { userId: true, user: { select: { role: true } } },
        },
      },
    })

    if (!caze) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Determine tasks to create
    let taskDefs: TaskDef[]
    if (customTasks && Array.isArray(customTasks) && customTasks.length > 0) {
      // Use custom tasks from AI suggestions
      taskDefs = customTasks
    } else {
      // Use predefined workflow based on case type
      const template = WORKFLOW_BY_CASE_TYPE[caze.caseType]
      if (!template) {
        return NextResponse.json(
          { error: `Aucun modèle de workflow pour le type « ${caze.caseType} »` },
          { status: 400 },
        )
      }
      taskDefs = template
    }

    // Find first lawyer/associate to assign
    const firstAssignment = caze.assignments.find(
      (a) => a.user?.role === 'avocat' || a.user?.role === 'associe',
    ) || caze.assignments[0]
    const assignedToId = firstAssignment?.userId || null

    const now = new Date()
    const createdTasks: Array<{ id: string; title: string; priority: string; dueDate: Date }> = []

    for (const t of taskDefs) {
      // Deduplicate by (title + caseId)
      const existing = await db.task.count({
        where: { caseId, title: t.title },
      })
      if (existing > 0) continue

      const dueDate = new Date(now)
      dueDate.setDate(dueDate.getDate() + (t.daysOffset || 0))

      const task = await db.task.create({
        data: {
          title: t.title,
          status: 'a_faire',
          priority: t.priority || 'normale',
          dueDate,
          tenantId,
          caseId,
        },
      })

      createdTasks.push({
        id: task.id,
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate as Date,
      })

      // Create notification
      await db.notification.create({
        data: {
          title: 'Tâche workflow créée',
          message: `La tâche « ${t.title} » a été créée pour le dossier ${caze.reference || caze.title}. Échéance : ${dueDate.toLocaleDateString('fr-FR')}.`,
          category: 'tache',
          resourceType: 'task',
          resourceId: task.id,
          tenantId,
          userId: assignedToId,
        },
      })
    }

    return NextResponse.json({
      createdCount: createdTasks.length,
      skippedCount: taskDefs.length - createdTasks.length,
      tasks: createdTasks,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur interne du serveur'
    console.error('Auto workflow error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
