import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const SLUG = 'scp-ndoki-associes'
const PASSWORD = 'Ndoki@2025'

// Helper: offset from now in days
function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(9, 0, 0, 0)
  return d
}

function todayAt(h: number, m: number): Date {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

async function seed() {
  console.log('🌱 Starting SCP NDOKI & ASSOCIES seed...')

  // ── Check idempotency ──────────────────────────────────────────────
  const existing = await db.tenant.findUnique({ where: { slug: SLUG } })
  if (existing) {
    console.log(`⚠️  Tenant '${SLUG}' already exists (id: ${existing.id}). Skipping seed.`)
    await db.$disconnect()
    return
  }

  // ── Hash password once ─────────────────────────────────────────────
  const hash = await bcrypt.hash(PASSWORD, 10)
  console.log('🔑 Password hashed')

  // ══════════════════════════════════════════════════════════════════
  // 1. TENANT
  // ══════════════════════════════════════════════════════════════════
  const tenant = await db.tenant.create({
    data: {
      name: 'SCP NDOKI & ASSOCIES',
      slug: SLUG,
      plan: 'enterprise',
      maxUsers: 30,
      maxStorageGb: 100,
      isActive: true,
      address: 'Av. de la Liberté, Immeuble Horizon 5ème étage, Douala, Cameroun',
      phone: '+237 233 42 17 80',
      email: 'contact@scp-ndoki.com',
    },
  })
  console.log(`🏢 Tenant created: ${tenant.name} (${tenant.id})`)

  // ══════════════════════════════════════════════════════════════════
  // 2. USERS (9)
  // ══════════════════════════════════════════════════════════════════
  const usersData = [
    { email: 'me.ndoki@scp-ndoki.com', name: 'Me Ndoki Marie Cécile', role: 'associate', phone: '+237 699 11 22 33' },
    { email: 'fotso.kamga@scp-ndoki.com', name: 'Fotso Kamga Paul', role: 'lawyer', phone: '+237 677 33 44 55' },
    { email: 'nganmeni.hubert@scp-ndoki.com', name: 'Nganmeni Hubert', role: 'lawyer', phone: '+237 699 55 66 77' },
    { email: 'tchinda.armand@scp-ndoki.com', name: 'Tchinda Armand', role: 'jurist', phone: '+237 677 77 88 99' },
    { email: 'mbarga.therese@scp-ndoki.com', name: 'Mbarga Thérèse', role: 'assistant', phone: '+237 699 22 33 44' },
    { email: 'essomba.jeanpierre@scp-ndoki.com', name: 'Essomba Jean Pierre', role: 'accountant', phone: '+237 677 44 55 66' },
    { email: 'ateba.sandrine@scp-ndoki.com', name: 'Ateba Sandrine', role: 'assistant', phone: '+237 699 66 77 88' },
    { email: 'nkoulou.raphael@scp-ndoki.com', name: 'Nkoulou Raphaël', role: 'lawyer', phone: '+237 677 88 99 00' },
    { email: 'kamsu.delphine@scp-ndoki.com', name: 'Kamsu Delphine', role: 'assistant', phone: '+237 699 00 11 22' },
  ]

  const users: Record<string, any> = {}
  for (const u of usersData) {
    const created = await db.user.create({
      data: {
        ...u,
        password: hash,
        tenantId: tenant.id,
        preferredLanguage: 'fr',
        isActive: true,
      },
    })
    users[u.email] = created
    console.log(`👤 User created: ${created.name} (${created.id})`)
  }

  // ══════════════════════════════════════════════════════════════════
  // 3. CLIENTS (15)
  // ══════════════════════════════════════════════════════════════════
  const clientsData = [
    // Individuals (7)
    { key: 'Bailly Alain', firstName: 'Bailly', lastName: 'Alain', clientType: 'particulier', phone: '+237 699 12 34 56', email: 'bailly.alain@yahoo.fr', city: 'Douala', address: 'Quartier Bonapriso, Rue 1.847', niu: 'P001234', source: 'recommandation' },
    { key: 'Fotso Henriette', firstName: 'Fotso', lastName: 'Henriette', clientType: 'particulier', phone: '+237 677 23 45 67', email: 'fotso.henriette@gmail.com', city: 'Yaoundé', address: 'Bastos, Rue 1.763', niu: 'P002345', source: 'internet' },
    { key: 'Ngassa Emmanuel', firstName: 'Ngassa', lastName: 'Emmanuel', clientType: 'particulier', phone: '+237 699 34 56 78', city: 'Douala', address: 'Akwa, Avenue de la Gare', niu: 'P003456', source: 'bouche_a_oreille' },
    { key: 'Tchouankeu Martin', firstName: 'Tchouankeu', lastName: 'Martin', clientType: 'particulier', phone: '+237 677 45 67 89', email: 'tchouankeu.m@orange.cm', city: 'Douala', address: 'Deido, Rue 1.234', niu: 'P004567', source: 'recommandation' },
    { key: 'Mbarga Carine', firstName: 'Mbarga', lastName: 'Carine', clientType: 'particulier', phone: '+237 699 56 78 90', city: 'Douala', address: 'Makepé, Rue des Palmiers', niu: 'P005678', source: 'bouche_a_oreille' },
    { key: 'Ngo Mindjef Samuel', firstName: 'Ngo Mindjef', lastName: 'Samuel', clientType: 'particulier', phone: '+237 677 67 89 01', city: 'Bafoussam', address: 'Quartier Dakar, B.P. 234', niu: 'P006789', source: 'autre' },
    { key: 'Kamga Françoise', firstName: 'Kamga', lastName: 'Françoise', clientType: 'particulier', phone: '+237 699 78 90 12', email: 'kamga.f@gmail.com', city: 'Douala', address: 'Bonanjo, Avenue des Cocotiers', niu: 'P007890', source: 'recommandation' },
    // Companies (8)
    { key: 'SABC', firstName: 'SABC', lastName: '', company: 'Société Africaine de Bois et Cellulose', clientType: 'entreprise', phone: '+237 233 42 30 00', email: 'juridique@sabc.cm', city: 'Douala', address: 'Zone Industrielle de Bassa, B.P. 1351', niu: 'E001234', source: 'recommandation' },
    { key: 'CAMTEL', firstName: 'CAMTEL', lastName: '', company: 'Cameroon Telecommunications', clientType: 'entreprise', phone: '+237 222 22 33 44', email: 'legal@camtel.cm', city: 'Yaoundé', address: 'Avenue de la Libération, B.P. 8038', niu: 'E002345', source: 'recommandation' },
    { key: 'SONARA', firstName: 'SONARA', lastName: '', company: 'Société Nationale de Raffinage', clientType: 'entreprise', phone: '+237 233 43 21 00', email: 'direction.juridique@sonara.cm', city: 'Douala', address: 'Zone Portuaire, B.P. 4066', niu: 'E003456', source: 'recommandation' },
    { key: 'BICEC', firstName: 'BICEC', lastName: '', company: 'Banque Internationale du Cameroun pour l\'Épargne et le Crédit', clientType: 'entreprise', phone: '+237 233 40 19 00', email: 'contentieux@bicec.com', city: 'Douala', address: 'Avenue du Général de Gaulle, B.P. 405', niu: 'E004567', source: 'internet' },
    { key: 'SG Cameroun', firstName: 'SG Cameroun', lastName: '', company: 'Société Générale Cameroun', clientType: 'entreprise', phone: '+237 233 40 35 00', email: 'juridique@sgcameroun.com', city: 'Douala', address: 'Boulevard de la Liberté, Immeuble SG', niu: 'E005678', source: 'recommandation' },
    { key: 'AfriLand Bank', firstName: 'AfriLand Bank', lastName: '', company: 'AfriLand Bank (Caisse Commune d\'Épargne et d\'Investissement)', clientType: 'entreprise', phone: '+237 233 42 37 50', email: 'legal@afrilandbank.com', city: 'Yaoundé', address: 'Avenue du Président Ahidjo', niu: 'E006789', source: 'bouche_a_oreille' },
    { key: 'Douala Port Authority', firstName: 'Douala Port', lastName: 'Authority', company: 'Douala Port Authority (PAD)', clientType: 'entreprise', phone: '+237 233 43 15 70', email: 'legal@douala-port.com', city: 'Douala', address: 'Quai des Exportations, B.P. 4846', niu: 'E007890', source: 'recommandation' },
    { key: 'Brasseries du Cameroun', firstName: 'Brasseries du', lastName: 'Cameroun', company: 'Les Brasseries du Cameroun S.A.', clientType: 'entreprise', phone: '+237 233 43 25 00', email: 'juridique@brasseries-cameroun.com', city: 'Douala', address: 'Boulevard de la République, B.P. 1001', niu: 'E008901', source: 'recommandation' },
  ]

  const clients: Record<string, any> = {}
  for (const c of clientsData) {
    const { key, ...clientData } = c as any
    const created = await db.client.create({
      data: {
        ...clientData,
        country: 'Cameroun',
        tenantId: tenant.id,
        isActive: true,
        riskLevel: clientData.clientType === 'entreprise' ? 'moyen' : 'faible',
      },
    })
    clients[key] = created
    console.log(`📁 Client created: ${key} (${created.id})`)
  }

  // ══════════════════════════════════════════════════════════════════
  // 4. CASES (20)
  // ══════════════════════════════════════════════════════════════════
  const casesData = [
    {
      reference: '2025-DL-001', title: 'Litige foncier — Terrain Bonapriso',
      description: 'Contestation de titre foncier portant sur une parcelle de 1 200 m² située au quartier Bonapriso. Le demandeur soutient que le titre détenu par la partie adverse a été obtenu de manière irrégulière.',
      type: 'civil', status: 'en_cours', priority: 'haute',
      clientKey: 'Bailly Alain', assigneeKeys: ['fotso.kamga@scp-ndoki.com', 'nkoulou.raphael@scp-ndoki.com'],
      nextDueDate: daysFromNow(12), jurisdiction: 'TGI Douala', adversary: 'M. Eyenga Jean René', amountInDispute: 45000000, billingType: 'forfait',
    },
    {
      reference: '2025-DL-002', title: 'Licenciement abusif — Mme Fotso Henriette',
      description: 'Action en justice pour licenciement abusif et non-paiement des congés payés. La cliente a été licenciée sans préavis ni motif légitime après 8 ans de service.',
      type: 'social', status: 'en_cours', priority: 'haute',
      clientKey: 'Fotso Henriette', assigneeKeys: ['fotso.kamga@scp-ndoki.com'],
      nextDueDate: daysFromNow(8), jurisdiction: 'Tribunal du Travail de Douala', adversary: 'Société Cocoa Processing S.A.', amountInDispute: 18000000, billingType: 'horaire',
    },
    {
      reference: '2025-DL-003', title: 'Contentieux commercial — SABC vs Fournisseur',
      description: 'Litige contractuel avec un fournisseur de bois brut pour non-respect des clauses de qualité et de délai de livraison. Demande en dommages et intérêts.',
      type: 'commercial', status: 'en_cours', priority: 'urgente',
      clientKey: 'SABC', assigneeKeys: ['nganmeni.hubert@scp-ndoki.com', 'tchinda.armand@scp-ndoki.com'],
      nextDueDate: daysFromNow(3), jurisdiction: 'TCC Douala', adversary: 'Tropical Wood Export Ltd', amountInDispute: 120000000, billingType: 'forfait',
    },
    {
      reference: '2025-DL-004', title: 'Affaire pénale — Ngassa Emmanuel',
      description: 'Défense dans une affaire de détention illégale de substances classées. Le client conteste la matérialité des faits et invoque un vice de procédure lors de la garde à vue.',
      type: 'penal', status: 'en_cours', priority: 'urgente',
      clientKey: 'Ngassa Emmanuel', assigneeKeys: ['fotso.kamga@scp-ndoki.com', 'me.ndoki@scp-ndoki.com'],
      nextDueDate: daysFromNow(2), jurisdiction: 'TPI Douala', adversary: 'Ministère Public', amountInDispute: 0, billingType: 'forfait',
    },
    {
      reference: '2025-DL-005', title: 'Droit administratif — CAMTEL vs ARCEP',
      description: 'Recours en annulation d\'une décision de l\'ARCEP imposant des obligations de service universel jugées disproportionnées et non conformes au droit OHADA.',
      type: 'administratif', status: 'en_attente', priority: 'haute',
      clientKey: 'CAMTEL', assigneeKeys: ['nganmeni.hubert@scp-ndoki.com', 'me.ndoki@scp-ndoki.com'],
      nextDueDate: daysFromNow(20), jurisdiction: 'Cour Suprême du Cameroun', adversary: 'ARCEP (Agence de Régulation des Télécommunications)', amountInDispute: 350000000, billingType: 'abonnement',
    },
    {
      reference: '2025-DL-006', title: 'Recouvrement de créances — SONARA',
      description: 'Action en recouvrement de créances impayées auprès d\'un distributeur de produits pétroliers. Mise en demeure restée sans suite depuis plus de 90 jours.',
      type: 'commercial', status: 'en_cours', priority: 'haute',
      clientKey: 'SONARA', assigneeKeys: ['nganmeni.hubert@scp-ndoki.com', 'nkoulou.raphael@scp-ndoki.com'],
      nextDueDate: daysFromNow(7), jurisdiction: 'TCC Douala', adversary: 'PetroCam Distribution S.A.', amountInDispute: 285000000, billingType: 'success_fee',
    },
    {
      reference: '2025-DL-007', title: 'Succession — Tchouankeu Martin',
      description: 'Règlement de succession complexe impliquant plusieurs cohéritiers et des biens immobiliers situés à Douala et Yaoundé. Problèmes de partage et de titre foncier.',
      type: 'civil', status: 'en_attente', priority: 'normal',
      clientKey: 'Tchouankeu Martin', assigneeKeys: ['nkoulou.raphael@scp-ndoki.com'],
      nextDueDate: daysFromNow(25), jurisdiction: 'TGI Douala', adversary: 'Cohéritiers Tchouankeu', amountInDispute: 75000000, billingType: 'forfait',
    },
    {
      reference: '2025-DL-008', title: 'Litige hypothécaire — BICEC',
      description: 'Contentieux portant sur l\'exécution d\'une garantie hypothécaire. La banque demande la mise en vente aux enchères d\'un immeuble commercial.',
      type: 'commercial', status: 'en_cours', priority: 'haute',
      clientKey: 'BICEC', assigneeKeys: ['nganmeni.hubert@scp-ndoki.com', 'fotso.kamga@scp-ndoki.com'],
      nextDueDate: daysFromNow(5), jurisdiction: 'TPI Douala', adversary: 'Immobilière du Wouri S.A.', amountInDispute: 200000000, billingType: 'horaire',
    },
    {
      reference: '2025-DL-009', title: 'Divorce contentieux — Mbarga Carine',
      description: 'Procédure de divorce pour faute avec demande de résidence des enfants et prestation compensatoire. La cliente allègue des violences conjugales et un abandon du domicile conjugal.',
      type: 'civil', status: 'ouvert', priority: 'normal',
      clientKey: 'Mbarga Carine', assigneeKeys: ['nkoulou.raphael@scp-ndoki.com'],
      nextDueDate: daysFromNow(30), jurisdiction: 'TGI Douala — Chambre des Affaires Familiales', adversary: 'M. Mbarga André', amountInDispute: 0, billingType: 'forfait',
    },
    {
      reference: '2025-DL-010', title: 'Conseil juridique — SG Cameroun (contrats)',
      description: 'Mission de conseil et de rédaction de contrats commerciaux pour les opérations de crédit documentaire et de garanties bancaires internationales.',
      type: 'commercial', status: 'en_cours', priority: 'normal',
      clientKey: 'SG Cameroun', assigneeKeys: ['nganmeni.hubert@scp-ndoki.com', 'tchinda.armand@scp-ndoki.com'],
      nextDueDate: daysFromNow(15), jurisdiction: null, adversary: null, amountInDispute: 0, billingType: 'abonnement',
    },
    {
      reference: '2025-DL-011', title: 'Accident de la circulation — Ngo Mindjef Samuel',
      description: 'Indemnisation des dommages subis lors d\'un accident de la circulation causé par le chauffeur d\'une société de transport. Blessures physiques et préjudice matériel.',
      type: 'civil', status: 'nouveau', priority: 'normal',
      clientKey: 'Ngo Mindjef Samuel', assigneeKeys: ['nkoulou.raphael@scp-ndoki.com'],
      nextDueDate: daysFromNow(35), jurisdiction: 'TPI Douala', adversary: 'Express Voyage Transport S.A.', amountInDispute: 25000000, billingType: 'success_fee',
    },
    {
      reference: '2025-DL-012', title: 'Rupture abusive de contrat — AfriLand Bank',
      description: 'Litige avec un ancien directeur régional pour rupture abusive de contrat de travail et détournement de clientèle. Contre-demande reconventionnelle.',
      type: 'social', status: 'en_attente', priority: 'normal',
      clientKey: 'AfriLand Bank', assigneeKeys: ['fotso.kamga@scp-ndoki.com'],
      nextDueDate: daysFromNow(18), jurisdiction: 'Tribunal du Travail de Yaoundé', adversary: 'Ex-Directeur Régional Fotué Alain', amountInDispute: 50000000, billingType: 'horaire',
    },
    {
      reference: '2025-DL-013', title: 'Droit de l\'urbanisme — Kamga Françoise',
      description: 'Contestation d\'un arrêté municipal de démolition. La cliente soutient que son permis de construire est régulier et que la mairie a commis une erreur d\'appréciation.',
      type: 'administratif', status: 'nouveau', priority: 'basse',
      clientKey: 'Kamga Françoise', assigneeKeys: ['nganmeni.hubert@scp-ndoki.com'],
      nextDueDate: daysFromNow(40), jurisdiction: 'Tribunal Administratif de Douala', adversary: 'Mairie de Douala 5ème', amountInDispute: 35000000, billingType: 'forfait',
    },
    {
      reference: '2025-DL-014', title: 'Contentieux portuaire — Douala Port Authority',
      description: 'Litige avec un opérateur maritime concernant des frais de stationnement et de manutention contestés. Le dossier implique le droit maritime international.',
      type: 'commercial', status: 'en_cours', priority: 'normal',
      clientKey: 'Douala Port Authority', assigneeKeys: ['nganmeni.hubert@scp-ndoki.com', 'nkoulou.raphael@scp-ndoki.com'],
      nextDueDate: daysFromNow(10), jurisdiction: 'TCC Douala', adversary: 'Maritime Shipping Line Ltd', amountInDispute: 95000000, billingType: 'horaire',
    },
    {
      reference: '2025-DL-015', title: 'Vol et escroquerie — Brasseries du Cameroun',
      description: 'Poursuite pénale contre un ancien employé pour vol de marchandises et falsification de documents comptables sur une période de 3 ans.',
      type: 'penal', status: 'ouvert', priority: 'urgente',
      clientKey: 'Brasseries du Cameroun', assigneeKeys: ['fotso.kamga@scp-ndoki.com', 'me.ndoki@scp-ndoki.com'],
      nextDueDate: daysFromNow(4), jurisdiction: 'TPI Douala', adversary: 'Ex-employé Nkotto Prosper', amountInDispute: 67000000, billingType: 'forfait',
    },
    {
      reference: '2025-DL-016', title: 'Résolution de bail commercial — Bailly Alain',
      description: 'Demande en résolution de bail commercial pour non-paiement de loyers depuis 6 mois. Le locataire invoque des travaux non réalisés par le bailleur.',
      type: 'commercial', status: 'clos', priority: 'normal', outcome: 'favorable',
      clientKey: 'Bailly Alain', assigneeKeys: ['nganmeni.hubert@scp-ndoki.com'],
      nextDueDate: daysFromNow(-30), closingDate: daysFromNow(-5), jurisdiction: 'TCC Douala', adversary: 'Comptoir de Douala S.A.', amountInDispute: 22000000, billingType: 'forfait',
    },
    {
      reference: '2025-DL-017', title: 'Droit des sociétés — SABC (fusion)',
      description: 'Accompagnement juridique dans le cadre d\'une opération de fusion-absorption avec une filiale congolaise. Rédaction des actes et formalités OHADA.',
      type: 'commercial', status: 'clos', priority: 'basse', outcome: 'favorable',
      clientKey: 'SABC', assigneeKeys: ['nganmeni.hubert@scp-ndoki.com', 'tchinda.armand@scp-ndoki.com'],
      nextDueDate: daysFromNow(-60), closingDate: daysFromNow(-20), jurisdiction: null, adversary: null, amountInDispute: 0, billingType: 'forfait',
    },
    {
      reference: '2025-DL-018', title: 'Harcèlement moral au travail — Tchouankeu Martin',
      description: 'Le client, enseignant, dénonce un harcèlement moral de la part de sa hiérarchie et demande la réparation du préjudice subi.',
      type: 'social', status: 'clos', priority: 'basse', outcome: 'en_negociation',
      clientKey: 'Tchouankeu Martin', assigneeKeys: ['fotso.kamga@scp-ndoki.com'],
      nextDueDate: daysFromNow(-45), closingDate: daysFromNow(-10), jurisdiction: 'Tribunal du Travail de Douala', adversary: 'Université de Douala', amountInDispute: 12000000, billingType: 'horaire',
    },
    {
      reference: '2025-DL-019', title: 'Expropriation — CAMTEL',
      description: 'Contentieux portant sur l\'indemnisation d\'expropriation d\'une portion de terrain abritant des câbles de télécommunication.',
      type: 'administratif', status: 'clos', priority: 'normal', outcome: 'favorable',
      clientKey: 'CAMTEL', assigneeKeys: ['nganmeni.hubert@scp-ndoki.com', 'me.ndoki@scp-ndoki.com'],
      nextDueDate: daysFromNow(-90), closingDate: daysFromNow(-40), jurisdiction: 'Tribunal Administratif de Douala', adversary: 'État du Cameroun / Ministère des Travaux Publics', amountInDispute: 150000000, billingType: 'forfait',
    },
    {
      reference: '2025-DL-020', title: 'Archivage — Affaire SONARA 2024',
      description: 'Dossier classé après règlement amiable du litige portant sur la fourniture de matériel de raffinage. Archive pour référence.',
      type: 'commercial', status: 'archive', priority: 'basse', outcome: 'favorable',
      clientKey: 'SONARA', assigneeKeys: ['fotso.kamga@scp-ndoki.com', 'nganmeni.hubert@scp-ndoki.com'],
      nextDueDate: daysFromNow(-120), closingDate: daysFromNow(-90), jurisdiction: 'TCC Douala', adversary: 'EquipRefinery International', amountInDispute: 420000000, billingType: 'success_fee',
    },
  ]

  const cases: Record<string, any> = {}
  for (const c of casesData) {
    const client = clients[c.clientKey]
    if (!client) {
      console.error(`❌ Client not found for key: ${c.clientKey}`)
      continue
    }
    const assignees = c.assigneeKeys.map((k: string) => users[k]).filter(Boolean)

    const created = await db.case.create({
      data: {
        reference: c.reference,
        title: c.title,
        description: c.description,
        type: c.type,
        status: c.status,
        outcome: c.outcome || null,
        priority: c.priority,
        nextDueDate: c.nextDueDate,
        closingDate: c.closingDate || null,
        jurisdiction: c.jurisdiction,
        adversary: c.adversary,
        amountInDispute: c.amountInDispute,
        billingType: c.billingType,
        tenantId: tenant.id,
        clientId: client.id,
        assignments: {
          create: assignees.map((u: any) => ({ userId: u.id })),
        },
      },
    })
    cases[c.reference] = created
    console.log(`📋 Case created: ${c.reference} — ${c.title} (${created.id})`)
  }

  // ══════════════════════════════════════════════════════════════════
  // 5. EVENTS (12)
  // ══════════════════════════════════════════════════════════════════
  const eventsData = [
    {
      title: 'Audience — Litige foncier Bonapriso',
      description: 'Plaidoirie devant le TGI Douala. Présence de Me Ndoki et Me Fotso requise.',
      startTime: daysFromNow(3), endTime: daysFromNow(3),
      eventType: 'audience', criticality: 'haute',
      location: 'TGI Douala, Chambre Civile 3',
      caseRef: '2025-DL-001',
      assigneeKeys: ['me.ndoki@scp-ndoki.com', 'fotso.kamga@scp-ndoki.com'],
    },
    {
      title: 'Audience — Affaire pénale Ngassa',
      description: 'Audience de mise en état. Vérification de la régularité de la procédure de garde à vue.',
      startTime: daysFromNow(2), endTime: daysFromNow(2),
      eventType: 'audience', criticality: 'urgente',
      location: 'TPI Douala, Chambre Correctionnelle 1',
      caseRef: '2025-DL-004',
      assigneeKeys: ['fotso.kamga@scp-ndoki.com', 'me.ndoki@scp-ndoki.com'],
    },
    {
      title: 'Réunion client — SABC',
      description: 'Point d\'avancement sur le litige avec le fournisseur et préparation des pièces pour l\'audience.',
      startTime: daysFromNow(1), endTime: daysFromNow(1),
      eventType: 'rdv', criticality: 'haute',
      location: 'Bureau SCP NDOKI, Salle de réunion A',
      caseRef: '2025-DL-003',
      assigneeKeys: ['nganmeni.hubert@scp-ndoki.com', 'tchinda.armand@scp-ndoki.com'],
    },
    {
      title: 'Échéance — Conclusion SABC vs Fournisseur',
      description: 'Date limite pour le dépôt des conclusions récapitulatives.',
      startTime: daysFromNow(5),
      eventType: 'echeance', criticality: 'urgente',
      location: null,
      caseRef: '2025-DL-003',
      assigneeKeys: ['nganmeni.hubert@scp-ndoki.com', 'tchinda.armand@scp-ndoki.com'],
    },
    {
      title: 'Audience — Recouvrement SONARA',
      description: 'Audience d\'instruction. Déposition du expert-comptable prévue.',
      startTime: daysFromNow(7), endTime: daysFromNow(7),
      eventType: 'audience', criticality: 'haute',
      location: 'TCC Douala, Chambre Commerciale 2',
      caseRef: '2025-DL-006',
      assigneeKeys: ['nganmeni.hubert@scp-ndoki.com'],
    },
    {
      title: 'RDV — Client BICEC (dossier hypothécaire)',
      description: 'Réunion de travail avec le directeur du contentieux BICEC pour finaliser la stratégie.',
      startTime: daysFromNow(4), endTime: daysFromNow(4),
      eventType: 'rdv', criticality: 'normal',
      location: 'BICEC, Siège Social — Salle de conférence',
      caseRef: '2025-DL-008',
      assigneeKeys: ['nganmeni.hubert@scp-ndoki.com', 'fotso.kamga@scp-ndoki.com'],
    },
    {
      title: 'Audience — Vol Brasseries du Cameroun',
      description: 'Première audience au pénal. Interrogatoire du prévenu et audition des témoins.',
      startTime: daysFromNow(4), endTime: daysFromNow(4),
      eventType: 'audience', criticality: 'urgente',
      location: 'TPI Douala, Chambre Correctionnelle 2',
      caseRef: '2025-DL-015',
      assigneeKeys: ['fotso.kamga@scp-ndoki.com', 'me.ndoki@scp-ndoki.com'],
    },
    {
      title: 'Échéance — Dépôt de conclusions CAMTEL vs ARCEP',
      description: 'Date butoir pour le dépôt du mémoire en annulation auprès de la Cour Suprême.',
      startTime: daysFromNow(15),
      eventType: 'echeance', criticality: 'haute',
      location: null,
      caseRef: '2025-DL-005',
      assigneeKeys: ['nganmeni.hubert@scp-ndoki.com', 'me.ndoki@scp-ndoki.com'],
    },
    {
      title: 'RDV — Consultation initiale Kamga Françoise',
      description: 'Première consultation pour l\'étude du dossier d\'urbanisme et détermination de la stratégie.',
      startTime: daysFromNow(2), endTime: daysFromNow(2),
      eventType: 'rdv', criticality: 'normal',
      location: 'Bureau SCP NDOKI, Cabinet de Me Ndoki',
      caseRef: '2025-DL-013',
      assigneeKeys: ['me.ndoki@scp-ndoki.com'],
    },
    {
      title: 'Réunion interne — Revue des dossiers urgents',
      description: 'Point hebdomadaire sur les dossiers prioritaires et les échéances de la semaine à venir.',
      startTime: daysFromNow(1), endTime: daysFromNow(1),
      eventType: 'rdv', criticality: 'normal',
      location: 'Bureau SCP NDOKI, Salle de réunion principale',
      caseRef: null,
      assigneeKeys: ['me.ndoki@scp-ndoki.com', 'fotso.kamga@scp-ndoki.com', 'nganmeni.hubert@scp-ndoki.com'],
    },
    {
      title: 'Dépôt de conclusions — Affaire Foncière',
      description: 'Dépôt au greffe du TGI des conclusions en réplique.',
      startTime: daysFromNow(10),
      eventType: 'depot', criticality: 'haute',
      location: 'Greffe du TGI Douala',
      caseRef: '2025-DL-001',
      assigneeKeys: ['nkoulou.raphael@scp-ndoki.com', 'ateba.sandrine@scp-ndoki.com'],
    },
    {
      title: 'Audience — Licenciement abusif Mme Fotso',
      description: 'Audience de jugement. Témoins présents : Mlle Nkoum et M. Ebongue.',
      startTime: daysFromNow(8), endTime: daysFromNow(8),
      eventType: 'audience', criticality: 'haute',
      location: 'Tribunal du Travail de Douala',
      caseRef: '2025-DL-002',
      assigneeKeys: ['fotso.kamga@scp-ndoki.com', 'ateba.sandrine@scp-ndoki.com'],
    },
  ]

  const events: Record<string, any> = {}
  for (const e of eventsData) {
    const caseObj = e.caseRef ? cases[e.caseRef] : null
    const assignees = e.assigneeKeys.map((k: string) => users[k]).filter(Boolean)
    const endTime = e.endTime ? new Date(new Date(e.startTime).getTime() + 2 * 60 * 60 * 1000) : null

    const created = await db.event.create({
      data: {
        title: e.title,
        description: e.description,
        startTime: e.startTime,
        endTime,
        eventType: e.eventType,
        criticality: e.criticality,
        location: e.location,
        tenantId: tenant.id,
        caseId: caseObj?.id || null,
        assignments: {
          create: assignees.map((u: any) => ({ userId: u.id })),
        },
      },
    })
    events[e.title] = created
    console.log(`📅 Event created: ${e.title} (${created.id})`)
  }

  // ══════════════════════════════════════════════════════════════════
  // 6. TASKS (18)
  // ══════════════════════════════════════════════════════════════════
  const tasksData = [
    {
      title: 'Rédiger conclusions — Litige foncier Bonapriso',
      description: 'Rédiger les conclusions en réplique pour le dossier 2025-DL-001. Basées sur les pièces du bailleur et les témoignages recueillis.',
      status: 'en_cours', priority: 'urgente', dueDate: daysFromNow(2),
      assigneeKey: 'nkoulou.raphael@scp-ndoki.com', creatorKey: 'fotso.kamga@scp-ndoki.com', caseRef: '2025-DL-001',
    },
    {
      title: 'Préparer dossier BICEC — Pièces hypothécaires',
      description: 'Rassembler et classer l\'ensemble des pièces justificatives du titre hypothécaire et des bordereaux de situation.',
      status: 'a_faire', priority: 'haute', dueDate: daysFromNow(3),
      assigneeKey: 'ateba.sandrine@scp-ndoki.com', creatorKey: 'nganmeni.hubert@scp-ndoki.com', caseRef: '2025-DL-008',
    },
    {
      title: 'Rechercher jurisprudence — Licenciement abusif',
      description: 'Effectuer une recherche approfondie de jurisprudence OHADA et camerounaise sur les licenciements abusifs et les indemnités.',
      status: 'terminee', priority: 'haute', dueDate: daysFromNow(-5), completedAt: daysFromNow(-3),
      assigneeKey: 'tchinda.armand@scp-ndoki.com', creatorKey: 'fotso.kamga@scp-ndoki.com', caseRef: '2025-DL-002',
    },
    {
      title: 'Contacter expert-comptable — SONARA',
      description: 'Prendre rendez-vous avec l\'expert-comptable M. Manga pour l\'évaluation des créances dans le dossier de recouvrement.',
      status: 'terminee', priority: 'normal', dueDate: daysFromNow(-2), completedAt: daysFromNow(-1),
      assigneeKey: 'mbarga.therese@scp-ndoki.com', creatorKey: 'nganmeni.hubert@scp-ndoki.com', caseRef: '2025-DL-006',
    },
    {
      title: 'Rédiger assignation — CAMTEL vs ARCEP',
      description: 'Rédiger l\'assignation en référé-suspension et le mémoire introductif pour la Cour Suprême.',
      status: 'en_cours', priority: 'urgente', dueDate: daysFromNow(10),
      assigneeKey: 'nganmeni.hubert@scp-ndoki.com', creatorKey: 'me.ndoki@scp-ndoki.com', caseRef: '2025-DL-005',
    },
    {
      title: 'Classer dossier clôturé — Résolution bail commercial',
      description: 'Procéder à l\'archivage complet du dossier 2025-DL-016 après insertion du jugement et des pièces de procédure.',
      status: 'a_faire', priority: 'basse', dueDate: daysFromNow(14),
      assigneeKey: 'ateba.sandrine@scp-ndoki.com', creatorKey: 'nkoulou.raphael@scp-ndoki.com', caseRef: '2025-DL-016',
    },
    {
      title: 'Préparer convocation — Réunion SABC',
      description: 'Rédiger et envoyer la convocation à la réunion de point d\'avancement avec le client SABC.',
      status: 'terminee', priority: 'normal', dueDate: daysFromNow(-1), completedAt: daysFromNow(-1),
      assigneeKey: 'mbarga.therese@scp-ndoki.com', creatorKey: 'nganmeni.hubert@scp-ndoki.com', caseRef: '2025-DL-003',
    },
    {
      title: 'Analyser contrat fournisseur — SABC',
      description: 'Analyser en détail les clauses du contrat de fourniture de bois brut et identifier les violations.',
      status: 'en_cours', priority: 'haute', dueDate: daysFromNow(4),
      assigneeKey: 'tchinda.armand@scp-ndoki.com', creatorKey: 'nganmeni.hubert@scp-ndoki.com', caseRef: '2025-DL-003',
    },
    {
      title: 'Relancer paiement facture — Bailly Alain',
      description: 'Envoyer une mise en demeure de paiement pour la facture FAC-2025-003 restée impayée depuis 30 jours.',
      status: 'a_faire', priority: 'haute', dueDate: daysFromNow(2),
      assigneeKey: 'essomba.jeanpierre@scp-ndoki.com', creatorKey: 'me.ndoki@scp-ndoki.com', caseRef: null,
    },
    {
      title: 'Mettre à jour base de données clients',
      description: 'Vérifier et mettre à jour les coordonnées de tous les clients actifs du cabinet. Ajouter les nouveaux NIU.',
      status: 'en_cours', priority: 'basse', dueDate: daysFromNow(20),
      assigneeKey: 'kamsu.delphine@scp-ndoki.com', creatorKey: 'mbarga.therese@scp-ndoki.com', caseRef: null,
    },
    {
      title: 'Préparer plaidoirie — Affaire pénale Ngassa',
      description: 'Rédiger les notes de plaidoirie en défense. Préparer les questions à poser aux témoins de l\'accusation.',
      status: 'en_cours', priority: 'urgente', dueDate: daysFromNow(1),
      assigneeKey: 'fotso.kamga@scp-ndoki.com', creatorKey: 'me.ndoki@scp-ndoki.com', caseRef: '2025-DL-004',
    },
    {
      title: 'Vérifier conformité KYC — AfriLand Bank',
      description: 'Effectuer les vérifications KYC (Know Your Customer) pour le nouveau dossier AfriLand Bank.',
      status: 'terminee', priority: 'normal', dueDate: daysFromNow(-3), completedAt: daysFromNow(-2),
      assigneeKey: 'ateba.sandrine@scp-ndoki.com', creatorKey: 'fotso.kamga@scp-ndoki.com', caseRef: '2025-DL-012',
    },
    {
      title: 'Rédiger rapport d\'activité mensuel',
      description: 'Compiler les statistiques du mois : dossiers ouverts, clôturés, audiences, revenus facturés.',
      status: 'a_faire', priority: 'normal', dueDate: daysFromNow(7),
      assigneeKey: 'essomba.jeanpierre@scp-ndoki.com', creatorKey: 'me.ndoki@scp-ndoki.com', caseRef: null,
    },
    {
      title: 'Préparer dossier consultation — Kamga Françoise',
      description: 'Rassembler les documents d\'urbanisme (permis de construire, arrêté municipal, plans) avant la consultation initiale.',
      status: 'a_faire', priority: 'normal', dueDate: daysFromNow(1),
      assigneeKey: 'ateba.sandrine@scp-ndoki.com', creatorKey: 'me.ndoki@scp-ndoki.com', caseRef: '2025-DL-013',
    },
    {
      title: 'Rechercher droit maritime — Douala Port Authority',
      description: 'Recherche sur la Convention de Hambourg et la législation camerounaise applicable aux frais portuaires.',
      status: 'en_cours', priority: 'haute', dueDate: daysFromNow(8),
      assigneeKey: 'tchinda.armand@scp-ndoki.com', creatorKey: 'nganmeni.hubert@scp-ndoki.com', caseRef: '2025-DL-014',
    },
    {
      title: 'Organiser classeur — Succession Tchouankeu',
      description: 'Créer le classeur physique et numérique du dossier de succession avec les actes de naissance et titres fonciers.',
      status: 'terminee', priority: 'normal', dueDate: daysFromNow(-7), completedAt: daysFromNow(-5),
      assigneeKey: 'kamsu.delphine@scp-ndoki.com', creatorKey: 'nkoulou.raphael@scp-ndoki.com', caseRef: '2025-DL-007',
    },
    {
      title: 'Envoyer facturation mensuelle — Abonnement SG Cameroun',
      description: 'Éditer et envoyer la facture mensuelle de l\'abonnement conseil pour SG Cameroun.',
      status: 'a_faire', priority: 'normal', dueDate: daysFromNow(5),
      assigneeKey: 'essomba.jeanpierre@scp-ndoki.com', creatorKey: 'nganmeni.hubert@scp-ndoki.com', caseRef: '2025-DL-010',
    },
    {
      title: 'Préparer témoins — Vol Brasseries',
      description: 'Contacter et préparer les témoins (3 employés du service logistique) pour l\'audience du dossier 2025-DL-015.',
      status: 'en_cours', priority: 'haute', dueDate: daysFromNow(3),
      assigneeKey: 'ateba.sandrine@scp-ndoki.com', creatorKey: 'fotso.kamga@scp-ndoki.com', caseRef: '2025-DL-015',
    },
  ]

  for (const t of tasksData) {
    const caseObj = t.caseRef ? cases[t.caseRef] : null
    const created = await db.task.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        completedAt: t.completedAt || null,
        tenantId: tenant.id,
        caseId: caseObj?.id || null,
        userId: users[t.assigneeKey]?.id || null,
        creatorId: users[t.creatorKey]?.id || null,
      },
    })
    console.log(`✅ Task created: ${t.title} (${created.id})`)
  }

  // ══════════════════════════════════════════════════════════════════
  // 7. INVOICES (10)
  // ══════════════════════════════════════════════════════════════════
  const invoicesData = [
    {
      reference: 'FAC-2025-001', amount: 2500000, status: 'paye', type: 'facture',
      dueDate: daysFromNow(-30), paidDate: daysFromNow(-15), paidAmount: 2500000,
      paymentMethod: 'virement', billingType: 'forfait',
      clientKey: 'Bailly Alain', caseRef: '2025-DL-001',
      notes: 'Provision initielle pour le litige foncier Bonapriso.',
    },
    {
      reference: 'FAC-2025-002', amount: 1500000, status: 'paye', type: 'facture',
      dueDate: daysFromNow(-20), paidDate: daysFromNow(-10), paidAmount: 1500000,
      paymentMethod: 'mobile_money', billingType: 'horaire',
      clientKey: 'Fotso Henriette', caseRef: '2025-DL-002',
      notes: 'Honoraires pour 10 heures de consultation et rédaction d\'assignation.',
    },
    {
      reference: 'FAC-2025-003', amount: 750000, status: 'non_paye', type: 'facture',
      dueDate: daysFromNow(-10), paidDate: null, paidAmount: null,
      paymentMethod: null, billingType: 'forfait',
      clientKey: 'Bailly Alain', caseRef: '2025-DL-016',
      notes: 'Facture complémentaire pour frais de procédure — Résolution bail commercial.',
    },
    {
      reference: 'FAC-2025-004', amount: 15000000, status: 'paye', type: 'facture',
      dueDate: daysFromNow(-60), paidDate: daysFromNow(-45), paidAmount: 15000000,
      paymentMethod: 'virement', billingType: 'forfait',
      clientKey: 'SABC', caseRef: '2025-DL-017',
      notes: 'Honoraires forfaitaires pour l\'opération de fusion-absorption.',
    },
    {
      reference: 'FAC-2025-005', amount: 8000000, status: 'partiel', type: 'facture',
      dueDate: daysFromNow(15), paidDate: null, paidAmount: 3000000,
      paymentMethod: null, billingType: 'horaire',
      clientKey: 'SABC', caseRef: '2025-DL-003',
      notes: 'Facture intermédiaire — 40 heures de travail effectuées. Acompte de 3 000 000 FCFA reçu.',
    },
    {
      reference: 'FAC-2025-006', amount: 500000, status: 'non_paye', type: 'devis',
      dueDate: daysFromNow(10), paidDate: null, paidAmount: null,
      paymentMethod: null, billingType: 'forfait',
      clientKey: 'Kamga Françoise', caseRef: '2025-DL-013',
      notes: 'Devis pour le dossier contentieux urbanisme — Estimation forfaitaire.',
    },
    {
      reference: 'FAC-2025-007', amount: 12000000, status: 'partiel', type: 'facture',
      dueDate: daysFromNow(-5), paidDate: null, paidAmount: 5000000,
      paymentMethod: null, billingType: 'success_fee',
      clientKey: 'SONARA', caseRef: '2025-DL-006',
      notes: 'Provision sur success fee (20%). Acompte de 5 000 000 FCFA versé.',
    },
    {
      reference: 'FAC-2025-008', amount: 2000000, status: 'paye', type: 'facture',
      dueDate: daysFromNow(-45), paidDate: daysFromNow(-30), paidAmount: 2000000,
      paymentMethod: 'virement', billingType: 'abonnement',
      clientKey: 'SG Cameroun', caseRef: '2025-DL-010',
      notes: 'Abonnement mensuel de conseil juridique — Février 2025.',
    },
    {
      reference: 'FAC-2025-009', amount: 3500000, status: 'non_paye', type: 'facture',
      dueDate: daysFromNow(20), paidDate: null, paidAmount: null,
      paymentMethod: null, billingType: 'horaire',
      clientKey: 'BICEC', caseRef: '2025-DL-008',
      notes: 'Facture mensuelle — 20 heures d\'étude du dossier hypothécaire et rédaction.',
    },
    {
      reference: 'FAC-2025-010', amount: 500000, status: 'paye', type: 'facture',
      dueDate: daysFromNow(-90), paidDate: daysFromNow(-85), paidAmount: 500000,
      paymentMethod: 'especes', billingType: 'forfait',
      clientKey: 'Tchouankeu Martin', caseRef: '2025-DL-018',
      notes: 'Honoraires forfaitaires — Consultation et rédaction de lettre de mise en demeure.',
    },
  ]

  for (const inv of invoicesData) {
    const client = clients[inv.clientKey]
    if (!client) {
      console.error(`❌ Client not found for invoice: ${inv.clientKey}`)
      continue
    }
    const caseObj = inv.caseRef ? cases[inv.caseRef] : null
    const created = await db.invoice.create({
      data: {
        reference: inv.reference,
        amount: inv.amount,
        status: inv.status,
        type: inv.type,
        dueDate: inv.dueDate,
        paidDate: inv.paidDate,
        paidAmount: inv.paidAmount,
        notes: inv.notes,
        paymentMethod: inv.paymentMethod,
        billingType: inv.billingType,
        currencyCode: 'XAF',
        tenantId: tenant.id,
        clientId: client.id,
        caseId: caseObj?.id || null,
      },
    })
    console.log(`💰 Invoice created: ${inv.reference} — ${inv.amount.toLocaleString('fr-FR')} FCFA (${created.id})`)
  }

  // ══════════════════════════════════════════════════════════════════
  // 8. MESSAGES (12)
  // ══════════════════════════════════════════════════════════════════
  const messagesData = [
    { senderKey: 'me.ndoki@scp-ndoki.com', receiverKey: 'fotso.kamga@scp-ndoki.com', content: 'Paul, merci de préparer les notes de plaidoirie pour l\'affaire Ngassa avant jeudi. C\'est urgent.' },
    { senderKey: 'fotso.kamga@scp-ndoki.com', receiverKey: 'me.ndoki@scp-ndoki.com', content: 'Bien reçu Maître. Je m\'en occupe dès aujourd\'hui. J\'ai déjà commencé à travailler sur les questions pour les témoins.' },
    { senderKey: 'nganmeni.hubert@scp-ndoki.com', receiverKey: 'tchinda.armand@scp-ndoki.com', content: 'Hubert, peux-tu analyser le contrat fournisseur de la SABC et me faire un résumé des clauses litigieuses ?' },
    { senderKey: 'tchinda.armand@scp-ndoki.com', receiverKey: 'nganmeni.hubert@scp-ndoki.com', content: 'Oui, je vais le faire aujourd\'hui. J\'ai repéré au moins 3 clauses non conformes au droit OHADA.' },
    { senderKey: 'mbarga.therese@scp-ndoki.com', receiverKey: 'essomba.jeanpierre@scp-ndoki.com', content: 'Jean Pierre, la facture FAC-2025-003 pour M. Bailly n\'est toujours pas payée. Peux-tu envoyer une relance ?' },
    { senderKey: 'essomba.jeanpierre@scp-ndoki.com', receiverKey: 'mbarga.therese@scp-ndoki.com', content: 'C\'est noté Thérèse. Je prépare la mise en demeure cet après-midi et je te l\'enverrai pour validation.' },
    { senderKey: 'me.ndoki@scp-ndoki.com', receiverKey: 'nganmeni.hubert@scp-ndoki.com', content: 'Hubert, la réunion avec BICEC est confirmée pour vendredi à 10h. Prépare les documents hypothécaires.' },
    { senderKey: 'nkoulou.raphael@scp-ndoki.com', receiverKey: 'ateba.sandrine@scp-ndoki.com', content: 'Sandrine, est-ce que tu as pu rassembler les pièces pour le dossier succession Tchouankeu ?' },
    { senderKey: 'ateba.sandrine@scp-ndoki.com', receiverKey: 'nkoulou.raphael@scp-ndoki.com', content: 'Oui Raphaël, tout est classé dans le dossier numérique. Je t\'envoie le lien d\'accès maintenant.' },
    { senderKey: 'me.ndoki@scp-ndoki.com', receiverKey: 'fotso.kamga@scp-ndoki.com', content: 'Paul, j\'ai besoin d\'un point sur tous les dossiers pénaux en cours. Peux-tu me faire un résumé d\'ici demain ?' },
    { senderKey: 'kamsu.delphine@scp-ndoki.com', receiverKey: 'mbarga.therese@scp-ndoki.com', content: 'Thérèse, un nouveau client (Mme Kamga Françoise) a appelé pour son rendez-vous de demain. Je l\'ai inscrit dans l\'agenda.' },
    { senderKey: 'fotso.kamga@scp-ndoki.com', receiverKey: 'nkoulou.raphael@scp-ndoki.com', content: 'Raphaël, n\'oublie pas de déposer les conclusions au greffe du TGI avant vendredi pour le dossier foncier.' },
  ]

  for (const m of messagesData) {
    const sender = users[m.senderKey]
    const receiver = users[m.receiverKey]
    if (!sender || !receiver) {
      console.error(`❌ User not found for message: ${m.senderKey} -> ${m.receiverKey}`)
      continue
    }
    const created = await db.message.create({
      data: {
        content: m.content,
        tenantId: tenant.id,
        senderId: sender.id,
        receiverId: receiver.id,
      },
    })
    console.log(`💬 Message: ${sender.name} → ${receiver.name} (${created.id})`)
  }

  // ══════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('✅ SCP NDOKI & ASSOCIES seed completed successfully!')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`🏢 Tenant: ${tenant.name} (${tenant.id})`)
  console.log(`👤 Users: 9`) 
  console.log(`📁 Clients: ${clientsData.length}`)
  console.log(`📋 Cases: ${casesData.length}`)
  console.log(`📅 Events: ${eventsData.length}`)
  console.log(`✅ Tasks: ${tasksData.length}`)
  console.log(`💰 Invoices: ${invoicesData.length}`)
  console.log(`💬 Messages: ${messagesData.length}`)
  console.log('═══════════════════════════════════════════════════════')

  await db.$disconnect()
}

seed().catch(async (e) => {
  console.error('❌ Seed failed:', e)
  await db.$disconnect()
  process.exit(1)
})
