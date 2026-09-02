/**
 * POST /api/invoices/[id]/remind
 * Send a reminder for an overdue invoice.
 * Creates a ReminderLog entry and a Communication record.
 * Optionally auto-detects the level based on days overdue.
 */
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { authenticate, isErrorResponse } from '@/lib/auth-server'

const REMINDER_CONFIG: Record<number, {
  daysAfterDue: number
  label: string
  subject: string
  body: (data: ReminderData) => string
}> = {
  1: {
    daysAfterDue: 0, // immediate on trigger
    label: '1ère relance',
    subject: 'Rappel : Facture impayée #{invoiceNumber}',
    body: (d) => `Bonjour ${d.clientName},\n\nNous vous rappelons que la facture n° ${d.invoiceNumber} d'un montant de ${d.amountFormatted} est arrivée à échéance le ${d.dueDateFormatted}.\n\nLe solde restant dû s'élève à ${d.remainingFormatted}.\n\nNous vous prions de bien vouloir procéder au règlement dans les plus brefs délais.\n\nCordialement,\n${d.tenantName}`,
  },
  2: {
    daysAfterDue: 0,
    label: '2ème relance',
    subject: '2ème rappel : Facture impayée #{invoiceNumber}',
    body: (d) => `Bonjour ${d.clientName},\n\nMalgré notre premier rappel du ${d.lastReminderFormatted}, la facture n° ${d.invoiceNumber} d'un montant de ${d.amountFormatted} (échéance : ${d.dueDateFormatted}) demeure impayée.\n\nLe solde restant dû est de ${d.remainingFormatted} (${d.daysOverdue} jours de retard).\n\nSans règlement rapide, nous serons contraints de procéder à une mise en demeure.\n\nCordialement,\n${d.tenantName}`,
  },
  3: {
    daysAfterDue: 0,
    label: '3ème relance',
    subject: 'Dernier rappel avant mise en demeure — Facture #{invoiceNumber}',
    body: (d) => `Madame, Monsieur ${d.clientName},\n\nNous n'avons toujours pas reçu le règlement de la facture n° ${d.invoiceNumber} d'un montant de ${d.amountFormatted} (échéance : ${d.dueDateFormatted}).\n\nSolde restant : ${d.remainingFormatted}\nRetard : ${d.daysOverdue} jours\n\nCeci constitue notre dernier rappel amiable. À défaut de règlement sous 15 jours, une procédure de mise en demeure sera engagée, avec les frais et intérêts de retard qui en découlent.\n\nCordialement,\n${d.tenantName}`,
  },
  4: {
    daysAfterDue: 0,
    label: 'Mise en demeure',
    subject: 'MISE EN DEMEURE — Facture impayée #{invoiceNumber}',
    body: (d) => `MISE EN DEMEURE\n\nÀ l'attention de ${d.clientName}${d.clientCompany ? ` (${d.clientCompany})` : ''}\n\nPar la présente, nous vous mettons en demeure de payer la somme de ${d.remainingFormatted} au titre de la facture n° ${d.invoiceNumber} du ${d.dueDateFormatted}.\n\nMalgré nos relances amiables des ${d.lastReminderFormatted ? `derniers jours` : `jours précédents`}, cette facture d'un montant total de ${d.amountFormatted} demeure impayée depuis ${d.daysOverdue} jours.\n\nNous vous accordons un délai de 8 jours à compter de la réception de la présente pour procéder au règlement intégral, sous peine de poursuites judiciaires.\n\nFrais de recouvrement et intérêts de retard au taux légal seront réclamés.\n\nCordialement,\n${d.tenantName}`,
  },
}

interface ReminderData {
  clientName: string
  clientCompany?: string | null
  invoiceNumber: string
  amountFormatted: string
  remainingFormatted: string
  dueDateFormatted: string
  daysOverdue: number
  tenantName: string
  lastReminderFormatted?: string
}

function formatCurrency(amount: number, code?: string | null): string {
  const symbol = code === 'XAF' ? 'FCFA' : code || 'FCFA'
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' ' + symbol
}

