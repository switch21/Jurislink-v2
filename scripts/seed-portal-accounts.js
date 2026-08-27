const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const DATABASE_URL =
  'postgresql://postgres.zosqktvmihtkqbbgdbgx:xoTozRtY5jJqu2ma@aws-1-eu-west-3.pooler.supabase.com:5432/postgres';

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: DATABASE_URL },
    },
  });

  try {
    console.log('=== Seeding ClientPortal accounts ===\n');

    // 1. Find all active clients with an email
    const clients = await prisma.client.findMany({
      where: {
        isActive: true,
      },
      include: {
        tenant: true,
        portalAccounts: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${clients.length} active clients total.\n`);

    // 2. Hash the default password once
    const passwordHash = await bcrypt.hash('JurisLink2025', 10);

    let createdCount = 0;
    let skippedCount = 0;
    const results = [];

    for (const client of clients) {
      // Check if a portal account already exists
      if (client.portalAccounts && client.portalAccounts.length > 0) {
        skippedCount++;
        results.push({
          email: client.portalAccounts[0].email,
          clientName: client.fullName,
          tenantName: client.tenant.name,
          status: 'EXISTS',
        });
        continue;
      }

      // Generate portal email
      let portalEmail;
      if (client.email) {
        const atIdx = client.email.indexOf('@');
        portalEmail =
          client.email.substring(0, atIdx) +
          '.portal' +
          client.email.substring(atIdx);
      } else {
        portalEmail = `client-${client.id.slice(0, 6)}@portal.jurislink.com`;
      }

      // 3. Create the portal account
      const portalAccount = await prisma.clientPortal.create({
        data: {
          email: portalEmail,
          passwordHash: passwordHash,
          isActive: true,
          clientId: client.id,
          tenantId: client.tenantId,
        },
      });

      createdCount++;
      results.push({
        email: portalAccount.email,
        clientName: client.fullName,
        tenantName: client.tenant.name,
        status: 'CREATED',
      });
      console.log(`  + Created: ${portalAccount.email} → ${client.fullName} (${client.tenant.name})`);
    }

    // 4. Print summary
    console.log(`\n=== Summary ===`);
    console.log(`Total active clients : ${clients.length}`);
    console.log(`Portal accounts created: ${createdCount}`);
    console.log(`Already existed       : ${skippedCount}`);
    console.log(`Total portal accounts : ${results.length}\n`);

    // 5. Print summary table
    console.log('=== Portal Accounts Summary Table ===\n');
    console.log(
      padRight('STATUS', 10) +
        ' | ' +
        padRight('PORTAL EMAIL', 45) +
        ' | ' +
        padRight('CLIENT NAME', 30) +
        ' | TENANT NAME'
    );
    console.log('-'.repeat(115));

    for (const r of results) {
      console.log(
        padRight(r.status, 10) +
          ' | ' +
          padRight(r.email, 45) +
          ' | ' +
          padRight(r.clientName, 30) +
          ' | ' + r.tenantName
      );
    }

    console.log('\n=== Done ===');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function padRight(str, len) {
  if (str.length > len) return str.substring(0, len - 3) + '...';
  return str.padEnd(len);
}

main();
