import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const PW = 'Pass@123'

async function seed() {
  console.log('=== SEED MULTI-TENANT ===')

  // ========== 1. SUBSCRIPTION PLANS ==========
  console.log('\n[1] Subscription Plans...')
  const starterPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: 'starter' },
    update: {},
    create: {
      name: 'Starter', slug: 'starter',
      description: 'Plan de démarrage pour petits cabinets',
      priceAnnual: 200000, priceSemiAnnual: 110000, priceQuarterly: 60000, priceMonthly: 20000,
      currencyCode: 'XAF', maxUsers: 3, maxStorageGb: 5, hasAI: false,
      features: JSON.stringify(['Gestion des dossiers', 'Calendrier basique', '3 utilisateurs', '5 Go stockage']),
      isActive: true, sortOrder: 1,
    },
  })
  console.log('  ✓ Starter plan')

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: 'professionnel' },
    update: {},
    create: {
      name: 'Professionnel', slug: 'professionnel',
      description: 'Plan professionnel pour cabinets de taille moyenne',
      priceAnnual: 300000, priceSemiAnnual: 165000, priceQuarterly: 90000, priceMonthly: 30000,
      currencyCode: 'XAF', maxUsers: 10, maxStorageGb: 20, hasAI: false,
      features: JSON.stringify(['Gestion complète', 'Facturation', 'Calendrier avancé', 'Rapports', '10 utilisateurs', '20 Go stockage', 'Support email']),
      isActive: true, sortOrder: 2,
    },
  })
  console.log('  ✓ Professionnel plan')

  // ========== 2. CURRENCIES ==========
  console.log('\n[2] Currencies...')
  const xaf = await prisma.currency.upsert({
    where: { code: 'XAF' }, update: {}, create: { code: 'XAF', name: 'Franc CFA (BEAC)', symbol: 'FCFA' },
  })
  const eur = await prisma.currency.upsert({
    where: { code: 'EUR' }, update: {}, create: { code: 'EUR', name: 'Euro', symbol: '€' },
  })
  console.log('  ✓ XAF, EUR')

  // ========== 3. TENANT: MENGUE & ASSOCIES ==========
  console.log('\n[3] Tenant: Mengue & Associés...')
  const mengue = await prisma.tenant.upsert({
    where: { slug: 'mengue-associes' }, update: {}, create: {
      name: 'Mengue & Associés', slug: 'mengue-associes',
      language: 'fr', timezone: 'Africa/Douala',
      phone: '+237 2 33 12 34 56', email: 'contact@mengue-associes.com',
      address: '45 Rue Joss, Bonapriso', city: 'Douala', country: 'Cameroun',
      niu: 'M123456789A', currencyCode: 'XAF',
      plan: 'professionnel', maxUsers: 10, maxStorageGb: 20, isActive: true,
    },
  })
  console.log('  ✓ Tenant created:', mengue.id)

  // Subscription for Mengue
  const mengueSub = await prisma.subscription.upsert({
    where: { tenantId: mengue.id }, update: {}, create: {
      tenantId: mengue.id, planId: proPlan.id, status: 'active', billingPeriod: 'annual',
      currentPeriodStart: new Date('2026-01-01'), currentPeriodEnd: new Date('2026-12-31'),
    },
  })
  console.log('  ✓ Subscription (Professionnel)')

  // Users for Mengue
  const mengueUsers: Array<{fullName: string; email: string; role: string; phone: string}> = [
    { fullName: 'Me Alain Mengue', email: 'a.mengue@mengue-associes.com', role: 'associate', phone: '+237 6 99 10 01 01' },
    { fullName: 'Caroline Ebogo', email: 'c.ebogo@mengue-associes.com', role: 'lawyer', phone: '+237 6 77 20 02 02' },
    { fullName: 'Hervé Nkoulou', email: 'h.nkoulou@mengue-associes.com', role: 'lawyer', phone: '+237 6 55 30 03 03' },
    { fullName: 'Brigitte Tabi', email: 'b.tabi@mengue-associes.com', role: 'lawyer', phone: '+237 6 99 40 04 04' },
    { fullName: 'Laurent Owona', email: 'l.owona@mengue-associes.com', role: 'jurist', phone: '+237 6 77 50 05 05' },
    { fullName: 'Nathalie Fotso', email: 'n.fotso@mengue-associes.com', role: 'secretary', phone: '+237 6 55 60 06 06' },
    { fullName: 'Emmanuel Tchinda', email: 'e.tchinda@mengue-associes.com', role: 'accountant', phone: '+237 6 99 70 07 07' },
  ]
  const mengueCreated: string[] = []
  for (const u of mengueUsers) {
    const pw = await hash(PW, 12)
    const user = await prisma.user.upsert({
      where: { email: u.email }, update: {}, create: { ...u, tenantId: mengue.id, password: pw, isActive: true },
    })
    mengueCreated.push(user.id)
    console.log(`  ✓ User: ${u.fullName} (${u.role})`)
  }

  // Clients for Mengue
  const mengueClients = [
    { fullName: 'Paul Kamga', company: 'SARL Kamga Commerce', phone: '+237 6 99 11 11 11', email: 'p.kamga@gmail.com', city: 'Douala', riskLevel: 'moyen' },
    { fullName: 'Jacqueline Ndongo', company: null, phone: '+237 6 77 22 22 22', email: 'j.ndongo@yahoo.fr', city: 'Douala', riskLevel: 'faible' },
    { fullName: 'Société Afriland First Bank', company: 'SAFBCameroun SA', phone: '+237 2 33 40 10 10', email: 'juridique@afrilandfirstbank.com', city: 'Douala', riskLevel: 'eleve' },
    { fullName: 'Ibrahim Haman', company: 'ETS Haman & Fils', phone: '+237 6 55 33 33 33', email: 'i.haman@hotmail.com', city: 'Douala', riskLevel: 'faible' },
    { fullName: 'Marie-Claire Biyong', company: 'Biyong SARL', phone: '+237 6 99 44 44 44', email: 'mc.biyong@biyong.com', city: 'Douala', riskLevel: 'moyen' },
    { fullName: 'Jean-Pierre Eyenga', company: 'Eyenga Group', phone: '+237 6 77 55 55 55', email: 'jp.eyenga@eyengagroup.com', city: 'Douala', riskLevel: 'eleve' },
    { fullName: 'Chantal Ngassa', company: null, phone: '+237 6 55 66 66 66', email: 'c.ngassa@gmail.com', city: 'Douala', riskLevel: 'faible' },
  ]
  const mengueClientIds: string[] = []
  for (const c of mengueClients) {
    const client = await prisma.client.create({ data: { ...c, tenantId: mengue.id } })
    mengueClientIds.push(client.id)
  }
  console.log(`  ✓ ${mengueClients.length} clients created`)

  // Cases for Mengue (~8)
  const mengueCases = [
    { title: 'Litige foncier Bonapriso', description: 'Contentieux entre M. Kamga et la SCI Bonapriso Heights sur une parcelle de 500m²', caseType: 'civil', status: 'en_cours', priority: 'haute', reference: '2026-DL-001', clientId: mengueClientIds[0], adversary: 'SCI Bonapriso Heights', jurisdiction: 'TPI Douala-Bonapriso', amountInDispute: 15000000, billingType: 'forfait' },
    { title: 'Licenciement abusif - Mme Ndongo', description: 'Licenciement sans motif légitime après 8 ans de service chez Orange Cameroun', caseType: 'social', status: 'en_cours', priority: 'urgente', reference: '2026-DL-002', clientId: mengueClientIds[1], adversary: 'Orange Cameroun SA', jurisdiction: 'Tribunal du Travail Douala', amountInDispute: 8000000, billingType: 'horaire' },
    { title: 'Recouvrement créance Afriland', description: 'Impayés de 3 clients majeurs totalisant 45M FCFA', caseType: 'commercial', status: 'nouveau', priority: 'haute', reference: '2026-DL-003', clientId: mengueClientIds[2], adversary: 'Multiple débiteurs', jurisdiction: 'TPI Douala', amountInDispute: 45000000, billingType: 'success_fee' },
    { title: 'Succession Haman', description: 'Partage de succession litigieux entre 4 héritiers', caseType: 'civil', status: 'en_attente', priority: 'normal', reference: '2026-DL-004', clientId: mengueClientIds[3], adversary: 'Héritiers Haman', jurisdiction: 'TPI Douala', amountInDispute: 25000000, billingType: 'forfait' },
    { title: 'Divorce Biyong', description: 'Demande de divorce pour faute avec garde des enfants', caseType: 'civil', status: 'ouvert', priority: 'normal', reference: '2026-DL-005', clientId: mengueClientIds[4], adversary: 'M. Biyong René', jurisdiction: 'TPI Douala', amountInDispute: null, billingType: 'forfait' },
    { title: 'Contrat Eyenga Group', description: 'Rédaction et négociation du contrat de distribution exclusive', caseType: 'commercial', status: 'clos', priority: 'basse', reference: '2026-DL-006', clientId: mengueClientIds[5], adversary: null, jurisdiction: null, amountInDispute: null, billingType: 'forfait' },
    { title: 'Expropriation Ngassa', description: 'Contestation d\'arrêté d\'expropriation rue de la Liberté', caseType: 'administratif', status: 'en_cours', priority: 'haute', reference: '2026-DL-007', clientId: mengueClientIds[6], adversary: 'État du Cameroun / Mairie Douala', jurisdiction: 'Tribunal Administratif Douala', amountInDispute: 30000000, billingType: 'horaire' },
    { title: 'Contentieux bail commercial Kamga', description: 'Résiliation de bail commercial et récupération des locaux', caseType: 'commercial', status: 'en_attente', priority: 'normal', reference: '2026-DL-008', clientId: mengueClientIds[0], adversary: 'SCI Akwa Plaza', jurisdiction: 'TPI Douala', amountInDispute: 5000000, billingType: 'forfait' },
  ]
  const mengueCaseIds: string[] = []
  for (let i = 0; i < mengueCases.length; i++) {
    const c = mengueCases[i]
    const caseData = await prisma.case.create({
      data: {
        ...c, tenantId: mengue.id, clientId: c.clientId,
        assignments: { create: { userId: mengueCreated[1 + (i % 3)], tenantId: mengue.id } },
      },
    })
    mengueCaseIds.push(caseData.id)
  }
  console.log(`  ✓ ${mengueCases.length} cases created`)

  // ========== 4. TENANT: FOTSO LAW FIRM ==========
  console.log('\n[4] Tenant: Fotso Law Firm...')
  const fotso = await prisma.tenant.upsert({
    where: { slug: 'fotso-law-firm' }, update: {}, create: {
      name: 'Fotso Law Firm', slug: 'fotso-law-firm',
      language: 'fr', timezone: 'Africa/Douala',
      phone: '+237 2 22 10 20 30', email: 'contact@fotsolaw.com',
      address: '12 Avenue Charles de Gaulle', city: 'Yaoundé', country: 'Cameroun',
      niu: 'F987654321B', currencyCode: 'XAF',
      plan: 'starter', maxUsers: 3, maxStorageGb: 5, isActive: true,
    },
  })
  console.log('  ✓ Tenant created:', fotso.id)

  const fotsoSub = await prisma.subscription.upsert({
    where: { tenantId: fotso.id }, update: {}, create: {
      tenantId: fotso.id, planId: starterPlan.id, status: 'active', billingPeriod: 'annual',
      currentPeriodStart: new Date('2026-03-01'), currentPeriodEnd: new Date('2027-02-28'),
    },
  })
  console.log('  ✓ Subscription (Starter)')

  const fotsoUsers = [
    { fullName: 'Me Christine Fotso', email: 'c.fotso@fotsolaw.com', role: 'firm_admin', phone: '+237 6 99 80 01 01' },
    { fullName: 'Dimitri Nana', email: 'd.nana@fotsolaw.com', role: 'lawyer', phone: '+237 6 77 90 02 02' },
    { fullName: 'Grâce Mballa', email: 'g.mballa@fotsolaw.com', role: 'secretary', phone: '+237 6 55 00 03 03' },
  ]
  const fotsoCreated: string[] = []
  for (const u of fotsoUsers) {
    const pw = await hash(PW, 12)
    const user = await prisma.user.upsert({
      where: { email: u.email }, update: {}, create: { ...u, tenantId: fotso.id, password: pw, isActive: true },
    })
    fotsoCreated.push(user.id)
    console.log(`  ✓ User: ${u.fullName} (${u.role})`)
  }

  // Clients for Fotso
  const fotsoClients = [
    { fullName: 'Albert Tchouankou', company: 'Tchouankou Import-Export', phone: '+237 6 99 11 22 33', email: 'a.tchouankou@yahoo.fr', city: 'Yaoundé', riskLevel: 'moyen' },
    { fullName: 'Catherine Mbarga', company: null, phone: '+237 6 77 44 55 66', email: 'c.mbarga@gmail.com', city: 'Yaoundé', riskLevel: 'faible' },
    { fullName: 'GIC Espoir Femmes', company: 'GIC Espoir Femmes', phone: '+237 6 55 77 88 99', email: 'espoir.femmes@gmail.com', city: 'Yaoundé', riskLevel: 'faible' },
    { fullName: 'Michel Zoa', company: 'Zoa Technologies', phone: '+237 6 99 33 44 55', email: 'm.zoa@zoatech.com', city: 'Yaoundé', riskLevel: 'eleve' },
    { fullName: 'ESTEL Group', company: 'ESTEL Group SA', phone: '+237 2 22 11 22 33', email: 'juridique@estelgroup.com', city: 'Yaoundé', riskLevel: 'moyen' },
  ]
  const fotsoClientIds: string[] = []
  for (const c of fotsoClients) {
    const client = await prisma.client.create({ data: { ...c, tenantId: fotso.id } })
    fotsoClientIds.push(client.id)
  }
  console.log(`  ✓ ${fotsoClients.length} clients created`)

  // Cases for Fotso (~5)
  const fotsoCases = [
    { title: 'Droit pénal - Affaire Tchouankou', description: 'Défense dans une affaire d\'abus de confiance', caseType: 'penal', status: 'en_cours', priority: 'urgente', reference: '2026-YD-001', clientId: fotsoClientIds[0], adversary: 'Ministère Public', jurisdiction: 'TPI Yaoundé', amountInDispute: null, billingType: 'horaire' },
    { title: 'Succession Mbarga', description: 'Dévolution successorale et partage des biens immobiliers', caseType: 'civil', status: 'en_attente', priority: 'normal', reference: '2026-YD-002', clientId: fotsoClientIds[1], adversary: 'Héritiers Mbarga', jurisdiction: 'TPI Yaoundé', amountInDispute: 10000000, billingType: 'forfait' },
    { title: 'Subvention GIC Espoir', description: 'Accompagnement juridique pour obtention de subvention gouvernementale', caseType: 'administratif', status: 'ouvert', priority: 'normal', reference: '2026-YD-003', clientId: fotsoClientIds[2], adversary: 'Ministère de la Femme', jurisdiction: null, amountInDispute: null, billingType: 'forfait' },
    { title: 'Brevet Zoa Technologies', description: 'Dépôt et protection de brevet d\'invention', caseType: 'commercial', status: 'en_cours', priority: 'haute', reference: '2026-YD-004', clientId: fotsoClientIds[3], adversary: 'OAPI', jurisdiction: null, amountInDispute: null, billingType: 'forfait' },
    { title: 'Audit juridique ESTEL Group', description: 'Audit de conformité réglementaire et gouvernance d\'entreprise', caseType: 'commercial', status: 'nouveau', priority: 'normal', reference: '2026-YD-005', clientId: fotsoClientIds[4], adversary: null, jurisdiction: null, amountInDispute: null, billingType: 'abonnement' },
  ]
  const fotsoCaseIds: string[] = []
  for (let i = 0; i < fotsoCases.length; i++) {
    const c = fotsoCases[i]
    const caseData = await prisma.case.create({
      data: {
        ...c, tenantId: fotso.id, clientId: c.clientId,
        assignments: { create: { userId: fotsoCreated[1], tenantId: fotso.id } },
      },
    })
    fotsoCaseIds.push(caseData.id)
  }
  console.log(`  ✓ ${fotsoCases.length} cases created`)

  // ========== 5. TASKS ==========
  console.log('\n[5] Tasks...')
  const allTasks = [
    // Mengue tasks
    { title: 'Préparer conclusions mémoire', description: 'Rédiger les conclusions pour l\'audience du 15/09', status: 'en_cours', priority: 'urgente', tenantId: mengue.id, caseId: mengueCaseIds[0], userId: mengueCreated[1], dueDate: new Date(Date.now() + 2*86400000) },
    { title: 'Recherche jurisprudence', description: 'Trouver des arrêts similaires pour le litige foncier', status: 'a_faire', priority: 'haute', tenantId: mengue.id, caseId: mengueCaseIds[0], userId: mengueCreated[4], dueDate: new Date(Date.now() + 5*86400000) },
    { title: 'Convoquer témoins', description: 'Envoyer les convocations aux 3 témoins', status: 'terminee', priority: 'normal', tenantId: mengue.id, caseId: mengueCaseIds[1], userId: mengueCreated[5] },
    { title: 'Réviser contrat de distribution', description: 'Vérifier les clauses de non-concurrence', status: 'a_faire', priority: 'normal', tenantId: mengue.id, caseId: mengueCaseIds[5], userId: mengueCreated[2], dueDate: new Date(Date.now() + 7*86400000) },
    { title: 'Calcul des dommages', description: 'Évaluer le préjudice subi par Mme Ngassa', status: 'en_cours', priority: 'haute', tenantId: mengue.id, caseId: mengueCaseIds[6], userId: mengueCreated[1], dueDate: new Date(Date.now() + 3*86400000) },
    // Fotso tasks
    { title: 'Préparer dossier pénal', description: 'Rassembler les pièces du dossier Tchouankou', status: 'en_cours', priority: 'urgente', tenantId: fotso.id, caseId: fotsoCaseIds[0], userId: fotsoCreated[1], dueDate: new Date(Date.now() + 1*86400000) },
    { title: 'Rédiger acte de notoriété', description: 'Pour la succession Mbarga', status: 'a_faire', priority: 'normal', tenantId: fotso.id, caseId: fotsoCaseIds[1], userId: fotsoCreated[1], dueDate: new Date(Date.now() + 10*86400000) },
    { title: 'Vérifier brevet OAPI', description: 'Confirmer l\'état de la demande de brevet', status: 'a_faire', priority: 'haute', tenantId: fotso.id, caseId: fotsoCaseIds[3], userId: fotsoCreated[1], dueDate: new Date(Date.now() + 4*86400000) },
  ]
  for (const t of allTasks) {
    await prisma.task.create({ data: { title: t.title, description: t.description, status: t.status, priority: t.priority, tenantId: t.tenantId, caseId: t.caseId, dueDate: t.dueDate, eventId: null } })
  }
  console.log(`  ✓ ${allTasks.length} tasks created`)

  // ========== 6. EVENTS ==========
  console.log('\n[6] Events...')
  const allEvents = [
    { title: 'Audience - Litige foncier Kamga', description: 'TPI Douala-Bonapriso, Salle A', eventType: 'audience', criticality: 'urgente', tenantId: mengue.id, caseId: mengueCaseIds[0], userIds: [mengueCreated[0], mengueCreated[1]], startTime: new Date(Date.now() + 3*86400000 + 3600000*9), endTime: new Date(Date.now() + 3*86400000 + 3600000*12) },
    { title: 'RDV client - Mme Ndongo', description: 'Bureau Mengue & Associés', eventType: 'rdv', criticality: 'normal', tenantId: mengue.id, caseId: mengueCaseIds[1], userIds: [mengueCreated[2]], startTime: new Date(Date.now() + 1*86400000 + 3600000*14), endTime: new Date(Date.now() + 1*86400000 + 3600000*15) },
    { title: 'Échéance - Dépôt conclusions', description: 'Date limite pour le dépôt des conclusions', eventType: 'echeance', criticality: 'haute', tenantId: mengue.id, caseId: mengueCaseIds[6], userIds: [mengueCreated[1]], startTime: new Date(Date.now() + 4*86400000 + 3600000*17), endTime: null },
    { title: 'Audience pénale - Tchouankou', description: 'TPI Yaoundé, Chambre correctionnelle', eventType: 'audience', criticality: 'urgente', tenantId: fotso.id, caseId: fotsoCaseIds[0], userIds: [fotsoCreated[0], fotsoCreated[1]], startTime: new Date(Date.now() + 2*86400000 + 3600000*8), endTime: new Date(Date.now() + 2*86400000 + 3600000*11) },
    { title: 'RDV - Signature contrat ESTEL', description: 'Siège ESTEL Group', eventType: 'rdv', criticality: 'normal', tenantId: fotso.id, caseId: fotsoCaseIds[4], userIds: [fotsoCreated[0]], startTime: new Date(Date.now() + 5*86400000 + 3600000*10), endTime: new Date(Date.now() + 5*86400000 + 3600000*12) },
    { title: 'Réunion d\'équipe mensuelle', description: 'Bilan des dossiers en cours', eventType: 'rdv', criticality: 'normal', tenantId: mengue.id, caseId: null, userIds: [mengueCreated[0]], startTime: new Date(Date.now() + 7*86400000 + 3600000*9), endTime: new Date(Date.now() + 7*86400000 + 3600000*11) },
  ]
  for (const e of allEvents) {
    const event = await prisma.event.create({
      data: { title: e.title, description: e.description, eventType: e.eventType, criticality: e.criticality, tenantId: e.tenantId, caseId: e.caseId, startTime: e.startTime, endTime: e.endTime },
    })
    for (const uid of e.userIds) {
      await prisma.eventAssignment.create({ data: { userId: uid, eventId: event.id } })
    }
  }
  console.log(`  ✓ ${allEvents.length} events created`)

  // ========== 7. INVOICES ==========
  console.log('\n[7] Invoices...')
  const allInvoices = [
    { invoiceNumber: 'FAC-2026-001', type: 'facture', amount: 500000, paidAmount: 500000, status: 'paye', clientId: mengueClientIds[0], tenantId: mengue.id, caseId: mengueCaseIds[0] },
    { invoiceNumber: 'DEV-2026-001', type: 'devis', amount: 750000, paidAmount: 0, status: 'non_paye', clientId: mengueClientIds[1], tenantId: mengue.id, caseId: mengueCaseIds[1] },
    { invoiceNumber: 'FAC-2026-002', type: 'facture', amount: 1200000, paidAmount: 600000, status: 'partiel', clientId: mengueClientIds[2], tenantId: mengue.id, caseId: mengueCaseIds[2] },
    { invoiceNumber: 'FAC-2026-YD-001', type: 'facture', amount: 350000, paidAmount: 0, status: 'non_paye', clientId: fotsoClientIds[0], tenantId: fotso.id, caseId: fotsoCaseIds[0] },
    { invoiceNumber: 'DEV-2026-YD-001', type: 'devis', amount: 250000, paidAmount: 250000, status: 'paye', clientId: fotsoClientIds[3], tenantId: fotso.id, caseId: fotsoCaseIds[3] },
    { invoiceNumber: 'FAC-2026-YD-002', type: 'facture', amount: 180000, paidAmount: 0, status: 'non_paye', clientId: fotsoClientIds[4], tenantId: fotso.id, caseId: fotsoCaseIds[4] },
  ]
  for (const inv of allInvoices) {
    await prisma.invoice.create({ data: { ...inv, issuedAt: new Date(), dueDate: new Date(Date.now() + 30*86400000), currencyId: xaf.id } })
  }
  console.log(`  ✓ ${allInvoices.length} invoices created`)

  // ========== 8. MESSAGES ==========
  console.log('\n[8] Messages...')
  const allMessages = [
    { senderId: mengueCreated[0], receiverId: mengueCreated[1], tenantId: mengue.id, content: 'As-tu pu vérifier la jurisprudence du TGI sur le litige Kamga ?' },
    { senderId: mengueCreated[1], receiverId: mengueCreated[0], tenantId: mengue.id, content: 'Oui, j\'ai trouvé 3 arrêts pertinents. Je t\'envoie le document ce soir.' },
    { senderId: mengueCreated[5], receiverId: mengueCreated[2], tenantId: mengue.id, content: 'L\'audience de Mme Ndongo est confirmée pour vendredi 10h.' },
    { senderId: fotsoCreated[0], receiverId: fotsoCreated[1], tenantId: fotso.id, content: 'Urgent : le dossier Tchouankou nécessite tes conclusions demain.' },
  { senderId: fotsoCreated[1], receiverId: fotsoCreated[0], tenantId: fotso.id, content: 'Bien reçu, je travaille dessus. On se voit à 9h demain ?' },
  ]
  for (const m of allMessages) {
    await prisma.message.create({ data: m })
  }
  console.log(`  ✓ ${allMessages.length} messages created`)

  // ========== SUMMARY ==========
  console.log('\n=== SEED COMPLETE ===')
  const counts = await Promise.all([
    prisma.tenant.count(), prisma.user.count(), prisma.client.count(),
    prisma.case.count(), prisma.task.count(), prisma.event.count(),
    prisma.invoice.count(), prisma.message.count(), prisma.subscriptionPlan.count(),
    prisma.subscription.count(),
  ])
  console.log(`Tenants: ${counts[0]} | Users: ${counts[1]} | Clients: ${counts[2]}`)
  console.log(`Cases: ${counts[3]} | Tasks: ${counts[4]} | Events: ${counts[5]}`)
  console.log(`Invoices: ${counts[6]} | Messages: ${counts[7]}`)
  console.log(`Plans: ${counts[8]} | Subscriptions: ${counts[9]}`)

  // Verify root_admin
  const rootAdmin = await prisma.user.findFirst({ where: { email: 'pat.epee@gmail.com' } })
  console.log(`\nroot_admin: ${rootAdmin ? rootAdmin.fullName + ' (' + rootAdmin.email + ')' : 'NOT FOUND!'}`)
}

seed()
  .catch(e => { console.error('SEED ERROR:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
