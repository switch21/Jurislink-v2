import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('Seeding RBAC + Subscription Plans...')

  // 1. Create roles
  const roles = [
    { name: 'root_admin', label: 'Admin Racine', description: 'Super administrateur, gère tous les cabinets', level: 100, isSystem: true },
    { name: 'associate', label: 'Associé', description: 'Accès complet à tous les dossiers du cabinet', level: 80, isSystem: true },
    { name: 'firm_admin', label: 'Admin Cabinet', description: 'Administrateur du cabinet', level: 70, isSystem: true },
    { name: 'lawyer', label: 'Avocat', description: 'Accès à ses dossiers et dossiers autorisés', level: 50, isSystem: true },
    { name: 'jurist', label: 'Juriste', description: 'Dossiers attribués uniquement', level: 40, isSystem: true },
    { name: 'assistant', label: 'Assistant', description: 'Agenda, tâches et documents autorisés', level: 30, isSystem: true },
    { name: 'accountant', label: 'Comptable', description: 'Facturation et paiements', level: 20, isSystem: true },
    { name: 'client', label: 'Client', description: 'Uniquement son espace client', level: 10, isSystem: true },
  ]

  for (const r of roles) {
    await db.role.upsert({ where: { name: r.name }, update: {}, create: r })
    console.log('  Role:', r.name)
  }

  // 2. Create permissions
  const resources = ['case', 'client', 'document', 'invoice', 'task', 'event', 'audit', 'user', 'report', 'setting', 'message', 'notification', 'time_entry', 'document_template', 'payment', 'communication', 'role', 'audit_log', 'subscription']
  const actions = ['view', 'create', 'edit', 'delete', 'export', 'manage_permissions']
  let permCount = 0
  for (const res of resources) {
    for (const act of actions) {
      await db.permission.upsert({
        where: { resource_action: { resource: res, action: act } },
        update: {},
        create: { name: `${res}_${act}`, resource: res, action: act }
      })
      permCount++
    }
  }
  console.log(`  Permissions: ${permCount} (${resources.length} x ${actions.length})`)

  // 3. Get maps
  const allRoles = await db.role.findMany()
  const allPerms = await db.permission.findMany()
  const roleMap: Record<string, string> = {}
  allRoles.forEach(r => { roleMap[r.name] = r.id })
  const permMap: Record<string, string> = {}
  allPerms.forEach(p => { permMap[`${p.resource}_${p.action}`] = p.id })

  // 4. Permission matrix
  const PM: Record<string, Record<string, Record<string, number>>> = {
    root_admin: {
      case: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 1 },
      client: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 1 },
      document: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 1 },
      invoice: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 1 },
      task: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 1 },
      event: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 1 },
      audit: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 1 },
      user: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 1 },
      report: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 1 },
      setting: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 1 },
      message: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 0 },
      notification: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 0 },
      time_entry: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 0 },
      document_template: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 0 },
      payment: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 0 },
      communication: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 0 },
      role: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 1 },
      audit_log: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 0 },
      subscription: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 1 },
    },
    associate: {
      case: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      client: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      document: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 0 },
      invoice: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      task: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      event: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      audit: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      user: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      report: { view: 1, create: 1, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      setting: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      message: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 0 },
      notification: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      time_entry: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      document_template: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      payment: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      communication: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      role: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      audit_log: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      subscription: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
    },
    firm_admin: {
      case: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      client: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      document: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 0 },
      invoice: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      task: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      event: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      audit: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      user: { view: 1, create: 1, edit: 1, delete: 0, export: 0, manage_permissions: 0 },
      report: { view: 1, create: 1, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      setting: { view: 1, create: 0, edit: 1, delete: 0, export: 0, manage_permissions: 0 },
      message: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 0 },
      notification: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      time_entry: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      document_template: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      payment: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      communication: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      role: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      audit_log: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      subscription: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
    },
    lawyer: {
      case: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      client: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      document: { view: 1, create: 1, edit: 1, delete: 1, export: 1, manage_permissions: 0 },
      invoice: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      task: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      event: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      audit: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      user: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      report: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      setting: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      message: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      notification: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      time_entry: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      document_template: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      payment: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      communication: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      role: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      audit_log: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      subscription: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
    },
    jurist: {
      case: { view: 1, create: 0, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      client: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      document: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      invoice: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      task: { view: 1, create: 0, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      event: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      audit: { view: 0 }, user: { view: 1 }, report: { view: 1, export: 1 },
      setting: {}, message: { view: 1 }, notification: { view: 1 },
      time_entry: { view: 1, edit: 1 }, document_template: { view: 1 }, payment: {},
      communication: { view: 1 }, role: {}, audit_log: {}, subscription: {},
    },
    assistant: {
      case: { view: 1, edit: 1, export: 1 },
      client: { view: 1, edit: 1, export: 1 },
      document: { view: 1, create: 1, edit: 1, export: 1 },
      invoice: {}, task: { view: 1, create: 1, edit: 1, export: 1 },
      event: { view: 1, create: 1, edit: 1, export: 1 },
      audit: {}, user: { view: 1 }, report: {}, setting: {},
      message: { view: 1 }, notification: { view: 1 },
      time_entry: { view: 1, create: 1, edit: 1 }, document_template: { view: 1 },
      payment: {}, communication: { view: 1 }, role: {}, audit_log: {}, subscription: {},
    },
    accountant: {
      case: { view: 1 }, client: { view: 1, export: 1 },
      document: { view: 1, create: 1, edit: 1, export: 1 },
      invoice: { view: 1, create: 1, edit: 1, export: 1 },
      task: { view: 1 }, event: {}, audit: {}, user: {},
      report: { view: 1, create: 1, export: 1 }, setting: {}, message: {}, notification: {},
      time_entry: { view: 1, create: 1, edit: 1 }, document_template: { view: 1 },
      payment: { view: 1, create: 1, edit: 1 }, communication: {}, role: {},
      audit_log: {}, subscription: {},
    },
    client: {
      case: { view: 1, export: 1 }, client: {},
      document: { view: 1, export: 1 }, invoice: { view: 1, export: 1 },
      task: {}, event: { view: 1 }, audit: {}, user: {}, report: {},
      setting: {}, message: { view: 1, create: 1 }, notification: { view: 1 },
      time_entry: {}, document_template: {}, payment: { view: 1 },
      communication: { view: 1, create: 1 }, role: {}, audit_log: {}, subscription: {},
    },
  }

  const allActions = ['view', 'create', 'edit', 'delete', 'export', 'manage_permissions']
  let rpCount = 0
  for (const [rName, resources] of Object.entries(PM)) {
    const roleId = roleMap[rName]
    if (!roleId) continue
    for (const [resource, acts] of Object.entries(resources)) {
      for (const act of allActions) {
        const permId = permMap[`${resource}_${act}`]
        if (!permId) continue
        const allowed = !!acts[act]
        await db.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId: permId } },
          update: { allowed },
          create: { roleId, permissionId: permId, allowed }
        })
        rpCount++
      }
    }
  }
  console.log(`  Role permissions: ${rpCount}`)

  // 5. Subscription plans
  const plans = [
    { name: 'Standard', slug: 'standard', description: 'Idéal pour les petits cabinets',
      priceAnnual: 180000, priceSemiAnnual: 99000, priceQuarterly: 51750, priceMonthly: 18000,
      currencyCode: 'XAF', maxUsers: 3, maxStorageGb: 5, hasAI: false, sortOrder: 1,
      features: JSON.stringify(['Gestion des dossiers', 'Gestion des clients', 'Agenda et échéances', 'Documents', 'Facturation de base', '3 utilisateurs', '5 Go stockage']) },
    { name: 'Premium', slug: 'premium', description: 'Pour les cabinets en croissance',
      priceAnnual: 500000, priceSemiAnnual: 275000, priceQuarterly: 143750, priceMonthly: 50000,
      currencyCode: 'XAF', maxUsers: 9, maxStorageGb: 20, hasAI: false, sortOrder: 2,
      features: JSON.stringify(['Tout le plan Standard', 'Rapports avancés', 'Recherche globale', 'Gestion des équipes', 'Workflow automatique', '9 utilisateurs', '20 Go stockage', 'Notifications email']) },
    { name: 'Entreprise', slug: 'entreprise', description: 'Pour les grands cabinets',
      priceAnnual: 700000, priceSemiAnnual: 385000, priceQuarterly: 201250, priceMonthly: 70000,
      currencyCode: 'XAF', maxUsers: 999, maxStorageGb: 100, hasAI: true, sortOrder: 3,
      features: JSON.stringify(['Tout le plan Premium', 'IA Juridique Copilot', 'Analyse de documents', 'Détection conflits', 'Utilisateurs illimités', '100 Go stockage', 'API accès', 'Support prioritaire', 'Signature électronique']) },
  ]
  for (const p of plans) {
    await db.subscriptionPlan.upsert({ where: { slug: p.slug }, update: {}, create: p })
    console.log(`  Plan: ${p.slug}`)
  }

  // 6. Link users to roles
  for (const rName of Object.keys(PM)) {
    const roleId = roleMap[rName]
    if (!roleId) continue
    const result = await db.user.updateMany({ where: { role: rName, roleId: null }, data: { roleId } })
    if (result.count > 0) console.log(`  Linked ${result.count} users -> ${rName}`)
  }

  // 7. Subscriptions for tenants without one
  const stdPlan = await db.subscriptionPlan.findUnique({ where: { slug: 'standard' } })
  if (stdPlan) {
    const tenants = await db.tenant.findMany({ include: { subscription: true } })
    for (const t of tenants) {
      if (!t.subscription) {
        await db.subscription.create({ data: { tenantId: t.id, planId: stdPlan.id, status: 'active', billingPeriod: 'annual', currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) } })
        console.log(`  Subscription: ${t.name}`)
      }
    }
  }

  console.log('\nSeed complete!')
}

main().catch(console.error).finally(() => db.$disconnect())