function formatDateFR(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'invoice', 'edit')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const body = await request.json()
    const level = body.level // if not provided, auto-detect
    const method = body.method || 'email'

    // Fetch invoice with relations
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, fullName: true, company: true, email: true, phone: true } },
        tenant: { select: { id: true, name: true, email: true, phone: true } },
        payments: { select: { amount: true } },
      },
    })

    if (!invoice) return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    if (invoice.type !== 'facture') return NextResponse.json({ error: 'Seules les factures peuvent faire l\'objet d\'une relance' }, { status: 400 })
    if (invoice.status === 'paye') return NextResponse.json({ error: 'Cette facture est déjà payée' }, { status: 400 })

    const now = new Date()
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null
    const daysOverdue = dueDate ? Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86400000)) : 0
    const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0)
    const remaining = Math.max(0, invoice.amount - totalPaid)

    // Determine level
    let reminderLevel = level || (invoice.reminderLevel + 1)
    if (reminderLevel > 4) reminderLevel = 4

    // Check if this level was already sent recently (within 3 days)
    const recentReminder = await db.reminderLog.findFirst({
      where: { invoiceId: id, level: reminderLevel, sentAt: { gte: new Date(now.getTime() - 3 * 86400000) } },
    })
    if (recentReminder) {
      return NextResponse.json({ error: `Une ${REMINDER_CONFIG[reminderLevel]?.label || 'relance de ce niveau'} a déjà été envoyée récemment`, recentReminder }, { status: 409 })
    }

    const config = REMINDER_CONFIG[reminderLevel]
    if (!config) return NextResponse.json({ error: 'Niveau de relance invalide' }, { status: 400 })

    const data: ReminderData = {
      clientName: invoice.client?.fullName || 'Client',
      clientCompany: invoice.client?.company,
      invoiceNumber: invoice.invoiceNumber || id.slice(0, 8),
      amountFormatted: formatCurrency(invoice.amount, invoice.currencyId),
      remainingFormatted: formatCurrency(remaining, invoice.currencyId),
      dueDateFormatted: dueDate ? formatDateFR(dueDate) : 'N/A',
      daysOverdue,
      tenantName: invoice.tenant?.name || 'Notre cabinet',
      lastReminderFormatted: invoice.lastReminderAt ? formatDateFR(new Date(invoice.lastReminderAt)) : undefined,
    }

    const subject = config.subject.replace('{invoiceNumber}', data.invoiceNumber)
    const content = config.body(data)

    // Create ReminderLog
    const reminder = await db.reminderLog.create({
      data: {
        level: reminderLevel,
        method,
        subject,
        content,
        status: 'sent', // In production, would check email delivery
        daysOverdue,
        amountDue: remaining,
        invoiceId: id,
        tenantId: invoice.tenantId,
        sentById: auth.id || null,
      },
      include: {
        sentBy: { select: { id: true, fullName: true } },
      },
    })

    // Also create a Communication record for unified tracking
    await db.communication.create({
      data: {
        type: method,
        subject,
        content,
        status: 'sent',
        recipientEmail: invoice.client?.email || null,
        recipientPhone: invoice.client?.phone || null,
        sentAt: now,
        tenantId: invoice.tenantId,
        clientId: invoice.clientId,
        caseId: invoice.caseId || null,
        sentById: auth.id || null,
      },
    })

    // Create a notification for the lawyer
    await db.notification.create({
      data: {
        title: `${config.label} envoyée`,
        message: `${config.label} pour la facture ${data.invoiceNumber} (${data.clientName}) — ${formatCurrency(remaining, invoice.currencyId)} — ${daysOverdue}j de retard`,
        category: 'facture',
        resourceType: 'invoice',
        resourceId: id,
        tenantId: invoice.tenantId,
        userId: auth.id || undefined,
      },
    })

    // Update invoice reminder level
    const updated = await db.invoice.update({
      where: { id },
      data: {
        reminderLevel,
        lastReminderAt: now,
      },
    })

    return NextResponse.json({ reminder, invoice: updated })
  } catch (error) {
    console.error('Send reminder error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}

// GET: Reminder history for a specific invoice
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(request, 'invoice', 'view')
  if (auth instanceof NextResponse) return auth

  const db = getDb()
  try {
    const { id } = await params
    const reminders = await db.reminderLog.findMany({
      where: { invoiceId: id },
      orderBy: { sentAt: 'desc' },
      include: {
        sentBy: { select: { id: true, fullName: true } },
      },
    })
    return NextResponse.json(reminders)
  } catch (error) {
    console.error('Get reminders error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  } finally {
    await db.$disconnect().catch(() => {})
  }
}
