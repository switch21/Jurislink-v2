/**
 * Seed SCP NDOKI & ASSOCIES
 * - 9 utilisateurs avec des profils différents
 * - 20 dossiers avec des informations complètes et des simulations de cas différents
 * - Des clients associés aux dossiers
 */

import { PrismaClient } from '@prisma/client'

const DATABASE_URL = 'postgresql://postgres.zosqktvmihtkqbbgdbgx:xoTozRtY5jJqu2ma@aws-1-eu-west-3.pooler.supabase.com:5432/postgres'
const db = new PrismaClient({ datasourceUrl: DATABASE_URL })

const TENANT_ID = '84d11775-d970-4b55-8052-54499c856c2a' // SCP NDOKI & ASSOCIES

async function main() {
  console.log('🌱 Seeding SCP NDOKI & ASSOCIES...')

  // Verify tenant exists
  const tenant = await db.tenant.findUnique({ where: { id: TENANT_ID } })
  if (!tenant) {
    console.error('❌ Tenant SCP NDOKI & ASSOCIES not found')
    process.exit(1)
  }
  console.log(`✅ Tenant found: ${tenant.name}`)

  // Check existing users
  const existingUsers = await db.user.findMany({ where: { tenantId: TENANT_ID } })
  console.log(`👥 Existing users: ${existingUsers.length}`)

  // ============ 9 USERS WITH DIFFERENT PROFILES ============
  const usersData = [
    { fullName: 'Charlène NDOKI', email: 'cndoki@scp-ndoki.com', role: 'firm_admin', phone: '+237 6 99 88 77 66' }, // Already exists, keep
    { fullName: 'Jean-Paul MBARGA', email: 'jp.mbarga@scp-ndoki.com', role: 'associate', phone: '+237 6 77 66 55 44' },
    { fullName: 'Sylvie ETOA', email: 's.etoa@scp-ndoki.com', role: 'lawyer', phone: '+237 6 66 55 44 33' },
    { fullName: 'Alain NTOUKOU', email: 'a.ntoukou@scp-ndoki.com', role: 'lawyer', phone: '+237 6 55 44 33 22' },
    { fullName: 'Béatrice OWONA', email: 'b.owona@scp-ndoki.com', role: 'lawyer', phone: '+237 6 44 33 22 11' },
    { fullName: 'Patrice KAMGA', email: 'p.kamga@scp-ndoki.com', role: 'jurist', phone: '+237 6 33 22 11 00' },
    { fullName: 'Clémentine EYENGA', email: 'c.eyenga@scp-ndoki.com', role: 'assistant', phone: '+237 6 22 11 00 99' },
    { fullName: 'Aimée FOTSO', email: 'a.fotso@scp-ndoki.com', role: 'accountant', phone: '+237 6 11 00 99 88' },
    { fullName: 'Emmanuel TABI', email: 'e.tabi@scp-ndoki.com', role: 'secretary', phone: '+237 6 00 99 88 77' },
  ]

  const userIds: Record<string, string> = {}
  for (const u of usersData) {
    const existing = existingUsers.find(eu => eu.email === u.email)
    if (existing) {
      userIds[u.fullName] = existing.id
      // Update phone if missing
      if (!existing.phone && u.phone) {
        await db.user.update({ where: { id: existing.id }, data: { phone: u.phone } })
      }
      console.log(`  ⏭️  User exists: ${u.fullName}`)
      continue
    }
    const user = await db.user.create({
      data: {
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        phone: u.phone,
        tenantId: TENANT_ID,
        password: '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu6GK', // default password hash
      },
    })
    userIds[u.fullName] = user.id
    console.log(`  ✅ Created user: ${u.fullName} (${u.role})`)
  }

  // ============ CLIENTS ============
  const clientsData = [
    { fullName: 'SOCIÉTÉ CAMEROUNAISE DE TÉLÉPHONIE (CAMTEL)', company: 'CAMTEL', clientType: 'entreprise', email: 'juridique@camtel.cm', phone: '+237 2 22 23 00 00', city: 'Douala', country: 'Cameroun', niu: 'M201900012345A', riskLevel: 'faible' },
    { fullName: 'Paul NKOU', company: null, clientType: 'particulier', email: 'p.nkou@gmail.com', phone: '+237 6 99 11 22 33', city: 'Yaoundé', country: 'Cameroun', riskLevel: 'moyen' },
    { fullName: 'GROUPEMENT DES EXPORTATEURS DU CAMEROUN (GEC)', company: 'GEC', clientType: 'entreprise', email: 'contact@gec-cm.org', phone: '+237 2 33 44 55 66', city: 'Douala', country: 'Cameroun', niu: 'M201800098765B', riskLevel: 'faible' },
    { fullName: 'Marie NGASSA', company: null, clientType: 'particulier', email: 'm.ngassa@yahoo.fr', phone: '+237 6 88 77 66 55', city: 'Douala', country: 'Cameroun', riskLevel: 'eleve' },
    { fullName: 'BANQUE INTERNATIONALE DU CAMEROUN POUR L\'ÉPARGNE ET LE CRÉDIT (BICEC)', company: 'BICEC', clientType: 'entreprise', email: 'legal@bicec.com', phone: '+237 2 33 22 11 00', city: 'Douala', country: 'Cameroun', niu: 'M201700045678C', riskLevel: 'faible' },
    { fullName: 'Joseph ATANGANA', company: null, clientType: 'particulier', email: 'j.atangana@outlook.com', phone: '+237 6 77 88 99 00', city: 'Yaoundé', country: 'Cameroun', riskLevel: 'moyen' },
    { fullName: 'SOCIÉTÉ NATIONALE DE RAFFINAGE (SONARA)', company: 'SONARA', clientType: 'entreprise', email: 'drh@sonara.cm', phone: '+237 2 33 44 55 00', city: 'Douala', country: 'Cameroun', niu: 'M201600011122D', riskLevel: 'faible' },
    { fullName: 'Chantal MENDO', company: null, clientType: 'particulier', email: 'c.mendo@gmail.com', phone: '+237 6 55 66 77 88', city: 'Yaoundé', country: 'Cameroun', riskLevel: 'faible' },
    { fullName: 'SAFRI CAMEROUN SA', company: 'SAFRI CAMEROUN', clientType: 'entreprise', email: 'juridique@safri-cm.com', phone: '+237 2 33 66 77 88', city: 'Douala', country: 'Cameroun', niu: 'M201500055666E', riskLevel: 'moyen' },
    { fullName: 'Pierre ESSOMBA', company: null, clientType: 'particulier', email: 'p.essomba@yahoo.fr', phone: '+237 6 44 55 66 77', city: 'Édéa', country: 'Cameroun', riskLevel: 'eleve' },
    { fullName: 'COMPAGNIE AÉRIENNE CAMAIR CO', company: 'CAMAIR CO', clientType: 'entreprise', email: 'legal@camair-co.cm', phone: '+237 2 33 88 99 00', city: 'Yaoundé', country: 'Cameroun', niu: 'M201400077888F', riskLevel: 'moyen' },
    { fullName: 'Régine TCHINDA', company: null, clientType: 'particulier', email: 'r.tchinda@gmail.com', phone: '+237 6 33 44 55 66', city: 'Bafoussam', country: 'Cameroun', riskLevel: 'faible' },
    { fullName: 'HORIZON MULTIMÉDIA SA', company: 'HORIZON MULTIMÉDIA', clientType: 'entreprise', email: 'dg@horizon-media.cm', phone: '+237 2 33 11 22 33', city: 'Douala', country: 'Cameroun', niu: 'M201300099000G', riskLevel: 'faible' },
    { fullName: 'André KWEKE', company: null, clientType: 'particulier', email: 'a.kweke@orange.cm', phone: '+237 6 99 00 11 22', city: 'Douala', country: 'Cameroun', riskLevel: 'moyen' },
    { fullName: 'SABC (SOCIÉTÉ AFRICAINE DE BIÈRE)', company: 'SABC', clientType: 'entreprise', email: 'juridique@sabc.cm', phone: '+237 2 33 55 66 77', city: 'Douala', country: 'Cameroun', niu: 'M201200022233H', riskLevel: 'faible' },
  ]

  const clientIds: Record<string, string> = {}
  for (const c of clientsData) {
    const existing = await db.client.findFirst({ where: { tenantId: TENANT_ID, email: c.email } })
    if (existing) {
      clientIds[c.fullName] = existing.id
      console.log(`  ⏭️  Client exists: ${c.fullName}`)
      continue
    }
    const client = await db.client.create({
      data: {
        ...c,
        tenantId: TENANT_ID,
        responsibleLawyerId: userIds['Sylvie ETOA'] || userIds['Charlène NDOKI'],
      },
    })
    clientIds[c.fullName] = client.id
    console.log(`  ✅ Created client: ${c.fullName}`)
  }

  // ============ 20 CASES ============
  const casesData = [
    {
      title: 'Litige contractuel CAMTEL — Résiliation abusive du marché de fibre optique',
      reference: 'NDK-2025-001',
      caseType: 'commercial', status: 'en_cours', priority: 'haute',
      clientId: 'SOCIÉTÉ CAMEROUNAISE DE TÉLÉPHONIE (CAMTEL)',
      description: 'CAMTEL sollicite la représentation pour un litige contractuel suite à la résiliation unilatérale du marché de déploiement de fibre optique par son sous-traitant. Montant en litige: 850 000 000 XAF.',
      adversary: 'Sous-traitant GLOBALE TELECOM', jurisdiction: 'TGI du Wouri — Douala',
      amountInDispute: 850000000, billingType: 'forfait',
      assignees: ['Charlène NDOKI', 'Jean-Paul MBARGA', 'Sylvie ETOA'],
    },
    {
      title: 'Divorce contentieux NKOULOU c/ NKOULOU',
      reference: 'NDK-2025-002',
      caseType: 'civil', status: 'en_cours', priority: 'normale',
      clientId: 'Marie NGASSA',
      description: 'Demande en divorce pour faute. Mme NGASSA invoque des violences conjugales et un abandon de domicile conjugal. Demande de garde exclusive des 3 enfants mineurs et pension alimentaire.',
      adversary: 'M. NGASSA Aimé', jurisdiction: 'TGI du Mfoundi — Yaoundé',
      amountInDispute: 5000000, billingType: 'horaire',
      assignees: ['Béatrice OWONA', 'Clémentine EYENGA'],
    },
    {
      title: 'Contentieux douanier GEC — Saisie conservatoire de marchandises',
      reference: 'NDK-2025-003',
      caseType: 'administratif', status: 'ouvert', priority: 'urgente',
      clientId: 'GROUPEMENT DES EXPORTATEURS DU CAMEROUN (GEC)',
      description: 'Saisie conservatoire de 3 conteneurs de cacao par la Douane camerounaise. Le GEC conteste les motifs de la saisie et demande la mainlevée immédiate.',
      adversary: 'Administration des Douanes camerounaises', jurisdiction: 'Tribunal Administratif du Centre — Yaoundé',
      amountInDispute: 320000000, billingType: 'success_fee',
      assignees: ['Jean-Paul MBARGA', 'Patrice KAMGA'],
    },
    {
      title: 'Droit du travail — Licenciement abusif M. NKOU',
      reference: 'NDK-2025-004',
      caseType: 'social', status: 'en_cours', priority: 'normale',
      clientId: 'Paul NKOU',
      description: 'Licenciement sans préavis ni motif légitime après 12 ans de service chez SOCOPALCAM. Demande de dommages et intérêts, rappel de salaire et certificat de travail.',
      adversary: 'SOCOPALCAM SA', jurisdiction: 'Tribunal du Travail du Wouri — Douala',
      amountInDispute: 45000000, billingType: 'horaire',
      assignees: ['Alain NTOUKOU', 'Emmanuel TABI'],
    },
    {
      title: 'Recouvrement de créances BICEC — Dossier MENDO',
      reference: 'NDK-2025-005',
      caseType: 'commercial', status: 'en_cours', priority: 'haute',
      clientId: 'BANQUE INTERNATIONALE DU CAMEROUN POUR L\'ÉPARGNE ET LE CRÉDIT (BICEC)',
      description: 'Recouvrement forcé d\'une créance de 125 000 000 XAF. Le débiteur M. ESSOMBA a cessé tout paiement depuis 14 mois. Saisie-arrêt en cours.',
      adversary: 'Pierre ESSOMBA', jurisdiction: 'TGI du Wouri — Douala',
      amountInDispute: 125000000, billingType: 'success_fee',
      assignees: ['Charlène NDOKI', 'Aimée FOTSO'],
    },
    {
      title: 'Affaire pénale — Vol aggravé et association de malfaiteurs',
      reference: 'NDK-2025-006',
      caseType: 'penal', status: 'nouveau', priority: 'urgente',
      clientId: 'Joseph ATANGANA',
      description: 'M. ATANGANA est poursuivi pour vol aggravé dans un entrepôt de la SABC et association de malfaiteurs. Détention provisoire depuis 45 jours. Demande de mise en liberté sous caution.',
      adversary: 'Ministère Public', jurisdiction: 'Tribunal Correctionnel de Douala — Bonapriso',
      amountInDispute: 0, billingType: 'forfait',
      assignees: ['Jean-Paul MBARGA', 'Alain NTOUKOU'],
    },
    {
      title: 'Contentieux foncier — Litige de bornage ATANGANA c/ NGANOU',
      reference: 'NDK-2025-007',
      caseType: 'civil', status: 'en_attente', priority: 'normale',
      clientId: 'Joseph ATANGANA',
      description: 'Litige de bornage entre deux parcelles contiguës à Nsimalen. Expertise topographique réalisée. En attente du rapport d\'expertise pour audience de jugement.',
      adversary: 'NGANOU Emmanuel', jurisdiction: 'TGI du Mfoundi — Yaoundé',
      amountInDispute: 15000000, billingType: 'horaire',
      assignees: ['Béatrice OWONA'],
    },
    {
      title: 'Droit des sociétés — Dissolution et liquidation de SOCIÉTÉ KAMGA & FILS',
      reference: 'NDK-2025-008',
      caseType: 'commercial', status: 'en_cours', priority: 'normale',
      clientId: 'Chantal MENDO',
      description: 'Mme MENDO, actionnaire majoritaire, sollicite la dissolution anticipée de la société KAMGA & FILS pour mésentente entre associés et cessation de paiements.',
      adversary: 'KAMGA Frédéric (co-associé)', jurisdiction: 'TGI du Wouri — Douala',
      amountInDispute: 50000000, billingType: 'forfait',
      assignees: ['Sylvie ETOA', 'Patrice KAMGA'],
    },
    {
      title: 'Responsabilité civile médicale — Erreur de diagnostic CHU',
      reference: 'NDK-2025-009',
      caseType: 'civil', status: 'ouvert', priority: 'haute',
      clientId: 'Régine TCHINDA',
      description: 'Mme TCHINDA subit des séquelles permanentes suite à une erreur de diagnostic au CHU de Yaoundé. Demande d\'indemnisation de 200 000 000 XAF pour préjudice corporel et matériel.',
      adversary: 'CHU de Yaoundé / État du Cameroun', jurisdiction: 'TGI du Mfoundi — Yaoundé',
      amountInDispute: 200000000, billingType: 'success_fee',
      assignees: ['Charlène NDOKI', 'Jean-Paul MBARGA', 'Béatrice OWONA'],
    },
    {
      title: 'Marché public contesté — SONARA c/ Société TECHNIP',
      reference: 'NDK-2025-010',
      caseType: 'administratif', status: 'en_cours', priority: 'haute',
      clientId: 'SOCIÉTÉ NATIONALE DE RAFFINAGE (SONARA)',
      description: 'SONARA conteste l\'attribution du marché de modernisation de l\'unité de raffinage à la société TECHNIP. Demande d\'annulation du marché et de dommages et intérêts.',
      adversary: 'Société TECHNIP / ARMP', jurisdiction: 'Tribunal Administratif du Littoral — Douala',
      amountInDispute: 0, billingType: 'forfait',
      assignees: ['Patrice KAMGA', 'Sylvie ETOA'],
    },
    {
      title: 'Exequatur d\'un jugement étranger — Tribunal de Paris',
      reference: 'NDK-2025-011',
      caseType: 'civil', status: 'en_attente', priority: 'normale',
      clientId: 'SOCIÉTÉ CAMEROUNAISE DE TÉLÉPHONIE (CAMTEL)',
      description: 'CAMTEL demande l\'exequatur d\'un jugement du Tribunal de Commerce de Paris condamnant une société française au paiement de 300 000 000 XAF.',
      adversary: 'Société FRANCE TELECOM INTERNATIONAL', jurisdiction: 'TGI du Wouri — Douala',
      amountInDispute: 300000000, billingType: 'forfait',
      assignees: ['Alain NTOUKOU'],
    },
    {
      title: 'Harcèlement moral en milieu de travail — Mme KWEKE',
      reference: 'NDK-2025-012',
      caseType: 'social', status: 'nouveau', priority: 'normale',
      clientId: 'André KWEKE',
      description: 'M. KWEKE dénonce un harcèlement moral de la part de sa hiérarchie chez HORIZON MULTIMÉDIA. Demande de résiliation judiciaire du contrat de travail et dommages et intérêts.',
      adversary: 'HORIZON MULTIMÉDIA SA', jurisdiction: 'Tribunal du Travail du Wouri — Douala',
      amountInDispute: 35000000, billingType: 'horaire',
      assignees: ['Béatrice OWONA', 'Emmanuel TABI'],
    },
    {
      title: 'Droit de la consommation — Produit défectueux SABC',
      reference: 'NDK-2025-013',
      caseType: 'civil', status: 'en_cours', priority: 'normale',
      clientId: 'Chantal MENDO',
      description: 'Mme MENDO a consommé une boisson contaminée produite par la SABC, entraînant une hospitalisation de 15 jours. Demande d\'indemnisation.',
      adversary: 'SABC (Société Africaine de Bière)', jurisdiction: 'TGI du Wouri — Douala',
      amountInDispute: 25000000, billingType: 'success_fee',
      assignees: ['Sylvie ETOA', 'Aimée FOTSO'],
    },
    {
      title: 'Diffamation en ligne — Affaire KAMGA',
      reference: 'NDK-2025-014',
      caseType: 'penal', status: 'ouvert', priority: 'normale',
      clientId: 'Chantal MENDO',
      description: 'Mme MENDO a été victime de publications diffamatoires sur les réseaux sociaux par un ancien employé. Plainte déposée pour diffamation et injures publiques.',
      adversary: 'Ex-employé MBAPPE Jean', jurisdiction: 'Tribunal Correctionnel de Yaoundé',
      amountInDispute: 50000000, billingType: 'forfait',
      assignees: ['Alain NTOUKOU', 'Clémentine EYENGA'],
    },
    {
      title: 'Bail commercial — Litige loyer SAFRI CAMEROUN',
      reference: 'NDK-2025-015',
      caseType: 'commercial', status: 'en_cours', priority: 'normale',
      clientId: 'SAFRI CAMEROUN SA',
      description: 'SAFRI CAMEROUN conteste l\'indexation du loyer de ses bureaux à Akwa. Le bailleur réclame 18 mois d\'arriérés. Procédure de congé initiée.',
      adversary: 'SCI AKWA IMMOBILIER', jurisdiction: 'TGI du Wouri — Douala',
      amountInDispute: 72000000, billingType: 'horaire',
      assignees: ['Patrice KAMGA', 'Emmanuel TABI'],
    },
    {
      title: 'Succession et partage — Famille ATANGANA',
      reference: 'NDK-2025-016',
      caseType: 'civil', status: 'en_attente', priority: 'normale',
      clientId: 'Joseph ATANGANA',
      description: 'Partage d\'une succession comprenant 4 immeubles à Douala et Yaoundé, des comptes bancaires et des participations dans 2 sociétés. 6 héritiers à concilier.',
      adversary: 'Cohéritiers', jurisdiction: 'TGI du Mfoundi — Yaoundé',
      amountInDispute: 350000000, billingType: 'forfait',
      assignees: ['Béatrice OWONA', 'Sylvie ETOA', 'Clémentine EYENGA'],
    },
    {
      title: 'Droit de l\'environnement — Pollution industrielle SONARA',
      reference: 'NDK-2025-017',
      caseType: 'administratif', status: 'nouveau', priority: 'haute',
      clientId: 'Régine TCHINDA',
      description: 'Mme TCHINDA, riveraine de la SONARA, demande réparation des préjudices subis suite à une pollution atmosphérique ayant affecté sa plantation de manioc.',
      adversary: 'SONARA / Ministère de l\'Environnement', jurisdiction: 'Tribunal Administratif du Littoral — Douala',
      amountInDispute: 75000000, billingType: 'success_fee',
      assignees: ['Jean-Paul MBARGA', 'Patrice KAMGA'],
    },
    {
      title: 'Recouvrement CAMAIR CO — Créance transport aérien',
      reference: 'NDK-2025-018',
      caseType: 'commercial', status: 'en_cours', priority: 'haute',
      clientId: 'COMPAGNIE AÉRIENNE CAMAIR CO',
      description: 'CAMAIR CO sollicite le recouvrement de créances impayées totalisant 480 000 000 XAF auprès de plusieurs agences de voyage. Procédure d\'injonction de payer.',
      adversary: 'Agences de voyage (5 sociétés)', jurisdiction: 'TGI du Mfoundi — Yaoundé',
      amountInDispute: 480000000, billingType: 'success_fee',
      assignees: ['Charlène NDOKI', 'Alain NTOUKOU', 'Aimée FOTSO'],
    },
    {
      title: 'Accident de la circulation — Indemnisation M. NKOU',
      reference: 'NDK-2025-019',
      caseType: 'civil', status: 'en_cours', priority: 'normale',
      clientId: 'Paul NKOU',
      description: 'M. NKOU a été victime d\'un accident de la circulation causé par un chauffeur de CAMTEL en service. ITT de 90 jours. Demande d\'indemnisation complète auprès de l\'assureur.',
      adversary: 'AXA Assurances / Chauffeur CAMTEL', jurisdiction: 'TGI du Wouri — Douala',
      amountInDispute: 60000000, billingType: 'success_fee',
      assignees: ['Sylvie ETOA', 'Béatrice OWONA'],
    },
    {
      title: 'Propriété intellectuelle — Contrefaçon de marque HORIZON',
      reference: 'NDK-2025-020',
      caseType: 'commercial', status: 'nouveau', priority: 'haute',
      clientId: 'HORIZON MULTIMÉDIA SA',
      description: 'HORIZON MULTIMÉDIA constate la contrefaçon de sa marque déposée par un concurrent sur le marché camerounais. Demande de cessation et de dommages et intérêts.',
      adversary: 'Société MEDIA PLUS SARL', jurisdiction: 'TGI du Wouri — Douala',
      amountInDispute: 100000000, billingType: 'forfait',
      assignees: ['Jean-Paul MBARGA', 'Patrice KAMGA', 'Alain NTOUKOU'],
    },
  ]

  let createdCases = 0
  for (const c of casesData) {
    const existing = await db.case.findFirst({ where: { tenantId: TENANT_ID, reference: c.reference } })
    if (existing) {
      console.log(`  ⏭️  Case exists: ${c.reference}`)
      continue
    }
    const caseData: Record<string, unknown> = {
      title: c.title,
      reference: c.reference,
      caseType: c.caseType,
      status: c.status,
      priority: c.priority,
      description: c.description,
      adversary: c.adversary,
      jurisdiction: c.jurisdiction,
      amountInDispute: c.amountInDispute,
      billingType: c.billingType,
      tenantId: TENANT_ID,
      clientId: clientIds[c.clientId],
    }
    if (!caseData.clientId) {
      console.log(`  ⚠️  Skipping ${c.reference}: client not found (${c.clientId})`)
      continue
    }
    const caseRecord = await db.case.create({ data: caseData as any })

    // Create case assignments
    for (const assigneeName of c.assignees) {
      const userId = userIds[assigneeName]
      if (userId) {
        await db.caseAssignment.create({
          data: { userId, caseId: caseRecord.id, tenantId: TENANT_ID },
        }).catch(() => {}) // skip duplicates
      }
    }

    // Create initial tasks for each case
    const taskTemplates = [
      { title: 'Rassembler les pièces du dossier', priority: 'haute', daysOffset: 0, status: 'a_faire' },
      { title: 'Analyser la juridiction compétente', priority: 'normal', daysOffset: 2, status: 'a_faire' },
      { title: 'Rédiger les conclusions', priority: 'haute', daysOffset: 7, status: 'todo' },
    ]
    for (const tt of taskTemplates) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + tt.daysOffset + Math.floor(Math.random() * 15))
      await db.task.create({
        data: {
          title: tt.title,
          priority: tt.priority,
          status: tt.status,
          dueDate,
          tenantId: TENANT_ID,
          caseId: caseRecord.id,
        },
      })
    }

    createdCases++
    console.log(`  ✅ Created case: ${c.reference} — ${c.title.slice(0, 60)}...`)
  }

  // ============ EVENTS FOR THE NEXT MONTH ============
  const eventTemplates = [
    { title: 'Audience — NDK-2025-001 (CAMTEL)', eventType: 'audience', criticality: 'urgente', caseRef: 'NDK-2025-001', daysFromNow: 3, hours: 9 },
    { title: 'Audience — NDK-2025-003 (GEC)', eventType: 'audience', criticality: 'importante', caseRef: 'NDK-2025-003', daysFromNow: 5, hours: 10 },
    { title: 'RDV client — M. NKOU', eventType: 'rdv', criticality: 'normale', daysFromNow: 1, hours: 14 },
    { title: 'Audience — NDK-2025-006 (Pénal ATANGANA)', eventType: 'audience', criticality: 'urgente', caseRef: 'NDK-2025-006', daysFromNow: 2, hours: 8 },
    { title: 'Réunion interne — Dossiers urgents', eventType: 'reunion', criticality: 'importante', daysFromNow: 0, hours: 16 },
    { title: 'Échéance — Conclusion NDK-2025-009', eventType: 'echeance', criticality: 'haute', caseRef: 'NDK-2025-009', daysFromNow: 7, hours: 0 },
    { title: 'RDV client — BICEC', eventType: 'rdv', criticality: 'normale', daysFromNow: 4, hours: 11 },
    { title: 'Audience — NDK-2025-018 (CAMAIR CO)', eventType: 'audience', criticality: 'importante', caseRef: 'NDK-2025-018', daysFromNow: 10, hours: 9 },
    { title: 'Dépôt de conclusions — NDK-2025-002', eventType: 'depot', criticality: 'haute', caseRef: 'NDK-2025-002', daysFromNow: 6, hours: 15 },
    { title: 'RDV — Expertise topographique NDK-2025-007', eventType: 'rdv', criticality: 'normale', caseRef: 'NDK-2025-007', daysFromNow: 8, hours: 10 },
  ]

  for (const evt of eventTemplates) {
    const caseRecord = await db.case.findFirst({ where: { tenantId: TENANT_ID, reference: evt.caseRef || '' } })
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + evt.daysFromNow)
    startDate.setHours(evt.hours, 0, 0, 0)
    const endDate = new Date(startDate)
    endDate.setHours(endDate.getHours() + (evt.eventType === 'audience' ? 3 : 1))

    await db.event.create({
      data: {
        title: evt.title,
        eventType: evt.eventType,
        criticality: evt.criticality,
        startTime: startDate,
        endTime: endDate,
        tenantId: TENANT_ID,
        caseId: caseRecord?.id || null,
      },
    }).catch(() => { /* skip duplicates */ })
  }
  console.log(`  ✅ Created events: ${eventTemplates.length}`)

  // Update tenant details
  await db.tenant.update({
    where: { id: TENANT_ID },
    data: {
      email: 'contact@scp-ndoki.com',
      phone: '+237 2 33 44 55 66',
      address: 'Avenue de la Liberté, Immeuble Ndoki',
      city: 'Douala',
      country: 'Cameroun',
      niu: 'M202100012345Z',
      maxUsers: 20,
    },
  })
  console.log('  ✅ Updated tenant details')

  // Summary
  const totalUsers = await db.user.count({ where: { tenantId: TENANT_ID } })
  const totalCases = await db.case.count({ where: { tenantId: TENANT_ID } })
  const totalClients = await db.client.count({ where: { tenantId: TENANT_ID } })
  const totalTasks = await db.task.count({ where: { tenantId: TENANT_ID } })
  const totalEvents = await db.event.count({ where: { tenantId: TENANT_ID } })

  console.log(`\n📊 RÉSUMÉ SCP NDOKI & ASSOCIES:`)
  console.log(`  👥 Utilisateurs: ${totalUsers}`)
  console.log(`  📁 Clients: ${totalClients}`)
  console.log(`  📂 Dossiers: ${totalCases} (dont ${createdCases} nouveaux)`)
  console.log(`  ✅ Tâches: ${totalTasks}`)
  console.log(`  📅 Événements: ${totalEvents}`)
  console.log('\n✅ Seed completed!')
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
