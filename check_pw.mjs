import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findFirst({ where: { email: 'pat.epee@gmail.com' }, select: { id: true, email: true, fullName: true, role: true, isActive: true, password: true } });
  console.log('USER FOUND:', user.email, '| role:', user.role, '| active:', user.isActive);
  console.log('PASSWORD HASH:', user.password ? user.password.substring(0, 30) + '...' : 'NULL/EMPTY');
  
  if (user.password) {
    const test1 = await compare('Admin@123', user.password);
    console.log('Compare Admin@123:', test1);
    const test2 = await compare('Pass@123', user.password);
    console.log('Compare Pass@123:', test2);
  }
} catch(e) {
  console.error('ERROR:', e.message);
} finally {
  await prisma.$disconnect();
}
