import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const DATABASE_URL = 'postgresql://postgres.zosqktvmihtkqbbgdbgx:xoTozRtY5jJqu2ma@aws-1-eu-west-3.pooler.supabase.com:5432/postgres'
const db = new PrismaClient({ datasourceUrl: DATABASE_URL })

const NOW = new Date()
const DAYS_AGO = (d) => new Date(NOW.getTime() - d * 86400000)
const DAYS_LATER = (d) => new Date(NOW.getTime() + d * 86400000)

const USER_IDS = {}
const CLIENT_IDS = {}
const CASE_IDS = {}

const USERS = [
  { fullName: 'Me Serge Ndoki', email: 's.ndoki@scp-ndoki.com', role: 'associate', phone: '+237 6 99 00 01 01', password: 'Ndoki2024!' },
  { fullName: 'Jean-Paul Mbarga', email: 'jp.mbarga@scp-ndoki.com', role: 'lawyer', phone: '+237 6 99 00 02 02', password: 'Mbarga2024!' },
  { fullName: 'Claire Nkoulou', email: 'c.nkoulou@scp-ndoki.com', role: 'lawyer', phone: '+237 6 99 00 03 03', password: 'Nkoulou2024!' },
  { fullName: 'Patrice Owona', email: 'p.owona@scp-ndoki.com', role: 'collaborator', phone: '+237 6 99 00 04 04', password: 'Owona2024!' },
  { fullName: 'Sophie Essomba', email: 's.essomba@scp-ndoki.com', role: 'secretary', phone: '+237 6 99 00 05 05', password: 'Essomba2024!' },
  { fullName: 'Aimée Fotso', email: 'a.fotso@scp-ndoki.com', role: 'accountant', phone: '+237 6 99 00 06 06', password: 'Fotso2024!' },
  { fullName: 'Marc Tagne', email: 'm.tagne@scp-ndoki.com', role: 'lawyer', phone: '+237 6 99 00 07 07', password: 'Tagne2024!' },
  { fullName: 'Alain Bikay', email: 'a.bikay@scp-ndoki.com', role: 'jurist', phone: '+237 6 99 00 08 08', password: 'Bikay2024!' },
  { fullName: 'Isabelle Nganou', email: 'i.nganou@scp-ndoki.com', role: 'assistant', phone: '+237 6 99 00 09 09', password: 'Nganou2024!' },
]

