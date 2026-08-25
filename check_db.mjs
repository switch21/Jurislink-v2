import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const users = await prisma.user.findMany({ select: { id: true, email: true, fullName: true, role: true, isActive: true, tenantId: true }, orderBy: [{ role: 'asc' }, { email: 'asc' }] });
  console.log('USERS:', JSON.stringify(users, null, 2));
} catch(e) {
  console.error('ERROR:', e.message);
} finally {
  await prisma.$disconnect();
}
