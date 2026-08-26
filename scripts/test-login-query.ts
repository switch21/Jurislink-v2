import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  // List all users with role and tenant info
  const users = await db.user.findMany({
    select: { id: true, email: true, role: true, isActive: true, tenantId: true, roleId: true, tenant: { select: { name: true, isActive: true } } },
    take: 10,
  })
  console.log(JSON.stringify(users, null, 2))
  await db.$disconnect()
}

main()