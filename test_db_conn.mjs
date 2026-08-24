import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';

const url = 'postgresql://postgres.zosqktvmihtkqbbgdbgx:xoTozRtY5jJqu2ma@aws-1-eu-west-3.pooler.supabase.com:5432/postgres';

console.log('=== TEST CONNEXION SUPABASE zosqktvmihtkqbbgdbgx ===');
console.log('URL:', url.replace(/:[^:@]+@/, ':***@'));
console.log('');

const prisma = new PrismaClient({ datasourceUrl: url });
const start = Date.now();

try {
  // 1. Connexion
  const r1 = await prisma.$queryRaw`SELECT current_database(), current_user, inet_server_addr(), inet_server_port(), version()`;
  console.log('✅ CONNEXION RÉUSSIE (' + (Date.now() - start) + 'ms)');
  console.log('   Base:', r1[0].current_database);
  console.log('   User:', r1[0].current_user);
  console.log('   Serveur:', r1[0].inet_server_addr + ':' + r1[0].inet_server_port);
  console.log('   Version PostgreSQL:', r1[0].version.split(',')[0]);
  console.log('');

  // 2. Compteurs
  const counts = await prisma.$queryRaw`
    SELECT table_name,
      (xpath('/row/cnt/text()', query_to_xml(format('select count(*) as cnt from %I', table_name), false, true, '')))[1]::text::int as row_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY row_count DESC
  `;
  console.log('📊 Données par table:');
  let totalRows = 0;
  for (const row of counts) {
    if (row.row_count > 0) {
      console.log('   ' + row.table_name.padEnd(25) + ' ' + String(row.row_count).padStart(3) + ' lignes');
      totalRows += row.row_count;
    }
  }
  console.log('   ' + '—'.repeat(25) + ' ' + '—'.repeat(3));
  console.log('   ' + 'TOTAL'.padEnd(25) + ' ' + String(totalRows).padStart(3) + ' lignes');
  console.log('');

  // 3. Test root_admin via Prisma
  const user = await prisma.user.findFirst({ where: { email: 'pat.epee@gmail.com' }, select: { id: true, email: true, fullName: true, role: true, isActive: true, password: true, tenantId: true } });
  console.log('👤 root_admin:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Nom:', user.fullName);
  console.log('   Rôle:', user.role);
  console.log('   Actif:', user.isActive);
  console.log('   Hash:', user.password.substring(0, 25) + '...');
  console.log('');

  // 4. Test mot de passe
  const t1 = await compare('Admin@123', user.password);
  const t2 = await compare('admin@123', user.password);
  const t3 = await compare('Pass@123', user.password);
  const t4 = await compare('Admin123', user.password);
  console.log('🔑 Tests bcrypt:');
  console.log('   Admin@123  →', t1 ? '✅ VALIDE' : '❌');
  console.log('   admin@123  →', t2 ? '✅ VALIDE' : '❌');
  console.log('   Pass@123  →', t3 ? '✅ VALIDE' : '❌');
  console.log('   Admin123  →', t4 ? '✅ VALIDE' : '❌');
  console.log('');

  // 5. Liste cabinets
  const tenants = await prisma.tenant.findMany({ select: { name: true, slug: true, plan: true, maxUsers: true, isActive: true } });
  console.log('🏢 Cabinets:');
  for (const t of tenants) {
    console.log('   ' + t.name + ' (' + t.plan + ') — max ' + t.maxUsers + ' users — actif: ' + t.isActive);
  }

  console.log('');
  console.log('=== TOUT EST OK ✅ ===');
} catch(e) {
  console.error('❌ ERREUR:', e.message);
} finally {
  await prisma.$disconnect();
}
