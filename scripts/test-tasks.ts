// Standalone : reproduit la requête GET /api/tasks contre la BD live
import { config } from 'dotenv'
config({ path: 'C:/Users/patep/Desktop/FETCH/.env' })

const raw = process.env.DATABASE_URL || ''
const m = raw.match(/postgresql:\/\/([^:]+):([^@]+)@[^/]+\/(.+)/)
if (m) {
  const [, user, pass, dbName] = m
  const base = user.split('.')[0]
  const ref = user.includes('.') ? user.split('.')[1] : 'zosqktvmihtkqbbgdbgx'
  process.env.DATABASE_URL = `postgresql://${base}.${ref}:${pass}@aws-1-eu-west-3.pooler.supabase.com:5432/${dbName}`
  console.log('DATABASE_URL -> pooler (ref ' + ref + ')')
}

async function main() {
  const { getDb } = await import('../src/lib/db')
  const db = getDb()
  const tenantId = 'a1000000-0005-0000-0000-000000000001'

  // 1. Combien de tâches en BD pour ce tenant ?
  try {
    const all = await db.task.findMany({ where: { tenantId } })
    console.log('RAW findMany no include:', all.length)
  } catch (e: any) { console.log('RAW ERROR:', e.message) }

  // 2. La requête exacte de la route
  try {
    const tasks = await db.task.findMany({
      where: { tenantId },
      include: {
        case: { select: { id: true, reference: true, title: true } },
        event: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    console.log('WITH INCLUDE:', tasks.length)
    if (tasks[0]) console.log('  first:', JSON.stringify(tasks[0]).slice(0, 300))
  } catch (e: any) {
    console.log('INCLUDE ERROR:', e.message)
    console.log((e.stack || '').split('\n').slice(0, 8).join('\n'))
  }

  // 3. caseAssignment.findMany include user
  try {
    const a = await db.caseAssignment.findMany({
      where: { caseId: '00000000-0000-0000-0000-000000000000' },
      include: { user: { select: { id: true, fullName: true } } },
    })
    console.log('CASEASSIGNMENT OK:', a.length)
  } catch (e: any) { console.log('CASEASSIGNMENT ERROR:', e.message) }

  // 4. counts
  try {
    const t = await db.task.count({ where: { tenantId } })
    const c = await db.task.count({ where: { tenantId, status: 'terminee' } })
    console.log('COUNTS:', t, c)
  } catch (e: any) { console.log('COUNT ERROR:', e.message) }

  await db.$disconnect()
}
main().catch(e => { console.error('FATAL:', e); process.exit(1) })
