import { PrismaClient } from '@prisma/client'
import { differenceInDays } from 'date-fns'

const db = new PrismaClient()

async function main() {
  const subs = await db.subscription.findMany({
    where: { status: 'active' },
    include: { tenant: true, plan: true },
  })
  console.log(subs.length, 'actifs')
  for (const s of subs) {
    if (!s.currentPeriodEnd) continue
    const d = differenceInDays(new Date(s.currentPeriodEnd), new Date())
    console.log(s.tenant.name || '(vide)', '-', d, 'j')
  }
  await db.$disconnect()
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1) })
