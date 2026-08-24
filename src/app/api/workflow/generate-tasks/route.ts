import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface TaskTemplate {
  title: string
  daysOffset: number
  priority: string
}

const WORKFLOW_TEMPLATES: Record<string, TaskTemplate[]> = {
  audience: [
    { title: 'Vérifier le dossier', daysOffset: -7, priority: 'normal' },
    { title: 'Préparer les pièces', daysOffset: -5, priority: 'normal' },
    { title: 'Préparer les conclusions', daysOffset: -3, priority: 'haute' },
    { title: 'Rappel avocat', daysOffset: -1, priority: 'haute' },
  ],
  echeance: [
    { title: 'Préparer le dossier', daysOffset: -3, priority: 'normal' },
    { title: 'Finaliser les pièces', daysOffset: -1, priority: 'haute' },
  ],
  rdv: [
    { title: 'Confirmer le rendez-vous', daysOffset: -1, priority: 'normal' },
  ],
  depot: [
    { title: 'Rassembler documents', daysOffset: -2, priority: 'normal' },
    { title: 'Effectuer dépôt', daysOffset: 0, priority: 'haute' },
  ],
}

export async function POST(request: Request) {
  const db = getDb()
  try {
    const body = await request.json()
    const { tenantId, eventId, caseId } = body

    if (!tenantId || !eventId) {
      return NextResponse.json(
        { error: 'tenantId and eventId are required' },
        { status: 400 }
      )
    }

    const event = await db.event.findUnique({
      where: { id: eventId },
      include: { case: { select: { id: true, reference: true, title: true } } },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const template = WORKFLOW_TEMPLATES[event.eventType]
    if (!template) {
      return NextResponse.json(
        { error: `No workflow template for event type '${event.eventType}'` },
        { status: 400 }
      )
    }

    const linkedCaseId = caseId ?? event.caseId ?? null
    const eventDate = new Date(event.startTime)

    // Build tasks, checking for duplicates by title + caseId + dueDate
    const createdTasks: Array<{
      title: string
      priority: string
      dueDate: Date
    }> = []

    for (const t of template) {
      const dueDate = new Date(eventDate)
      dueDate.setDate(dueDate.getDate() + t.daysOffset)

      // Check if task already exists
      const existingCount = await db.task.count({
        where: {
          tenantId,
          caseId: linkedCaseId,
          title: t.title,
          dueDate,
        },
      })

      if (existingCount > 0) {
        continue // Skip duplicate
      }

      const task = await db.task.create({
        data: {
          title: t.title,
          tenantId,
          caseId: linkedCaseId,
          eventId,
          status: 'a_faire',
          priority: t.priority,
          dueDate,
        },
      })

      createdTasks.push({
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate,
      })

      // Create notification for each generated task
      await db.notification.create({
        data: {
          title: 'Tâche générée automatiquement',
          message: `La tâche « ${t.title} » a été créée pour l'événement « ${event.title} »${event.case ? ` (dossier ${event.case.reference})` : ''}. Échéance : ${dueDate.toLocaleDateString('fr-FR')}.`,
          category: 'tache',
          resourceType: 'task',
          resourceId: task.id,
          tenantId,
          eventId,
        },
      })
    }

    // Fetch all tasks for this event to return
    const tasks = await db.task.findMany({
      where: { eventId, tenantId },
      include: {
        case: { select: { id: true, reference: true, title: true } },
        event: { select: { id: true, title: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json(
      {
        createdCount: createdTasks.length,
        skippedCount: template.length - createdTasks.length,
        tasks,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Generate workflow tasks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
