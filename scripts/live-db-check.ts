// Script standalone : exécute les requêtes 500 de prod via l'adaptateur db.ts
// Usage : npx jiti scripts/live-db-check.ts
import { config } from 'dotenv'
config({ path: 'C:/Users/patep/Desktop/FETCH/.env' })

// Le host direct db.xxx.supabase.co ne résout plus → utiliser le pooler Supabase
const raw = process.env.DATABASE_URL || ''
const m = raw.match(/postgresql:\/\/([^:]+):([^@]+)@[^/]+\/(.+)/)
if (m) {
  const [, user, pass, dbName] = m
  const base = user.split('.')[0] // postgres
  const ref = user.includes('.') ? user.split('.')[1] : 'zosqktvmihtkqbbgdbgx'
  process.env.DATABASE_URL = `postgresql://${base}.${ref}:${pass}@aws-1-eu-west-3.pooler.supabase.com:5432/${dbName}`
  console.log('DATABASE_URL → pooler aws-1-eu-west-3 (ref ' + ref + ')')
} else {
  console.log('DATABASE_URL introuvable dans FETCH/.env')
}

async function main() {
  const { getDb } = await import('../src/lib/db')
  const db = getDb()

  // 1. Trouver mbeki pour avoir son tenantId
  const mbeki = await db.user.findUnique({
    where: { email: 'mbeki@jurislink.com' },
    select: { id: true, email: true, tenantId: true, role: true },
  })
  console.log('MBEKI:', JSON.stringify(mbeki))
  const tenantId: string | null = mbeki?.tenantId || null

  // ── REQUÊTE 1 : /api/invoices/overdue (500 en prod) ──
  try {
    const now = new Date()
    const invoices = await db.invoice.findMany({
      where: {
        type: 'facture',
        status: { in: ['non_paye', 'partiel'] },
        dueDate: { lte: now },
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        client: { select: { id: true, fullName: true, company: true, email: true, phone: true } },
        case: { select: { id: true, reference: true, title: true } },
        currency: { select: { id: true, code: true, symbol: true } },
        payments: { select: { amount: true } },
        _count: { select: { reminders: true } },
      },
      orderBy: [{ reminderLevel: 'desc' }, { dueDate: 'asc' }],
    })
    console.log('OVERDUE OK —', invoices.length, 'factures')
    if (invoices[0]) {
      const inv: any = invoices[0]
      console.log('  cles premiere facture:', Object.keys(inv).join(','))
      console.log('  client:', inv.client?.fullName, '| case:', inv.case?.reference, '| devise:', inv.currency?.code, '| paiements:', inv.payments?.length, '| rappels:', inv._count?.reminders)
    }
  } catch (e: any) {
    console.log('OVERDUE ERROR:', e.message)
    console.log((e.stack || '').split('\n').slice(0, 5).join('\n'))
  }

  // ── REQUÊTE 2 : /api/currencies (500 en prod) ──
  try {
    const currencies = await db.currency.findMany({
      where: { OR: [{ tenantId: null }, ...(tenantId ? [{ tenantId }] : [])] },
      orderBy: [{ tenantId: 'asc' }, { code: 'asc' }],
    })
    console.log('CURRENCIES OK —', currencies.length, 'devises:', JSON.stringify((currencies as any[]).map(c => c.code)))
  } catch (e: any) {
    console.log('CURRENCIES ERROR:', e.message)
    console.log((e.stack || '').split('\n').slice(0, 5).join('\n'))
  }

  // ── REQUÊTE 3 : /api/users (500 intermittent en prod) ──
  try {
    const where: Record<string, any> = tenantId ? { tenantId } : {}
    where.roleObj = { name: { not: 'root_admin' } }
    where.isActive = true
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true, email: true, fullName: true, role: true, avatarUrl: true, phone: true,
          preferredLanguage: true, isActive: true, lastLoginAt: true, createdAt: true,
          updatedAt: true, tenantId: true,
          tenant: { select: { id: true, name: true, slug: true, plan: true } },
          roleObj: { select: { id: true, name: true, label: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      }),
      db.user.count({ where }),
    ])
    console.log('USERS OK —', (users as any[]).length, 'utilisateurs / total', total)
    console.log('  roles vus:', (users as any[]).map(u => `${u.email}:${u.roleObj?.name ?? u.role}`).join(', '))
  } catch (e: any) {
    console.log('USERS ERROR:', e.message)
    console.log((e.stack || '').split('\n').slice(0, 5).join('\n'))
  }

  // ── TEST 4 : filtre relation roleObj = { name: 'lawyer' } (devrait matcher 2) ──
  try {
    const lawyers = await db.user.findMany({
      where: { tenantId: tenantId!, roleObj: { name: 'lawyer' } },
      select: { email: true },
    })
    console.log('ROLEOBJ FILTER lawyer →', (lawyers as any[]).map(u => u.email).join(', ') || '(vide)')
    const notRoot = await db.user.findMany({
      where: { tenantId: tenantId!, roleObj: { name: { not: 'root_admin' } } },
      select: { email: true },
    })
    console.log('ROLEOBJ FILTER not root_admin →', (notRoot as any[]).length, 'users')
  } catch (e: any) {
    console.log('ROLEOBJ FILTER ERROR:', e.message)
  }

  // ── TEST 5 : /api/messages (menu messages vide en prod) ──
  try {
    const messages = await db.message.findMany({
      where: { tenantId: tenantId! },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
        receiver: { select: { id: true, fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })
    console.log('MESSAGES OK —', messages.length, 'messages')
    if (messages[0]) {
      const m: any = messages[0]
      console.log('  premier:', JSON.stringify({ id: m.id, sender: m.sender, receiver: m.receiver, createdAt: m.createdAt }).slice(0, 250))
    }
  } catch (e: any) {
    console.log('MESSAGES ERROR:', e.message)
  }

  await db.$disconnect()
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