const CLIENTS = [
  { fullName: 'Société CAMARA SARL', company: 'CAMARA SARL', clientType: 'entreprise', email: 'contact@camara.cm', phone: '+237 6 77 11 22 33', city: 'Douala', country: 'Cameroun', niu: 'M1234567890A', source: 'parrainage', riskLevel: 'faible' },
  { fullName: 'Marie Dupont', company: null, clientType: 'particulier', email: 'marie.dupont@yahoo.fr', phone: '+237 6 55 44 33 22', city: 'Yaoundé', country: 'Cameroun', source: 'internet', riskLevel: 'faible' },
  { fullName: 'Pierre Bikay', company: 'Bikay & Fils', clientType: 'entreprise', email: 'p.bikay@bikay-fils.cm', phone: '+237 6 33 22 11 00', city: 'Douala', country: 'Cameroun', niu: 'M0987654321B', source: 'referral', riskLevel: 'moyen' },
  { fullName: 'Emmanuel Kengne', company: null, clientType: 'particulier', email: 'e.kengne@gmail.com', phone: '+237 6 99 88 77 66', city: 'Douala', country: 'Cameroun', source: 'internet', riskLevel: 'faible' },
  { fullName: 'Groupe MANFOUMBI SA', company: 'Groupe MANFOUMBI', clientType: 'entreprise', email: 'juridique@manfoumbi.cm', phone: '+237 6 22 33 44 55', city: 'Douala', country: 'Cameroun', niu: 'M1122334455C', source: 'parrainage', riskLevel: 'eleve' },
  { fullName: 'Georges Owona', company: null, clientType: 'particulier', email: 'g.owona@orange.cm', phone: '+237 6 44 55 66 77', city: 'Yaoundé', country: 'Cameroun', source: 'ancien_client', riskLevel: 'faible' },
  { fullName: 'Famille Nkoulou Mbarga', company: null, clientType: 'particulier', email: 'famille.nkoulou@gmail.com', phone: '+237 6 11 22 33 44', city: 'Douala', country: 'Cameroun', source: 'parrainage', riskLevel: 'faible' },
  { fullName: 'ABC Corporation Ltd', company: 'ABC Corp', clientType: 'entreprise', email: 'legal@abccorp.com', phone: '+237 6 66 77 88 99', city: 'Douala', country: 'Cameroun', niu: 'M5566778899D', source: 'internet', riskLevel: 'moyen' },
  { fullName: 'Paul Etoundi', company: null, clientType: 'particulier', email: 'p.etoundi@gmail.com', phone: '+237 6 88 99 00 11', city: 'Yaoundé', country: 'Cameroun', source: 'tribunal', riskLevel: 'eleve' },
  { fullName: 'Famille Mbarga Ndong', company: null, clientType: 'particulier', email: 'mbarga.ndong@yahoo.fr', phone: '+237 6 22 11 00 99', city: 'Edéa', country: 'Cameroun', source: 'parrainage', riskLevel: 'faible' },
  { fullName: 'Thérèse Ngassa', company: null, clientType: 'particulier', email: 't.ngassa@gmail.com', phone: '+237 6 33 44 55 66', city: 'Douala', country: 'Cameroun', source: 'internet', riskLevel: 'faible' },
  { fullName: 'Compagnie APA Assurance SA', company: 'APA Assurance', clientType: 'entreprise', email: 'sinistres@apa-assurance.cm', phone: '+237 6 55 66 77 88', city: 'Douala', country: 'Cameroun', niu: 'M9988776655E', source: 'parrainage', riskLevel: 'moyen' },
  { fullName: 'Jean Mandengue', company: null, clientType: 'particulier', email: 'j.mandengue@gmail.com', phone: '+237 6 77 88 99 00', city: 'Douala', country: 'Cameroun', source: 'ancien_client', riskLevel: 'faible' },
  { fullName: 'SARL PALMEX Cameroun', company: 'PALMEX', clientType: 'entreprise', email: 'direction@palmex.cm', phone: '+237 6 44 33 22 11', city: 'Douala', country: 'Cameroun', niu: 'M4433221100F', source: 'referral', riskLevel: 'eleve' },
  { fullName: 'SARL MANGA Frères', company: 'MANGA Frères', clientType: 'entreprise', email: 'liquidation@manga-freres.cm', phone: '+237 6 11 00 99 88', city: 'Yaoundé', country: 'Cameroun', niu: 'M6655443322G', source: 'tribunal', riskLevel: 'eleve' },
  { fullName: 'Roger Tchoumba', company: null, clientType: 'particulier', email: 'r.tchoumba@gmail.com', phone: '+237 6 99 88 77 00', city: 'Bafoussam', country: 'Cameroun', source: 'tribunal', riskLevel: 'eleve' },
  { fullName: 'Société JOKO Industries', company: 'JOKO Industries', clientType: 'entreprise', email: 'pi@joko-industries.cm', phone: '+237 6 22 33 44 00', city: 'Douala', country: 'Cameroun', niu: 'M7788990011H', source: 'internet', riskLevel: 'moyen' },
]

const CASES = [
  { title: 'Litige commercial CAMARA c/ Fournisseur XYZ', description: 'Contestation de livraison non conforme. Le fournisseur XYZ a livré des produits ne respectant pas les spécifications du contrat signé le 15/01/2024.', caseType: 'commercial', status: 'en_cours', priority: 'haute', adversary: 'Fournisseur XYZ SARL', jurisdiction: 'TPI Douala', amountInDispute: 15000000, billingType: 'horaire', clientKey: 'Société CAMARA SARL', assignees: ['Me Serge Ndoki', 'Jean-Paul Mbarga'], ref: 'NDK-2024-001' },
  { title: 'Divorce Dupont c/ Dupont', description: 'Demande de divorce pour faute. Violence conjugale. Demande garde exclusive enfants, pension alimentaire et partition biens.', caseType: 'civil', status: 'en_cours', priority: 'normale', adversary: 'Maître Charles Dupont', jurisdiction: 'TGI Yaoundé', amountInDispute: 5000000, billingType: 'forfait', clientKey: 'Marie Dupont', assignees: ['Claire Nkoulou'], ref: 'NDK-2024-002' },
  { title: 'Contentieux foncier - Terrain Bikay & Fils', description: 'Litige propriété terrain 2000 m² à Bonapriso. Expertise topographique réalisée.', caseType: 'civil', status: 'ouvert', priority: 'haute', adversary: 'Ancien propriétaire Alain Mbarga', jurisdiction: 'TPI Douala', amountInDispute: 45000000, billingType: 'forfait', clientKey: 'Pierre Bikay', assignees: ['Me Serge Ndoki', 'Alain Bikay'], ref: 'NDK-2024-003' },
  { title: 'Licenciement abusif - Kengne c/ Bâtipro SARL', description: 'Licenciement sans motif légitime après 8 ans de service. Demande réintégration et dommages-intérêts.', caseType: 'social', status: 'en_cours', priority: 'urgente', adversary: 'SARL Bâtipro', jurisdiction: 'TGI Douala', amountInDispute: 12000000, billingType: 'horaire', clientKey: 'Emmanuel Kengne', assignees: ['Claire Nkoulou', 'Patrice Owona'], ref: 'NDK-2024-004' },
  { title: 'Recours fiscal - Groupe MANFOUMBI', description: 'Contestation redressement fiscal 85M FCFA pour exercices 2021-2023. Majorations et pénalités contestées.', caseType: 'administratif', status: 'ouvert', priority: 'urgente', adversary: 'Direction Générale des Impôts', jurisdiction: 'Tribunal Administratif du Centre', amountInDispute: 85000000, billingType: 'horaire', clientKey: 'Groupe MANFOUMBI SA', assignees: ['Me Serge Ndoki', 'Jean-Paul Mbarga', 'Alain Bikay'], ref: 'NDK-2024-005' },
  { title: 'Responsabilité civile - Accident Owona', description: 'Accident de la circulation causé par chauffeur transport en commun. Fracture fémur, ITT 45 jours.', caseType: 'civil', status: 'en_cours', priority: 'haute', adversary: 'Société RAPIDO Express', jurisdiction: 'TPI Douala', amountInDispute: 20000000, billingType: 'success_fee', clientKey: 'Georges Owona', assignees: ['Jean-Paul Mbarga', 'Marc Tagne'], ref: 'NDK-2024-006' },
  { title: 'Succession Nkoulou Mbarga', description: 'Réglement succession de feu Joseph Nkoulou Mbarga. 4 héritiers, biens immobiliers à Douala et Yaoundé.', caseType: 'civil', status: 'ouvert', priority: 'normale', adversary: null, jurisdiction: 'Notaire associé', amountInDispute: 120000000, billingType: 'forfait', clientKey: 'Famille Nkoulou Mbarga', assignees: ['Claire Nkoulou', 'Patrice Owona'], ref: 'NDK-2024-007' },
  { title: 'Arbitrage commercial ABC Corp c/ XYZ Ltd', description: 'Arbitrage CCI sur inexécution contrat distribution exclusive Afrique Centrale.', caseType: 'commercial', status: 'en_cours', priority: 'haute', adversary: 'XYZ Ltd (Nigeria)', jurisdiction: 'CCJA', amountInDispute: 200000000, billingType: 'horaire', clientKey: 'ABC Corporation Ltd', assignees: ['Me Serge Ndoki', 'Jean-Paul Mbarga'], ref: 'NDK-2024-008' },
  { title: 'Affaire pénale - Paul Etoundi', description: 'Abus de confiance et détournement 35M FCFA dans gestion coopérative agricole.', caseType: 'penal', status: 'en_cours', priority: 'urgente', adversary: 'Ministère Public', jurisdiction: 'TPI Yaoundé', amountInDispute: 35000000, billingType: 'forfait', clientKey: 'Paul Etoundi', assignees: ['Me Serge Ndoki', 'Marc Tagne'], ref: 'NDK-2024-009' },
  { title: 'Expropriation - Famille Mbarga Ndong', description: 'Contestation expropriation terrain 5000 m² à Edéa. Indemnisation jugée insuffisante.', caseType: 'administratif', status: 'ouvert', priority: 'haute', adversary: 'État du Cameroun / MINPAT', jurisdiction: 'TA du Littoral', amountInDispute: 60000000, billingType: 'horaire', clientKey: 'Famille Mbarga Ndong', assignees: ['Jean-Paul Mbarga', 'Alain Bikay'], ref: 'NDK-2024-010' },
  { title: 'Harcèlement au travail - Ngassa c/ LOGICAM', description: 'Harcèlement moral et sexuel. Demande résolution aux torts employeur et dommages-intérêts.', caseType: 'social', status: 'nouveau', priority: 'haute', adversary: 'Société LOGICAM SA', jurisdiction: 'TGI Douala', amountInDispute: 15000000, billingType: 'horaire', clientKey: 'Thérèse Ngassa', assignees: ['Claire Nkoulou'], ref: 'NDK-2024-011' },
  { title: 'Litige assurance - APA c/ Mandengue', description: 'Refus indemnisation sinistre incendie du 12/02/2024. Contestation clause exclusion.', caseType: 'civil', status: 'en_cours', priority: 'normale', adversary: 'APA Assurance SA', jurisdiction: 'TPI Douala', amountInDispute: 25000000, billingType: 'forfait', clientKey: 'Jean Mandengue', assignees: ['Patrice Owona'], ref: 'NDK-2024-012' },
  { title: 'Contrefaçon marque JOKO Industries', description: 'Contrefaçon et concurrence déloyale par société chinoise commercialisant sous marque « JOKOO ».', caseType: 'commercial', status: 'ouvert', priority: 'haute', adversary: 'Société JOKOO Ltd', jurisdiction: 'TGI Douala / OAPI', amountInDispute: 50000000, billingType: 'horaire', clientKey: 'Société JOKO Industries', assignees: ['Me Serge Ndoki', 'Alain Bikay'], ref: 'NDK-2024-013' },
  { title: 'Garde d\'enfants - Affaire Fotso', description: 'Litige garde deux enfants mineurs après séparation. Demande garde alternée vs exclusive.', caseType: 'civil', status: 'en_cours', priority: 'normale', adversary: 'Monsieur André Fotso', jurisdiction: 'TGI Yaoundé', amountInDispute: 0, billingType: 'forfait', clientKey: 'Aimée Fotso', isSecret: true, assignees: ['Claire Nkoulou'], ref: 'NDK-2024-014' },
  { title: 'Contentieux bancaire - PALMEX c/ BEAC', description: 'Contestation débit non autorisé 120M FCFA. Dysfonctionnement système paiement interbancaire.', caseType: 'commercial', status: 'nouveau', priority: 'urgente', adversary: 'BEAC / Banque commerciale', jurisdiction: 'TPI Douala', amountInDispute: 120000000, billingType: 'success_fee', clientKey: 'SARL PALMEX Cameroun', assignees: ['Me Serge Ndoki', 'Jean-Paul Mbarga'], ref: 'NDK-2024-015' },
  { title: 'Vente immeuble Douala - Contentieux', description: 'Annulation vente pour vice du consentement. Vices cachés majeurs fondations non conformes.', caseType: 'civil', status: 'clos', priority: 'normale', adversary: 'Promoteur HOUSING CAM', jurisdiction: 'TPI Douala', amountInDispute: 35000000, billingType: 'forfait', clientKey: 'Georges Owona', assignees: ['Patrice Owona', 'Marc Tagne'], ref: 'NDK-2023-016' },
  { title: 'Procédure collective - SARL MANGA Frères', description: 'Mandat redressement judiciaire. Dette 500M FCFA. Plan de continuation avec abandon créances.', caseType: 'commercial', status: 'en_cours', priority: 'urgente', adversary: 'Ensemble créanciers', jurisdiction: 'TGI Yaoundé', amountInDispute: 500000000, billingType: 'forfait', clientKey: 'SARL MANGA Frères', assignees: ['Me Serge Ndoki', 'Alain Bikay', 'Patrice Owona'], ref: 'NDK-2024-017' },
  { title: 'Vol aggravé - Affaire Tchoumba', description: 'Vol aggravé avec effraction. Bijoux et espèces d\'une valeur de 10M FCFA.', caseType: 'penal', status: 'en_cours', priority: 'urgente', adversary: 'Ministère Public', jurisdiction: 'TPI Bafoussam', amountInDispute: 10000000, billingType: 'forfait', clientKey: 'Roger Tchoumba', assignees: ['Marc Tagne'], ref: 'NDK-2024-018' },
  { title: 'Permis de construire refusé - SCI Akwa', description: 'Recours contre refus permis R+5 à Akwa Nord. Non-conformité POS invoquée.', caseType: 'administratif', status: 'nouveau', priority: 'normale', adversary: 'Mairie de Douala 5ème', jurisdiction: 'TA du Littoral', amountInDispute: 80000000, billingType: 'horaire', clientKey: 'Société CAMARA SARL', assignees: ['Alain Bikay'], ref: 'NDK-2024-019' },
  { title: 'Fusion SCIE-MAN - Conseil juridique', description: 'Conseil fusion-absorption SCIE par MANFOUMBI SA. Rédaction actes, vérification diligente OHADA.', caseType: 'commercial', status: 'en_cours', priority: 'haute', adversary: null, jurisdiction: 'RCCM Douala', amountInDispute: 0, billingType: 'forfait', clientKey: 'Groupe MANFOUMBI SA', assignees: ['Me Serge Ndoki', 'Jean-Paul Mbarga', 'Alain Bikay'], ref: 'NDK-2024-020' },
]

async function seed() {
  console.log('🌱 Seeding SCP NDOKI & ASSOCIES...')

  // 1. Create Tenant
  const tenant = await db.tenant.upsert({
    where: { slug: 'scp-ndoki-associes' },
    update: {},
    create: {
      name: 'SCP NDOKI & ASSOCIES', slug: 'scp-ndoki-associes',
      email: 'contact@scp-ndoki.com', phone: '+237 6 99 00 00 00',
      address: '45 Rue Joss, Bonanjo', city: 'Douala', country: 'Cameroun',
      niu: 'M0012345678Z', plan: 'premium', maxUsers: 20, maxStorageGb: 50, isActive: true,
    },
  })
  const TENANT_ID = tenant.id
  console.log('   ✅ Tenant:', tenant.name)

  // 2. Currency XAF
  const xaf = await db.currency.upsert({
    where: { code: 'XAF' }, update: {},
    create: { code: 'XAF', name: 'Franc CFA BEAC', symbol: 'FCFA' },
  })

  // 3. Subscription
  let plan = await db.subscriptionPlan.findFirst({ where: { slug: 'premium' } })
  if (!plan) {
    plan = await db.subscriptionPlan.create({
      data: {
        name: 'Premium', slug: 'premium', description: 'Plan premium cabinets',
        priceAnnual: 480000, priceSemiAnnual: 260000, priceQuarterly: 140000, priceMonthly: 50000,
        maxUsers: 20, maxStorageGb: 50, hasAI: true, isActive: true, sortOrder: 3,
        features: JSON.stringify(['Gestion complète', 'Facturation', 'Calendrier', 'Rapports avancés', 'IA intégrée', 'Support prioritaire']),
      },
    })
  }
  await db.subscription.upsert({
    where: { tenantId: TENANT_ID },
    update: { planId: plan.id },
    create: {
      tenantId: TENANT_ID, planId: plan.id, status: 'active', billingPeriod: 'annual',
      currentPeriodStart: new Date('2024-01-01'), currentPeriodEnd: new Date('2024-12-31'),
    },
  })

  // 4. Users
  console.log('   Creating 9 users...')
  for (const u of USERS) {
    const hashedPassword = await hash(u.password, 12)
    const user = await db.user.upsert({
      where: { email: u.email }, update: {},
      create: { fullName: u.fullName, email: u.email, role: u.role, phone: u.phone, password: hashedPassword, tenantId: TENANT_ID, isActive: true },
    })
    USER_IDS[u.fullName] = user.id
    console.log('   ✅', u.fullName, '(' + u.role + ')')
  }

  // 5. Clients
  console.log('   Creating 17 clients...')
  for (const c of CLIENTS) {
    const client = await db.client.create({
      data: { ...c, tenantId: TENANT_ID, responsibleLawyerId: USER_IDS['Me Serge Ndoki'] },
    })
    CLIENT_IDS[c.fullName] = client.id
  }
  console.log('   ✅', CLIENTS.length, 'clients')

  // 6. Cases + Assignments + Notes + Tasks + Events
  console.log('   Creating 20 cases...')
  for (let i = 0; i < CASES.length; i++) {
    const c = CASES[i]
    const caze = await db.case.create({
      data: {
        title: c.title, description: c.description, caseType: c.caseType,
        status: c.status, priority: c.priority, isSecret: c.isSecret || false,
        reference: c.ref, adversary: c.adversary, jurisdiction: c.jurisdiction,
        amountInDispute: c.amountInDispute, billingType: c.billingType,
        tenantId: TENANT_ID, clientId: CLIENT_IDS[c.clientKey],
        createdAt: DAYS_AGO(90 - i * 4),
      },
    })
    CASE_IDS[c.ref] = caze.id

    // Assignments
    for (const name of c.assignees) {
      await db.caseAssignment.create({ data: { userId: USER_IDS[name], caseId: caze.id, tenantId: TENANT_ID } })
    }

    // Notes
    const authorId = USER_IDS[c.assignees[0]]
    await db.caseNote.create({ data: { content: 'Ouverture du dossier. Premier contact client. Renseignements préliminaires collectés.', caseId: caze.id, authorId, tenantId: TENANT_ID, createdAt: DAYS_AGO(85 - i * 4) } })
    await db.caseNote.create({ data: { content: 'Analyse juridique approfondie. Identification des axes de défense et pièces à produire.', caseId: caze.id, authorId, tenantId: TENANT_ID, createdAt: DAYS_AGO(70 - i * 4) } })
    if (c.status !== 'nouveau') {
      await db.caseNote.create({ data: { content: 'Dossier en cours d\'instruction. Prochaines étapes: rassembler les dernières pièces et préparer conclusions.', caseId: caze.id, authorId, tenantId: TENANT_ID, createdAt: DAYS_AGO(40 - i * 3) } })
    }

    // Tasks
    await db.task.create({ data: { title: 'Rassembler les pièces du dossier', description: 'Collecter l\'ensemble des documents et preuves nécessaires', status: 'terminee', priority: 'haute', dueDate: DAYS_AGO(60 - i * 3), tenantId: TENANT_ID, caseId: caze.id, createdAt: DAYS_AGO(85 - i * 4) } })
    await db.task.create({ data: { title: 'Rédiger les conclusions', description: 'Préparer les conclusions écrites pour le tribunal', status: c.status === 'clos' ? 'terminee' : 'en_cours', priority: 'haute', dueDate: DAYS_LATER(7 + i), tenantId: TENANT_ID, caseId: caze.id, createdAt: DAYS_AGO(50 - i * 3) } })
    if (c.status !== 'clos' && c.status !== 'nouveau') {
      await db.task.create({ data: { title: 'Préparer l\'audience', description: 'Préparation arguments et répliques', status: 'a_faire', priority: c.priority, dueDate: DAYS_LATER(15 + i * 2), tenantId: TENANT_ID, caseId: caze.id, createdAt: DAYS_AGO(20 - i * 2) } })
    }

    // Events
    if (c.status !== 'clos' && c.status !== 'nouveau') {
      const ev1 = await db.event.create({ data: { title: 'Audience ' + c.ref, description: 'Audience au ' + (c.jurisdiction || 'Tribunal'), startTime: DAYS_LATER(8 + i), endTime: DAYS_LATER(8 + i), eventType: 'audience', criticality: c.priority === 'urgente' ? 'urgente' : 'normale', tenantId: TENANT_ID, caseId: caze.id } })
      for (const name of c.assignees.slice(0, 2)) {
        await db.eventAssignment.create({ userId: USER_IDS[name], eventId: ev1.id })
      }
      if (c.caseType === 'penal') {
        const ev2 = await db.event.create({ data: { title: 'RDV client prison ' + c.ref, description: 'Visite au client en détention', startTime: DAYS_LATER(2 + i), endTime: DAYS_LATER(2 + i), eventType: 'rdv', criticality: 'importante', tenantId: TENANT_ID, caseId: caze.id } })
        for (const name of c.assignees.slice(0, 2)) {
          await db.eventAssignment.create({ userId: USER_IDS[name], eventId: ev2.id })
        }
      } else {
        const ev2 = await db.event.create({ data: { title: 'Réunion préparation ' + c.ref, description: 'Point d\'avancement', startTime: DAYS_LATER(3 + i), endTime: DAYS_LATER(3 + i), eventType: 'reunion', criticality: 'normale', tenantId: TENANT_ID, caseId: caze.id } })
        for (const name of c.assignees.slice(0, 2)) {
          await db.eventAssignment.create({ userId: USER_IDS[name], eventId: ev2.id })
        }
      }
    }
  }
  console.log('   ✅ 20 cases + related data')

  // 7. Invoices
  console.log('   Creating invoices...')
  let invCount = 0
  for (let i = 0; i < CASES.length; i++) {
    const c = CASES[i]
    if (c.amountInDispute === 0) continue
    const amount = c.billingType === 'forfait' ? 750000 : Math.min(c.amountInDispute * 0.05, 3000000)
    const status = c.status === 'clos' ? 'paye' : i < 5 ? 'paye' : i < 12 ? 'non_paye' : 'partiel'
    const paid = status === 'paye' ? amount : status === 'partiel' ? amount * 0.4 : 0
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: 'FAC-NDK-' + String(i + 1).padStart(4, '0'),
        type: 'facture', amount, paidAmount: paid, status,
        issuedAt: DAYS_AGO(60 - i * 3), dueDate: DAYS_AGO(30 - i * 3),
        billingType: c.billingType, tenantId: TENANT_ID,
        clientId: CLIENT_IDS[c.clientKey], caseId: CASE_IDS[c.ref], currencyId: xaf.id,
      },
    })
    await db.invoiceLineItem.create({ data: { description: 'Honoraires - ' + c.title.substring(0, 50), quantity: 1, unitPrice: amount, total: amount, sortOrder: 1, invoiceId: invoice.id } })
    if (paid > 0) {
      await db.payment.create({ data: { amount: paid, method: status === 'paye' ? 'virement' : 'mobile_money', status: 'complet', paidAt: DAYS_AGO(20 - i * 2), tenantId: TENANT_ID, invoiceId: invoice.id, recordedBy: USER_IDS['Aimée Fotso'] } })
    }
    invCount++
  }
  console.log('   ✅', invCount, 'invoices')

  // 8. Time Entries
  console.log('   Creating time entries...')
  const lawyers = USERS.filter(u => ['associate', 'lawyer', 'collaborator', 'jurist'].includes(u.role))
  let teCount = 0
  for (let ci = 0; ci < CASES.length; ci++) {
    const c = CASES[ci]
    if (c.status === 'clos') continue
    const count = 2 + Math.floor(Math.random() * 4)
    for (let j = 0; j < count; j++) {
      const lawyer = lawyers[Math.floor(Math.random() * lawyers.length)]
      const hours = 1 + Math.random() * 4
      const start = DAYS_AGO(30 - j * 3)
      await db.timeEntry.create({
        data: { description: 'Travail dossier ' + c.ref + ' - ' + c.caseType, startTime: start, endTime: new Date(start.getTime() + hours * 3600000), duration: Math.round(hours * 3600), isBillable: true, hourlyRate: 25000, totalAmount: Math.round(hours * 25000), tenantId: TENANT_ID, userId: USER_IDS[lawyer.fullName], caseId: CASE_IDS[c.ref], createdAt: start },
      })
      teCount++
    }
  }
  console.log('   ✅', teCount, 'time entries')

  // 9. Communications
  console.log('   Creating communications...')
  const comms = [
    { type: 'email', subject: 'Transmission pièces dossier NDK-2024-001', content: 'Veuillez trouver ci-joint l\'ensemble des pièces justificatives.', sentById: 'Sophie Essomba', clientId: 'Société CAMARA SARL', caseRef: 'NDK-2024-001', daysAgo: 2, status: 'sent' },
    { type: 'email', subject: 'Rappel audience TPI Douala 15/09', content: 'Rappel: audience le 15/09/2024 à 9h00, chambre commerciale.', sentById: 'Isabelle Nganou', clientId: 'Emmanuel Kengne', caseRef: 'NDK-2024-004', daysAgo: 1, status: 'sent' },
    { type: 'courrier', subject: 'Mise en demeure SARL Bâtipro', content: 'Mise en demeure de réintégrer M. Kengne.', sentById: 'Claire Nkoulou', clientId: 'Emmanuel Kengne', caseRef: 'NDK-2024-004', daysAgo: 15, status: 'sent' },
    { type: 'email', subject: 'Conclusion réclamation fiscale', content: 'Transmission conclusions récapitulatives recours fiscal 2021-2023.', sentById: 'Me Serge Ndoki', clientId: 'Groupe MANFOUMBI SA', caseRef: 'NDK-2024-005', daysAgo: 5, status: 'sent' },
    { type: 'email', subject: 'Demande devis expert-comptable', content: 'Demande expertise comptable procédure collective MANGA.', sentById: 'Aimée Fotso', clientId: 'SARL MANGA Frères', caseRef: 'NDK-2024-017', daysAgo: 3, status: 'pending' },
    { type: 'tel', subject: 'Appel client Mandengue', content: 'Appel téléphonique concernant avancement dossier assurance.', sentById: 'Isabelle Nganou', clientId: 'Jean Mandengue', caseRef: 'NDK-2024-012', daysAgo: 1, status: 'sent' },
    { type: 'email', subject: 'Convocation assemblée créanciers', content: 'Assemblée créanciers MANGA Frères prévue 25/09/2024.', sentById: 'Sophie Essomba', clientId: 'SARL MANGA Frères', caseRef: 'NDK-2024-017', daysAgo: 0, status: 'pending' },
    { type: 'email', subject: 'Transmission acte fusion SCIE-MAN', content: 'Projet d\'acte de fusion pour revue et validation.', sentById: 'Patrice Owona', clientId: 'Groupe MANFOUMBI SA', caseRef: 'NDK-2024-020', daysAgo: 2, status: 'sent' },
  ]
  for (const cm of comms) {
    await db.communication.create({
      data: { type: cm.type, subject: cm.subject, content: cm.content, status: cm.status, sentAt: cm.status === 'sent' ? DAYS_AGO(cm.daysAgo) : null, tenantId: TENANT_ID, clientId: CLIENT_IDS[cm.clientId], caseId: CASE_IDS[cm.caseRef], sentById: USER_IDS[cm.sentById], createdAt: DAYS_AGO(cm.daysAgo) },
    })
  }
  console.log('   ✅', comms.length, 'communications')

  // 10. Messages
  console.log('   Creating messages...')
  const msgs = [
    { from: 'Jean-Paul Mbarga', to: 'Me Serge Ndoki', content: 'Maître, conclusions CAMARA préparées. Pouvez-vous les relire ?', daysAgo: 2 },
    { from: 'Me Serge Ndoki', to: 'Jean-Paul Mbarga', content: 'Bien, je les relève cet après-midi. Invoquez l\'article 1608 du Code Civil.', daysAgo: 2 },
    { from: 'Claire Nkoulou', to: 'Sophie Essomba', content: 'Sophie, planifie le RDV avec Mme Dupont pour jeudi prochain.', daysAgo: 1 },
    { from: 'Sophie Essomba', to: 'Claire Nkoulou', content: 'Noté. Je propose jeudi 10h ou vendredi 14h.', daysAgo: 1 },
    { from: 'Patrice Owona', to: 'Alain Bikay', content: 'As-tu vérifié la jurisprudence OHADA sur la fusion ?', daysAgo: 3 },
    { from: 'Alain Bikay', to: 'Patrice Owona', content: 'Oui, 3 arrêts CCJA pertinents. Résumé ce soir.', daysAgo: 3 },
    { from: 'Marc Tagne', to: 'Me Serge Ndoki', content: 'Client Tchoumba souhaite vous voir en prison. Demain ?', daysAgo: 0 },
    { from: 'Aimée Fotso', to: 'Me Serge Ndoki', content: 'Facture MANFOUMBI juillet en attente (15M FCFA).', daysAgo: 1 },
  ]
  for (const m of msgs) {
    await db.message.create({ data: { content: m.content, tenantId: TENANT_ID, senderId: USER_IDS[m.from], receiverId: USER_IDS[m.to], createdAt: DAYS_AGO(m.daysAgo) } })
  }
  console.log('   ✅', msgs.length, 'messages')

  // 11. Notifications
  console.log('   Creating notifications...')
  const notifs = [
    { title: 'Audience demain', message: 'Audience NDK-2024-004 au TGI Douala à 9h00', userId: 'Claire Nkoulou', category: 'event', daysAgo: 1 },
    { title: 'Facture en retard', message: 'FAC-NDK-0008 dépasse échéance depuis 5 jours', userId: 'Aimée Fotso', category: 'invoice', daysAgo: 5 },
    { title: 'Nouveau dossier assigné', message: 'Assigné au dossier NDK-2024-019', userId: 'Alain Bikay', category: 'dossier', daysAgo: 2 },
    { title: 'Tâche en retard', message: 'Rédiger conclusions pour NDK-2024-001 est en retard', userId: 'Jean-Paul Mbarga', category: 'task', daysAgo: 3 },
    { title: 'Message reçu', message: 'Nouveau message de Jean-Paul Mbarga', userId: 'Me Serge Ndoki', category: 'message', daysAgo: 2 },
  ]
  for (const n of notifs) {
    await db.notification.create({ data: { title: n.title, message: n.message, category: n.category, read: n.daysAgo > 3, tenantId: TENANT_ID, userId: USER_IDS[n.userId], createdAt: DAYS_AGO(n.daysAgo) } })
  }
  console.log('   ✅', notifs.length, 'notifications')

  console.log('\n✅ Seed SCP NDOKI & ASSOCIES terminé !')
  console.log('\n   Comptes de connexion :')
  for (const u of USERS) {
    console.log('   - ' + u.email + ' / ' + u.password + ' (' + u.role + ')')
  }
}

seed().catch(console.error).finally(() => db.$disconnect())
