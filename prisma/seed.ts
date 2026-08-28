/**
 * Comprehensive seed for JurisLink
 * Covers ALL models in schema.prisma with realistic Francophone African law-firm data.
 * Passwords are bcrypt-hashed via bcryptjs.
 * Status values match what the dashboard, views, and constants expect.
 *
 * Usage: npx prisma db seed
 */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();

const PW = 'Admin@123';

// ── helpers ────────────────────────────────────────────────────────────────────
const h = (pw: string) => hash(pw, 10);
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);
const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000);
const hoursFromNow = (h2: number) => new Date(Date.now() + h2 * 3600000);
const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const todayEnd = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};
const firstOfThisMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const lastOfThisMonth = () => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
const firstOfLastMonth = () => new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
const lastOfLastMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 0, 23, 59, 59, 999);

async function main() {
  console.log('🌱 Seeding comprehensive data…');

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CLEAN — delete in FK-safe order
  // ═══════════════════════════════════════════════════════════════════════════
  const tables = [
    'auditLog', 'notification', 'message', 'reminderLog',
    'payment', 'invoiceLineItem', 'invoice',
    'communication', 'timeEntry',
    'documentVersion', 'document',
    'task', 'caseNote',
    'eventAssignment', 'event',
    'caseAssignment', 'case',
    'clientPortal', 'client',
    'documentTemplate',
    'rolePermission', 'user',
    'subscription', 'subscriptionPlan',
    'role', 'permission',
    'currency', 'tenant',
  ] as const;
  for (const t of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)[t.charAt(0).toUpperCase() + t.slice(1)].deleteMany();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CURRENCIES
  // ═══════════════════════════════════════════════════════════════════════════
  const xaf = await db.currency.create({ data: { code: 'XAF', name: 'Franc CFA (BEAC)', symbol: 'FCFA' } });
  const xof = await db.currency.create({ data: { code: 'XOF', name: 'Franc CFA (BCEAO)', symbol: 'FCFA' } });
  const eur = await db.currency.create({ data: { code: 'EUR', name: 'Euro', symbol: '€' } });
  const usd = await db.currency.create({ data: { code: 'USD', name: 'Dollar US', symbol: '$' } });
  console.log('  ✅ Currencies');

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ROLES
  // ═══════════════════════════════════════════════════════════════════════════
  const roleData = [
    { name: 'root_admin', label: 'Admin Racine', description: 'Super administrateur, gère tous les cabinets', level: 100, isSystem: true },
    { name: 'associate', label: 'Associé', description: 'Accès complet à tous les dossiers du cabinet', level: 80, isSystem: true },
    { name: 'firm_admin', label: 'Admin Cabinet', description: 'Administrateur du cabinet', level: 70, isSystem: true },
    { name: 'lawyer', label: 'Avocat', description: 'Accès à ses dossiers et dossiers autorisés', level: 50, isSystem: true },
    { name: 'jurist', label: 'Juriste', description: 'Dossiers attribués uniquement', level: 40, isSystem: true },
    { name: 'assistant', label: 'Assistant', description: 'Agenda, tâches et documents autorisés', level: 30, isSystem: true },
    { name: 'accountant', label: 'Comptable', description: 'Facturation et paiements', level: 20, isSystem: true },
    { name: 'client', label: 'Client', description: 'Uniquement son espace client', level: 10, isSystem: true },
  ];
  const roles: Record<string, string> = {};
  for (const r of roleData) {
    const created = await db.role.create({ data: r });
    roles[r.name] = created.id;
  }
  console.log('  ✅ Roles');

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PERMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const resources = ['case', 'client', 'document', 'invoice', 'task', 'event', 'audit', 'user', 'report', 'setting', 'message', 'notification', 'time_entry', 'document_template', 'payment', 'communication', 'role', 'audit_log', 'subscription'];
  const actions = ['view', 'create', 'edit', 'delete', 'export', 'manage_permissions'];
  const permMap: Record<string, string> = {};
  for (const res of resources) {
    for (const act of actions) {
      const p = await db.permission.create({ data: { name: `${res}_${act}`, resource: res, action: act } });
      permMap[`${res}_${act}`] = p.id;
    }
  }
  console.log('  ✅ Permissions');

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ROLE PERMISSIONS (same matrix as seed-rbac.ts)
  // ═══════════════════════════════════════════════════════════════════════════
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
      audit: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      user: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      report: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      setting: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      message: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      notification: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      time_entry: { view: 1, create: 0, edit: 1, delete: 0, export: 0, manage_permissions: 0 },
      document_template: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      payment: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      communication: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      role: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      audit_log: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      subscription: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
    },
    assistant: {
      case: { view: 1, create: 0, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      client: { view: 1, create: 0, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      document: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      invoice: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      task: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      event: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      audit: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      user: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      report: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      setting: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      message: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      notification: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      time_entry: { view: 1, create: 1, edit: 1, delete: 0, export: 0, manage_permissions: 0 },
      document_template: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      payment: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      communication: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      role: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      audit_log: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      subscription: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
    },
    accountant: {
      case: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      client: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      document: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      invoice: { view: 1, create: 1, edit: 1, delete: 0, export: 1, manage_permissions: 0 },
      task: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      event: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      audit: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      user: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      report: { view: 1, create: 1, delete: 0, edit: 0, export: 1, manage_permissions: 0 },
      setting: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      message: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      notification: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      time_entry: { view: 1, create: 1, edit: 1, delete: 0, export: 0, manage_permissions: 0 },
      document_template: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      payment: { view: 1, create: 1, edit: 1, delete: 0, export: 0, manage_permissions: 0 },
      communication: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      role: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      audit_log: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      subscription: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
    },
    client: {
      case: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      client: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      document: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      invoice: { view: 1, create: 0, edit: 0, delete: 0, export: 1, manage_permissions: 0 },
      task: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      event: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      audit: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      user: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      report: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      setting: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      message: { view: 1, create: 1, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      notification: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      time_entry: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      document_template: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      payment: { view: 1, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      communication: { view: 1, create: 1, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      role: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      audit_log: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
      subscription: { view: 0, create: 0, edit: 0, delete: 0, export: 0, manage_permissions: 0 },
    },
  };

  const allActs = ['view', 'create', 'edit', 'delete', 'export', 'manage_permissions'];
  let rpCount = 0;
  for (const [rName, rResources] of Object.entries(PM)) {
    const roleId = roles[rName];
    if (!roleId) continue;
    for (const [resource, acts] of Object.entries(rResources)) {
      for (const act of allActs) {
        const permId = permMap[`${resource}_${act}`];
        if (!permId) continue;
        await db.rolePermission.create({
          data: { roleId, permissionId: permId, allowed: !!acts[act] },
        });
        rpCount++;
      }
    }
  }
  console.log(`  ✅ Role permissions (${rpCount})`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SUBSCRIPTION PLANS
  // ═══════════════════════════════════════════════════════════════════════════
  const planStd = await db.subscriptionPlan.create({
    data: {
      name: 'Standard', slug: 'standard',
      description: 'Idéal pour les petits cabinets',
      priceAnnual: 180000, priceSemiAnnual: 99000, priceQuarterly: 51750, priceMonthly: 18000,
      currencyCode: 'XAF', maxUsers: 3, maxStorageGb: 5, hasAI: false, sortOrder: 1,
      features: JSON.stringify(['Gestion des dossiers', 'Gestion des clients', 'Agenda et échéances', 'Documents', 'Facturation de base', '3 utilisateurs', '5 Go stockage']),
    },
  });
  await db.subscriptionPlan.create({
    data: {
      name: 'Premium', slug: 'premium',
      description: 'Pour les cabinets en croissance',
      priceAnnual: 500000, priceSemiAnnual: 275000, priceQuarterly: 143750, priceMonthly: 50000,
      currencyCode: 'XAF', maxUsers: 9, maxStorageGb: 20, hasAI: false, sortOrder: 2,
      features: JSON.stringify(['Tout le plan Standard', 'Rapports avancés', 'Recherche globale', 'Gestion des équipes', 'Workflow automatique', '9 utilisateurs', '20 Go stockage', 'Notifications email']),
    },
  });
  await db.subscriptionPlan.create({
    data: {
      name: 'Entreprise', slug: 'entreprise',
      description: 'Pour les grands cabinets',
      priceAnnual: 700000, priceSemiAnnual: 385000, priceQuarterly: 201250, priceMonthly: 70000,
      currencyCode: 'XAF', maxUsers: 999, maxStorageGb: 100, hasAI: true, sortOrder: 3,
      features: JSON.stringify(['Tout le plan Premium', 'IA Juridique Copilot', 'Analyse de documents', 'Détection conflits', 'Utilisateurs illimités', '100 Go stockage', 'API accès', 'Support prioritaire', 'Signature électronique']),
    },
  });
  console.log('  ✅ Subscription plans');

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. TENANTS
  // ═══════════════════════════════════════════════════════════════════════════
  const t1 = await db.tenant.create({
    data: {
      name: 'Cabinet Mbeki & Associés', slug: 'mbeki-associes', plan: 'premium',
      maxUsers: 10, maxStorageGb: 20, currencyCode: 'XAF',
      address: '45 Rue Joss, Bonapriso', city: 'Douala', country: 'Cameroun',
      phone: '+237 6 99 88 77 66', email: 'contact@mbeki-associes.com',
      niu: 'M2023A001234', language: 'fr', timezone: 'Africa/Douala',
    },
  });
  const t2 = await db.tenant.create({
    data: {
      name: 'Etude Ndong Avocats', slug: 'ndong-avocats', plan: 'starter',
      maxUsers: 3, maxStorageGb: 5, currencyCode: 'XAF',
      address: '12 Blvd de l\'Indépendance', city: 'Libreville', country: 'Gabon',
      phone: '+241 07 44 33 22', email: 'info@ndong-avocats.com',
      language: 'fr', timezone: 'Africa/Libreville',
    },
  });
  console.log('  ✅ Tenants');

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  await db.subscription.create({
    data: {
      tenantId: t1.id, planId: planStd.id, status: 'active',
      billingPeriod: 'annual',
      currentPeriodStart: firstOfThisMonth(),
      currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
    },
  });
  await db.subscription.create({
    data: {
      tenantId: t2.id, planId: planStd.id, status: 'active',
      billingPeriod: 'annual',
      currentPeriodStart: firstOfThisMonth(),
      currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
    },
  });
  console.log('  ✅ Subscriptions');

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. USERS (password: Admin@123, bcrypt-hashed)
  // ═══════════════════════════════════════════════════════════════════════════
  const uRoot = await db.user.create({
    data: {
      fullName: 'Administrateur Système', email: 'admin@jurislink.com',
      role: 'root_admin', roleId: roles.root_admin,
      password: await h(PW), isActive: true, preferredLanguage: 'fr',
    },
  });
  const uMbeki = await db.user.create({
    data: {
      fullName: 'Maître Mbeki', email: 'mbeki@jurislink.com',
      role: 'associate', roleId: roles.associate,
      tenantId: t1.id, password: await h(PW),
      phone: '+237 6 11 22 33', isActive: true,
    },
  });
  const uNgassa = await db.user.create({
    data: {
      fullName: 'Me Ngassa Paul', email: 'ngassa@jurislink.com',
      role: 'lawyer', roleId: roles.lawyer,
      tenantId: t1.id, password: await h(PW),
      phone: '+237 6 55 44 33', isActive: true,
    },
  });
  const uFotso = await db.user.create({
    data: {
      fullName: 'Me Fotso Marie', email: 'fotso@jurislink.com',
      role: 'lawyer', roleId: roles.lawyer,
      tenantId: t1.id, password: await h(PW),
      phone: '+237 6 77 88 99', isActive: true,
    },
  });
  const uTchinda = await db.user.create({
    data: {
      fullName: 'Tchinda Armand', email: 'tchinda@jurislink.com',
      role: 'jurist', roleId: roles.jurist,
      tenantId: t1.id, password: await h(PW),
      phone: '+237 6 33 22 11', isActive: true,
    },
  });
  const uAche = await db.user.create({
    data: {
      fullName: 'Ache Clémentine', email: 'ache@jurislink.com',
      role: 'assistant', roleId: roles.assistant,
      tenantId: t1.id, password: await h(PW),
      isActive: true,
    },
  });
  const uKamga = await db.user.create({
    data: {
      fullName: 'Kamga Comptable', email: 'kamga.cpt@jurislink.com',
      role: 'accountant', roleId: roles.accountant,
      tenantId: t1.id, password: await h(PW),
      isActive: true,
    },
  });
  // Tenant 2 users
  const uNdong = await db.user.create({
    data: {
      fullName: 'Me Ndong', email: 'ndong@jurislink.com',
      role: 'associate', roleId: roles.associate,
      tenantId: t2.id, password: await h(PW),
      phone: '+241 07 55 66 77', isActive: true,
    },
  });
  const uNdongAssist = await db.user.create({
    data: {
      fullName: 'Okoue Sandrine', email: 'okoue@jurislink.com',
      role: 'assistant', roleId: roles.assistant,
      tenantId: t2.id, password: await h(PW),
      isActive: true,
    },
  });
  console.log('  ✅ Users');

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. CLIENTS
  // ═══════════════════════════════════════════════════════════════════════════
  const c1 = await db.client.create({ data: {
    fullName: 'Jean Kamga', company: 'Kamga SARL',
    email: 'j.kamga@email.com', phone: '+237 6 99 11 22',
    address: 'Rue Joss, Douala', city: 'Douala', country: 'Cameroun',
    niu: '123456789A', riskLevel: 'moyen', clientType: 'entreprise',
    source: 'recommandation', notes: 'Client fidèle depuis 2022',
    responsibleLawyerId: uNgassa.id, lastActivityAt: daysAgo(1),
    tenantId: t1.id,
  }});
  const c2 = await db.client.create({ data: {
    fullName: 'Fatou Diallo', company: 'Diallo & Fils',
    email: 'f.diallo@email.com', phone: '+237 6 88 22 11',
    city: 'Douala', country: 'Cameroun',
    riskLevel: 'faible', clientType: 'entreprise',
    source: 'internet', lastActivityAt: daysAgo(3),
    tenantId: t1.id,
  }});
  const c3 = await db.client.create({ data: {
    fullName: 'Ibrahim Hadj',
    email: 'i.hadj@email.com', phone: '+237 6 77 33 44',
    city: 'Yaoundé', country: 'Cameroun',
    clientType: 'particulier', riskLevel: 'eleve',
    source: 'bouche_a_oreille', notes: 'Difficultés de paiement antérieures',
    responsibleLawyerId: uFotso.id, lastActivityAt: daysAgo(0),
    tenantId: t1.id,
  }});
  const c4 = await db.client.create({ data: {
    fullName: 'Aïcha Bello', company: 'Bello Enterprises',
    email: 'a.bello@email.com', phone: '+237 6 66 55 44',
    city: 'Douala', country: 'Cameroun',
    clientType: 'entreprise', riskLevel: 'faible',
    lastActivityAt: daysAgo(7),
    tenantId: t1.id,
  }});
  const c5 = await db.client.create({ data: {
    fullName: 'Olivier Dupont',
    email: 'o.dupont@email.com', phone: '+237 6 55 66 77',
    city: 'Douala', country: 'Cameroun',
    clientType: 'particulier', riskLevel: 'faible', source: 'internet',
    responsibleLawyerId: uNgassa.id, lastActivityAt: daysAgo(45),
    tenantId: t1.id,
  }});
  const c6 = await db.client.create({ data: {
    fullName: 'Pierre Epee', company: 'Epee & Co',
    email: 'p.epee@email.com', phone: '+237 6 44 33 22',
    city: 'Douala', country: 'Cameroun',
    niu: '987654321B', clientType: 'entreprise',
    riskLevel: 'moyen', source: 'recommandation',
    notes: 'Ancien client du cabinet Ndong',
    responsibleLawyerId: uFotso.id, lastActivityAt: daysAgo(0),
    tenantId: t1.id,
  }});
  const c7 = await db.client.create({ data: {
    fullName: 'Solange Nkoulou',
    email: 's.nkoulou@email.com', phone: '+237 6 22 11 00',
    city: 'Douala', country: 'Cameroun',
    clientType: 'particulier', riskLevel: 'eleve',
    source: 'bouche_a_oreille',
    responsibleLawyerId: uNgassa.id, lastActivityAt: daysAgo(2),
    tenantId: t1.id,
  }});
  const c8 = await db.client.create({ data: {
    fullName: 'André Mbarga', company: 'Mbarga Consulting',
    email: 'a.mbarga@email.com', phone: '+237 6 33 44 55',
    city: 'Yaoundé', country: 'Cameroun',
    clientType: 'entreprise', riskLevel: 'faible',
    source: 'internet',
    tenantId: t1.id,
  }});
  // Tenant 2 clients
  const c9 = await db.client.create({ data: {
    fullName: 'Paul Ondo', company: 'Ondo Import',
    email: 'p.ondo@email.com', phone: '+241 06 11 22 33',
    city: 'Libreville', country: 'Gabon',
    clientType: 'entreprise', riskLevel: 'faible',
    responsibleLawyerId: uNdong.id,
    tenantId: t2.id,
  }});
  const c10 = await db.client.create({ data: {
    fullName: 'Marie Nzoussi',
    email: 'm.nzoussi@email.com', phone: '+241 06 44 55 66',
    city: 'Libreville', country: 'Gabon',
    clientType: 'particulier', riskLevel: 'moyen',
    tenantId: t2.id,
  }});
  console.log('  ✅ Clients');

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. CASES (statuses match dashboard expectations)
  // ═══════════════════════════════════════════════════════════════════════════
  const case1 = await db.case.create({ data: {
    reference: 'DOU-2025-001', title: 'Litige foncier Kamga SARL',
    description: 'Contentieux portant sur un terrain de 2000m² à Douala Bonapriso',
    caseType: 'civil', status: 'en_cours', priority: 'haute',
    clientId: c1.id, tenantId: t1.id,
    adversary: 'Société ABC Immo',
    jurisdiction: 'Tribunal de Première Instance de Douala',
    amountInDispute: 25000000, billingType: 'forfait',
    createdAt: daysAgo(30),
  }});
  const case2 = await db.case.create({ data: {
    reference: 'DOU-2025-002', title: 'Licenciement abusif - Diallo',
    description: "Contestation d'un licenciement sans motif légitime",
    caseType: 'social', status: 'ouvert', priority: 'normal',
    clientId: c2.id, tenantId: t1.id,
    adversary: 'Société Diallo & Fils (employeur)',
    jurisdiction: 'Tribunal du Travail de Douala',
    amountInDispute: 8000000, billingType: 'horaire',
    createdAt: daysAgo(14),
  }});
  const case3 = await db.case.create({ data: {
    reference: 'DOU-2025-003', title: 'Recouvrement créances Hadj',
    description: "Recouvrement de créances impayées d'un montant de 15M FCFA",
    caseType: 'commercial', status: 'en_attente', priority: 'haute',
    clientId: c3.id, tenantId: t1.id,
    adversary: 'Société XYZ Trading',
    jurisdiction: 'Tribunal de Commerce de Douala',
    amountInDispute: 15000000, billingType: 'provision',
    createdAt: daysAgo(21),
  }});
  const case4 = await db.case.create({ data: {
    reference: 'DOU-2025-004', title: 'Divorce Bello',
    description: 'Procédure de divorce contentieux',
    caseType: 'civil', status: 'nouveau', priority: 'basse',
    isSecret: true, clientId: c4.id, tenantId: t1.id,
    jurisdiction: 'Tribunal de Première Instance de Douala',
    createdAt: daysAgo(5),
  }});
  const case5 = await db.case.create({ data: {
    reference: 'DOU-2024-010', title: 'Constitution société Dupont',
    description: 'Création de SARL et formalités associées',
    caseType: 'commercial', status: 'ferme', outcome: 'favorable',
    clientId: c5.id, tenantId: t1.id,
    billingType: 'forfait',
    createdAt: daysAgo(90),
  }});
  const case6 = await db.case.create({ data: {
    reference: 'DOU-2025-005', title: 'Litige commercial Epee c/ Société X',
    description: 'Litige portant sur la livraison de marchandises non conformes',
    caseType: 'commercial', status: 'en_cours', priority: 'urgente',
    clientId: c6.id, tenantId: t1.id,
    adversary: 'Société X Import-Export',
    jurisdiction: 'Tribunal de Commerce de Douala',
    amountInDispute: 35000000, billingType: 'success_fee',
    createdAt: daysAgo(10),
  }});
  const case7 = await db.case.create({ data: {
    reference: 'DOU-2025-006', title: 'Affaire pénale Nkoulou',
    description: 'Défense dans une affaire de détention illégale de produits',
    caseType: 'penal', status: 'ouvert', priority: 'haute',
    clientId: c7.id, tenantId: t1.id,
    adversary: 'Ministère Public',
    jurisdiction: 'Tribunal Correctionnel de Douala',
    billingType: 'horaire',
    createdAt: daysAgo(7),
  }});
  const case8 = await db.case.create({ data: {
    reference: 'DOU-2025-007', title: 'Contentieux administratif Mbarga',
    description: 'Recours contre un arrêté préfectoral',
    caseType: 'administratif', status: 'nouveau', priority: 'normal',
    clientId: c8.id, tenantId: t1.id,
    adversary: 'Préfecture du Wouri',
    jurisdiction: 'Tribunal Administratif de Douala',
    billingType: 'forfait',
    createdAt: daysAgo(2),
  }});
  // Case without future events (for "cases without deadlines" widget)
  const case9 = await db.case.create({ data: {
    reference: 'DOU-2025-008', title: 'Conseil juridique - Bello Enterprises',
    description: 'Mission de conseil en droit des sociétés',
    caseType: 'commercial', status: 'en_cours', priority: 'normal',
    clientId: c4.id, tenantId: t1.id,
    billingType: 'horaire',
    createdAt: daysAgo(12),
  }});
  // Tenant 2 cases
  const case10 = await db.case.create({ data: {
    reference: 'LBV-2025-001', title: 'Litige contractuel Ondo Import',
    description: 'Non-respect des clauses contractuelles par le fournisseur',
    caseType: 'commercial', status: 'en_cours', priority: 'haute',
    clientId: c9.id, tenantId: t2.id,
    adversary: 'Gabi Supplies SARL',
    jurisdiction: 'Tribunal de Première Instance de Libreville',
    amountInDispute: 12000000, billingType: 'forfait',
    createdAt: daysAgo(20),
  }});
  const case11 = await db.case.create({ data: {
    reference: 'LBV-2025-002', title: 'Succession Nzoussi',
    description: 'Partage de succession litigieux',
    caseType: 'civil', status: 'ouvert', priority: 'normal',
    clientId: c10.id, tenantId: t2.id,
    jurisdiction: 'Tribunal de Première Instance de Libreville',
    billingType: 'forfait',
    createdAt: daysAgo(8),
  }});
  console.log('  ✅ Cases');

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. CASE ASSIGNMENTS (include tenantId)
  // ═══════════════════════════════════════════════════════════════════════════
  await db.caseAssignment.createMany({ data: [
    { userId: uNgassa.id, caseId: case1.id, tenantId: t1.id },
    { userId: uFotso.id, caseId: case1.id, tenantId: t1.id },
    { userId: uTchinda.id, caseId: case1.id, tenantId: t1.id },
    { userId: uNgassa.id, caseId: case2.id, tenantId: t1.id },
    { userId: uAche.id, caseId: case2.id, tenantId: t1.id },
    { userId: uFotso.id, caseId: case3.id, tenantId: t1.id },
    { userId: uTchinda.id, caseId: case3.id, tenantId: t1.id },
    { userId: uNgassa.id, caseId: case4.id, tenantId: t1.id },
    { userId: uNgassa.id, caseId: case5.id, tenantId: t1.id },
    { userId: uNgassa.id, caseId: case6.id, tenantId: t1.id },
    { userId: uFotso.id, caseId: case6.id, tenantId: t1.id },
    { userId: uNgassa.id, caseId: case7.id, tenantId: t1.id },
    { userId: uFotso.id, caseId: case7.id, tenantId: t1.id },
    { userId: uMbeki.id, caseId: case8.id, tenantId: t1.id },
    { userId: uNgassa.id, caseId: case9.id, tenantId: t1.id },
    { userId: uNdong.id, caseId: case10.id, tenantId: t2.id },
    { userId: uNdongAssist.id, caseId: case10.id, tenantId: t2.id },
    { userId: uNdong.id, caseId: case11.id, tenantId: t2.id },
  ]});
  console.log('  ✅ Case assignments');

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. EVENTS (timed for dashboard widgets)
  // ═══════════════════════════════════════════════════════════════════════════
  const ev1 = await db.event.create({ data: {
    title: 'Audience - TGI Douala',
    description: 'Audience principale dossier Kamga',
    startTime: daysFromNow(2),
    eventType: 'audience', criticality: 'urgente',
    tenantId: t1.id, caseId: case1.id,
  }});
  const ev2 = await db.event.create({ data: {
    title: 'Réunion client Diallo',
    description: 'Préparation du dossier',
    startTime: daysFromNow(3),
    eventType: 'rdv', criticality: 'normal',
    tenantId: t1.id, caseId: case2.id,
  }});
  const ev3 = await db.event.create({ data: {
    title: 'Échéance dépôt mémoire Hadj',
    description: 'Dépôt du mémoire en défense',
    startTime: daysFromNow(1),
    eventType: 'echeance', criticality: 'urgente',
    tenantId: t1.id, caseId: case3.id,
  }});
  const ev4 = await db.event.create({ data: {
    title: 'Consultation M. Dupont',
    description: 'Première consultation',
    startTime: daysFromNow(5),
    eventType: 'rdv', criticality: 'basse',
    tenantId: t1.id, caseId: case5.id,
  }});
  const ev5 = await db.event.create({ data: {
    title: 'Audience - Tribunal Commerce Douala',
    description: 'Affaire recouvrement créances Hadj',
    startTime: daysFromNow(6),
    eventType: 'audience', criticality: 'haute',
    tenantId: t1.id, caseId: case3.id,
  }});
  // Urgent: within 3 days for urgency widget
  const ev6 = await db.event.create({ data: {
    title: 'Audience urgente Epee - Référé',
    description: "Ordonnance de référé - dossier Epee c/ Société X",
    startTime: hoursFromNow(12),
    eventType: 'audience', criticality: 'urgente',
    tenantId: t1.id, caseId: case6.id,
  }});
  const ev7 = await db.event.create({ data: {
    title: 'Dépôt conclusions Kamga',
    description: 'Dépôt des conclusions récapitulatives',
    startTime: daysFromNow(4),
    eventType: 'depot', criticality: 'haute',
    tenantId: t1.id, caseId: case1.id,
  }});
  // Today's event (for todayEvents widget)
  const ev8 = await db.event.create({ data: {
    title: 'Audience pénale Nkoulou',
    description: 'Audience au Tribunal Correctionnel',
    startTime: hoursFromNow(3),
    endTime: hoursFromNow(5),
    eventType: 'audience', criticality: 'haute',
    tenantId: t1.id, caseId: case7.id,
  }});
  // Past event
  const ev9 = await db.event.create({ data: {
    title: 'Première audience Kamga',
    description: 'Audience reportée - pièces complémentaires demandées',
    startTime: daysAgo(5),
    endTime: daysAgo(5),
    eventType: 'audience', criticality: 'normale',
    tenantId: t1.id, caseId: case1.id,
  }});
  // Tenant 2 events
  const ev10 = await db.event.create({ data: {
    title: 'Audience - TPI Libreville',
    description: 'Audience dossier Ondo Import',
    startTime: daysFromNow(4),
    eventType: 'audience', criticality: 'haute',
    tenantId: t2.id, caseId: case10.id,
  }});
  console.log('  ✅ Events');

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. EVENT ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  await db.eventAssignment.createMany({ data: [
    { userId: uNgassa.id, eventId: ev1.id },
    { userId: uFotso.id, eventId: ev1.id },
    { userId: uNgassa.id, eventId: ev2.id },
    { userId: uFotso.id, eventId: ev3.id },
    { userId: uTchinda.id, eventId: ev3.id },
    { userId: uNgassa.id, eventId: ev4.id },
    { userId: uNgassa.id, eventId: ev5.id },
    { userId: uFotso.id, eventId: ev5.id },
    { userId: uNgassa.id, eventId: ev6.id },
    { userId: uFotso.id, eventId: ev6.id },
    { userId: uNgassa.id, eventId: ev7.id },
    { userId: uTchinda.id, eventId: ev7.id },
    { userId: uNgassa.id, eventId: ev8.id },
    { userId: uFotso.id, eventId: ev8.id },
    { userId: uNgassa.id, eventId: ev9.id },
    { userId: uNdong.id, eventId: ev10.id },
  ]});
  console.log('  ✅ Event assignments');

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. INVOICES (with correct fields, some overdue for dashboard)
  // ═══════════════════════════════════════════════════════════════════════════
  const inv1 = await db.invoice.create({ data: {
    invoiceNumber: 'FAC-2025-001', type: 'facture',
    amount: 500000, paidAmount: 500000, status: 'paye',
    issuedAt: daysAgo(45), dueDate: daysAgo(30),
    clientId: c1.id, tenantId: t1.id, caseId: case1.id,
    currencyId: xaf.id,
    billingType: 'forfait',
    notes: 'Honoraires provision dossier foncier',
  }});
  const inv2 = await db.invoice.create({ data: {
    invoiceNumber: 'FAC-2025-002', type: 'facture',
    amount: 300000, paidAmount: 150000, status: 'partiel',
    issuedAt: daysAgo(40), dueDate: daysAgo(10),
    clientId: c2.id, tenantId: t1.id, caseId: case2.id,
    currencyId: xaf.id,
    reminderLevel: 1, lastReminderAt: daysAgo(5),
    notes: 'Premier versement reçu',
  }});
  const inv3 = await db.invoice.create({ data: {
    invoiceNumber: 'FAC-2025-003', type: 'facture',
    amount: 750000, paidAmount: 0, status: 'non_paye',
    issuedAt: daysAgo(35), dueDate: daysAgo(15),
    clientId: c3.id, tenantId: t1.id, caseId: case3.id,
    currencyId: xaf.id,
    reminderLevel: 2, lastReminderAt: daysAgo(3),
    notes: 'Relance envoyée par courrier',
  }});
  const inv4 = await db.invoice.create({ data: {
    invoiceNumber: 'FAC-2024-015', type: 'facture',
    amount: 200000, paidAmount: 200000, status: 'paye',
    issuedAt: daysAgo(120), dueDate: daysAgo(105),
    clientId: c5.id, tenantId: t1.id, caseId: case5.id,
    currencyId: xaf.id,
    billingType: 'forfait',
  }});
  const inv5 = await db.invoice.create({ data: {
    invoiceNumber: 'FAC-2025-004', type: 'avoir',
    amount: 150000, paidAmount: 0, status: 'annule',
    issuedAt: daysAgo(20),
    clientId: c4.id, tenantId: t1.id, caseId: case4.id,
    currencyId: xaf.id,
    notes: 'Avoir émis pour erreur de facturation',
  }});
  const inv6 = await db.invoice.create({ data: {
    invoiceNumber: 'FAC-2025-005', type: 'facture',
    amount: 1200000, paidAmount: 0, status: 'non_paye',
    issuedAt: daysAgo(25), dueDate: daysAgo(5),
    clientId: c6.id, tenantId: t1.id, caseId: case6.id,
    currencyId: xaf.id,
    reminderLevel: 3, lastReminderAt: daysAgo(1),
    notes: 'Mise en demeure envisagée',
  }});
  // Revenue this month (paye + issued this month for dashboard revenue calculation)
  const inv7 = await db.invoice.create({ data: {
    invoiceNumber: 'FAC-2025-006', type: 'facture',
    amount: 400000, paidAmount: 400000, status: 'paye',
    issuedAt: daysAgo(5), dueDate: daysFromNow(25),
    clientId: c1.id, tenantId: t1.id, caseId: case1.id,
    currencyId: xaf.id,
    billingType: 'horaire',
  }});
  // Devis
  const inv8 = await db.invoice.create({ data: {
    invoiceNumber: 'DEV-2025-001', type: 'devis',
    amount: 2500000, paidAmount: 0, status: 'non_paye',
    issuedAt: daysAgo(1),
    clientId: c8.id, tenantId: t1.id, caseId: case8.id,
    currencyId: xaf.id,
    billingType: 'forfait',
  }});
  // Revenue last month (for month-over-month comparison)
  const inv9 = await db.invoice.create({ data: {
    invoiceNumber: 'FAC-2024-020', type: 'facture',
    amount: 350000, paidAmount: 350000, status: 'paye',
    issuedAt: daysAgo(40), dueDate: daysAgo(25),
    clientId: c1.id, tenantId: t1.id, caseId: case1.id,
    currencyId: xaf.id,
  }});
  // Reçu
  const inv10 = await db.invoice.create({ data: {
    invoiceNumber: 'REC-2025-001', type: 'recu',
    amount: 150000, paidAmount: 150000, status: 'paye',
    issuedAt: daysAgo(10),
    clientId: c2.id, tenantId: t1.id, caseId: case2.id,
    currencyId: xaf.id,
  }});
  // Tenant 2 invoice
  const inv11 = await db.invoice.create({ data: {
    invoiceNumber: 'LBV-FAC-2025-001', type: 'facture',
    amount: 600000, paidAmount: 0, status: 'non_paye',
    issuedAt: daysAgo(15), dueDate: daysAgo(3),
    clientId: c9.id, tenantId: t2.id, caseId: case10.id,
    currencyId: xaf.id,
  }});
  console.log('  ✅ Invoices');

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. INVOICE LINE ITEMS
  // ═══════════════════════════════════════════════════════════════════════════
  await db.invoiceLineItem.createMany({ data: [
    { description: 'Honoraires provision - Dossier foncier', quantity: 1, unitPrice: 500000, total: 500000, sortOrder: 0, invoiceId: inv1.id },
    { description: 'Consultation juridique initiale', quantity: 2, unitPrice: 75000, total: 150000, sortOrder: 0, invoiceId: inv2.id },
    { description: 'Rédaction conclusions', quantity: 1, unitPrice: 150000, total: 150000, sortOrder: 1, invoiceId: inv2.id },
    { description: 'Étude du dossier recouvrement', quantity: 1, unitPrice: 500000, total: 500000, sortOrder: 0, invoiceId: inv3.id },
    { description: 'Mise en demeure', quantity: 1, unitPrice: 250000, total: 250000, sortOrder: 1, invoiceId: inv3.id },
    { description: 'Constitution SARL - Forfait global', quantity: 1, unitPrice: 200000, total: 200000, sortOrder: 0, invoiceId: inv4.id },
    { description: 'Urgence référé - heures supplémentaires', quantity: 1, unitPrice: 1200000, total: 1200000, sortOrder: 0, invoiceId: inv6.id },
    { description: 'Recherche jurisprudence (3h)', quantity: 3, unitPrice: 25000, total: 75000, sortOrder: 0, invoiceId: inv7.id },
    { description: 'Rédaction assignation (5h)', quantity: 5, unitPrice: 25000, total: 125000, sortOrder: 1, invoiceId: inv7.id },
    { description: 'Représentation audience (8h)', quantity: 8, unitPrice: 25000, total: 200000, sortOrder: 2, invoiceId: inv7.id },
  ]});
  console.log('  ✅ Invoice line items');

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. PAYMENTS (linked to invoices)
  // ═══════════════════════════════════════════════════════════════════════════
  await db.payment.createMany({ data: [
    { amount: 500000, method: 'virement', reference: 'VIR-2025-001', status: 'complet', paidAt: daysAgo(42), notes: 'Virement bancaire BICEC', tenantId: t1.id, invoiceId: inv1.id, recordedBy: uKamga.id },
    { amount: 150000, method: 'mobile_money', reference: 'MM-2025-001', status: 'complet', paidAt: daysAgo(35), notes: 'Paiement MTN Mobile Money', tenantId: t1.id, invoiceId: inv2.id, recordedBy: uKamga.id },
    { amount: 200000, method: 'especes', status: 'complet', paidAt: daysAgo(115), notes: 'Paiement en espèces', tenantId: t1.id, invoiceId: inv4.id, recordedBy: uKamga.id },
    { amount: 400000, method: 'virement', reference: 'VIR-2025-005', status: 'complet', paidAt: daysAgo(3), notes: 'Virement SG Douala', tenantId: t1.id, invoiceId: inv7.id, recordedBy: uKamga.id },
    { amount: 350000, method: 'cheque', reference: 'CHQ-2025-001', status: 'complet', paidAt: daysAgo(38), notes: 'Chèque Société Générale', tenantId: t1.id, invoiceId: inv9.id, recordedBy: uKamga.id },
    { amount: 150000, method: 'mobile_money', reference: 'MM-2025-002', status: 'complet', paidAt: daysAgo(8), notes: 'Paiement Orange Money', tenantId: t1.id, invoiceId: inv10.id, recordedBy: uKamga.id },
  ]});
  console.log('  ✅ Payments');

  // ═══════════════════════════════════════════════════════════════════════════
  // 18. DOCUMENTS (some en_attente/brouillon for pending-docs widget)
  // ═══════════════════════════════════════════════════════════════════════════
  const doc1 = await db.document.create({ data: {
    fileName: 'assignation_tgi_kamga.pdf', fileSize: 245760,
    filePath: '/uploads/assignation_tgi_kamga.pdf', version: 1,
    folder: 'Procédure', tags: 'assignation,tribunal,tgi',
    documentType: 'assignation', mimeType: 'application/pdf',
    description: 'Assignation du TGI de Douala pour le litige foncier',
    status: 'actif',
    tenantId: t1.id, caseId: case1.id, uploadedById: uNgassa.id,
  }});
  await db.document.createMany({ data: [
    { fileName: 'titre_foncier_kamga.pdf', fileSize: 524288, filePath: '/uploads/titre_foncier_kamga.pdf', version: 1, folder: 'Pièces client', tags: 'foncier,titre,propriété', documentType: 'titre', mimeType: 'application/pdf', description: 'Copie du titre foncier contesté', status: 'actif', tenantId: t1.id, caseId: case1.id, uploadedById: uFotso.id },
    { fileName: 'contrat_diallo.pdf', fileSize: 184320, filePath: '/uploads/contrat_diallo.pdf', version: 1, folder: 'Contrats', tags: 'travail,cdi', documentType: 'contrat', mimeType: 'application/pdf', description: "Contrat de travail de Mme Diallo", status: 'actif', tenantId: t1.id, caseId: case2.id, uploadedById: uNgassa.id },
    { fileName: 'fiches_paie_diallo.pdf', fileSize: 327680, filePath: '/uploads/fiches_paie_diallo.pdf', version: 1, folder: 'Pièces client', tags: 'paie,salaire', documentType: 'fiche_paie', mimeType: 'application/pdf', description: 'Fiches de paie des 12 derniers mois', status: 'actif', tenantId: t1.id, caseId: case2.id, uploadedById: uAche.id },
    { fileName: 'facture_hadj.pdf', fileSize: 102400, filePath: '/uploads/facture_hadj.pdf', version: 1, folder: 'Factures', tags: 'facture,impayé', documentType: 'facture', mimeType: 'application/pdf', description: 'Facture impayée de 15M FCFA', status: 'actif', tenantId: t1.id, caseId: case3.id, uploadedById: uFotso.id },
    { fileName: 'mise_en_demeure_hadj.pdf', fileSize: 81920, filePath: '/uploads/mise_en_demeure_hadj.pdf', version: 1, folder: 'Correspondances', tags: 'mise_en_demeure,relance', documentType: 'correspondance', mimeType: 'application/pdf', description: 'Lettre de mise en demeure envoyée', status: 'actif', tenantId: t1.id, caseId: case3.id, uploadedById: uNgassa.id },
    { fileName: 'acte_mariage_bello.pdf', fileSize: 204800, filePath: '/uploads/acte_mariage_bello.pdf', version: 1, folder: 'Pièces client', tags: 'mariage,etat_civil', documentType: 'acte', mimeType: 'application/pdf', description: 'Acte de mariage du couple Bello', status: 'actif', tenantId: t1.id, caseId: case4.id, uploadedById: uNgassa.id },
    { fileName: 'statuts_dupont_sarl.pdf', fileSize: 409600, filePath: '/uploads/statuts_dupont_sarl.pdf', version: 1, folder: 'Contrats', tags: 'statuts,sarl,constitution', documentType: 'statuts', mimeType: 'application/pdf', description: 'Statuts de la SARL Dupont', status: 'actif', tenantId: t1.id, caseId: case5.id, uploadedById: uNgassa.id },
    { fileName: 'pv_ag_dupont.pdf', fileSize: 153600, filePath: '/uploads/pv_ag_dupont.pdf', version: 1, folder: 'Procédure', tags: 'pv,ag,constitutive', documentType: 'pv', mimeType: 'application/pdf', description: "PV de l'assemblée générale constitutive", status: 'actif', tenantId: t1.id, caseId: case5.id, uploadedById: uAche.id },
    { fileName: 'commande_epee.pdf', fileSize: 125000, filePath: '/uploads/commande_epee.pdf', version: 1, folder: 'Pièces client', tags: 'commande,marchandises', documentType: 'contrat', mimeType: 'application/pdf', description: 'Bon de commande initial', status: 'actif', tenantId: t1.id, caseId: case6.id, uploadedById: uNgassa.id },
    // Pending documents (en_attente / brouillon)
    { fileName: 'conclusions_kamga_v3.docx', fileSize: 95000, filePath: '/uploads/conclusions_kamga_v3.docx', version: 1, folder: 'Brouillons', tags: 'conclusions,brouillon', documentType: 'conclusions', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', description: 'Conclusions récapitulatives - en cours de révision', status: 'brouillon', tenantId: t1.id, caseId: case1.id, uploadedById: uTchinda.id },
    { fileName: 'certificat_nkoulou.pdf', fileSize: 75000, filePath: '/uploads/certificat_nkoulou.pdf', version: 1, folder: 'Pièces client', tags: 'certificat,penal', documentType: 'certificat', mimeType: 'application/pdf', description: 'Certificat de bonne conduite - en attente de vérification', status: 'en_attente', tenantId: t1.id, caseId: case7.id, uploadedById: uAche.id },
    { fileName: 'arrete_prefectoral_mbarga.pdf', fileSize: 180000, filePath: '/uploads/arrete_prefectoral_mbarga.pdf', version: 1, folder: 'Pièces client', tags: 'arrete,administratif', documentType: 'arrete', mimeType: 'application/pdf', description: "Copie de l'arrêté préfectoral contesté - en attente de validation", status: 'en_attente', tenantId: t1.id, caseId: case8.id, uploadedById: uAche.id },
  ]});
  console.log('  ✅ Documents');

  // ═══════════════════════════════════════════════════════════════════════════
  // 19. DOCUMENT VERSIONS (v2 of conclusions)
  // ═══════════════════════════════════════════════════════════════════════════
  await db.documentVersion.create({ data: {
    version: 2, fileName: 'conclusions_kamga_v2.pdf', fileSize: 310000,
    filePath: '/uploads/conclusions_kamga_v2.pdf', mimeType: 'application/pdf',
    changeNote: 'Ajout des pièces complémentaires demandées par le tribunal',
    documentId: doc1.id, uploadedById: uNgassa.id,
  }});
  console.log('  ✅ Document versions');

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. CASE NOTES (with tenantId)
  // ═══════════════════════════════════════════════════════════════════════════
  await db.caseNote.createMany({ data: [
    { content: 'Première audience reportée. Le tribunal a demandé des pièces complémentaires.', caseId: case1.id, authorId: uNgassa.id, tenantId: t1.id, createdAt: daysAgo(5) },
    { content: 'Documents complémentaires collectés auprès du client. Prêts pour le dépôt.', caseId: case1.id, authorId: uFotso.id, tenantId: t1.id, createdAt: daysAgo(3) },
    { content: 'Le client a fourni le contrat de travail et les fiches de paie. Analyse en cours.', caseId: case2.id, authorId: uNgassa.id, tenantId: t1.id, createdAt: daysAgo(10) },
    { content: 'Dépôt de mémoire urgent. Client Hadj très préoccupé par les délais.', caseId: case3.id, authorId: uFotso.id, tenantId: t1.id, createdAt: daysAgo(2) },
    { content: "Ordonnance de référé obtenue! Le juge a suspendu l'exécution. Victoire partielle.", caseId: case6.id, authorId: uNgassa.id, tenantId: t1.id, createdAt: daysAgo(1) },
    { content: 'Témoin clé auditionné. Déclarations favorables à la défense.', caseId: case7.id, authorId: uFotso.id, tenantId: t1.id, createdAt: daysAgo(3) },
  ]});
  console.log('  ✅ Case notes');

  // ═══════════════════════════════════════════════════════════════════════════
  // 21. TASKS (correct fields: no userId/creatorId/completedAt)
  // ═══════════════════════════════════════════════════════════════════════════
  await db.task.createMany({ data: [
    { title: 'Vérifier dossier Kamga avant audience', description: 'Revoir toutes les pièces et préparer la trame argumentaire', status: 'en_cours_t', priority: 'urgente', dueDate: daysFromNow(1), tenantId: t1.id, caseId: case1.id, eventId: ev1.id },
    { title: 'Préparer conclusions récapitulatives', description: 'Rédiger les conclusions pour le dossier Kamga', status: 'a_faire', priority: 'haute', dueDate: daysFromNow(3), tenantId: t1.id, caseId: case1.id, eventId: ev7.id },
    { title: 'Dépôt mémoire défense Hadj', description: 'Finaliser et déposer le mémoire en défense', status: 'a_faire', priority: 'urgente', dueDate: daysFromNow(1), tenantId: t1.id, caseId: case3.id, eventId: ev3.id },
    { title: 'Préparer pièces audience Epee', description: "Rassembler tous les documents pour l'ordonnance de référé", status: 'a_faire', priority: 'urgente', dueDate: hoursFromNow(6), tenantId: t1.id, caseId: case6.id, eventId: ev6.id },
    { title: 'Rédiger mise en demeure complémentaire', description: 'Suite au non-paiement de la FAC-2025-003', status: 'en_cours_t', priority: 'haute', dueDate: daysFromNow(2), tenantId: t1.id, caseId: case3.id },
    { title: 'Relancer client Diallo pour paiement', description: 'Second rappel pour solde restant FAC-2025-002', status: 'a_faire', priority: 'normal', dueDate: daysFromNow(4), tenantId: t1.id, caseId: case2.id },
    { title: 'Préparer rendez-vous client Dupont', description: 'Vérifier les documents de constitution SARL', status: 'terminee', priority: 'basse', dueDate: daysFromNow(4), tenantId: t1.id, caseId: case5.id, eventId: ev4.id },
    { title: 'Archiver dossier Dupont', description: 'Classement définitif du dossier de constitution', status: 'terminee', priority: 'normal', tenantId: t1.id, caseId: case5.id },
    { title: 'Vérifier certificat Nkoulou', description: 'Confirmer authenticité du certificat de bonne conduite', status: 'a_faire', priority: 'haute', dueDate: daysFromNow(1), tenantId: t1.id, caseId: case7.id },
    { title: 'Rédiger requête administrative Mbarga', description: 'Préparer le recours contre l\'arrêté préfectoral', status: 'a_faire', priority: 'normal', dueDate: daysFromNow(5), tenantId: t1.id, caseId: case8.id },
    { title: 'Recherche jurisprudence foncière', description: 'Trouver des précédents similaires pour le dossier Kamga', status: 'a_faire', priority: 'haute', dueDate: daysFromNow(2), tenantId: t1.id, caseId: case1.id },
    { title: 'Préparer audience Ondo', description: 'Rassembler les pièces pour audience Libreville', status: 'a_faire', priority: 'haute', dueDate: daysFromNow(3), tenantId: t2.id, caseId: case10.id, eventId: ev10.id },
  ]});
  console.log('  ✅ Tasks');

  // ═══════════════════════════════════════════════════════════════════════════
  // 22. NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  await db.notification.createMany({ data: [
    { title: 'Audience dans 2 jours', message: 'Dossier Kamga — Audience TGI Douala prévue dans 48h.', category: 'dossier', resourceType: 'event', resourceId: ev1.id, tenantId: t1.id, userId: uNgassa.id },
    { title: 'Échéance dépôt mémoire demain', message: 'Le mémoire en défense du dossier Hadj doit être déposé demain.', category: 'dossier', resourceType: 'event', resourceId: ev3.id, tenantId: t1.id, userId: uFotso.id },
    { title: 'Référé Epee dans 12h', message: "Ordonnance de référé pour le dossier Epee c/ Société X dans 12 heures.", category: 'dossier', resourceType: 'event', resourceId: ev6.id, tenantId: t1.id, userId: uNgassa.id },
    { title: 'Facture impayée depuis 15 jours', message: 'La facture FAC-2025-003 de 750 000 FCFA est impayée.', category: 'dossier', resourceType: 'invoice', resourceId: inv3.id, tenantId: t1.id, userId: uMbeki.id },
    { title: 'Facture impayée depuis 5 jours', message: 'La facture FAC-2025-005 de 1 200 000 FCFA est impayée.', category: 'dossier', resourceType: 'invoice', resourceId: inv6.id, tenantId: t1.id, userId: uKamga.id },
    { title: 'Nouvelle tâche assignée', message: 'Vérifier le dossier Kamga avant audience.', category: 'dossier', resourceType: 'task', resourceId: '', tenantId: t1.id, userId: uNgassa.id },
    { title: 'Document en attente de validation', message: 'Le certificat de bonne conduite Nkoulou est en attente.', category: 'dossier', resourceType: 'document', resourceId: '', tenantId: t1.id, userId: uNgassa.id },
    { title: 'Audience pénale aujourd\'hui', message: 'Audience au Tribunal Correctionnel pour le dossier Nkoulou.', category: 'dossier', resourceType: 'event', resourceId: ev8.id, tenantId: t1.id, userId: uNgassa.id },
    { title: 'Message reçu', message: 'Tchinda Armand vous a envoyé un message.', category: 'message', tenantId: t1.id, userId: uNgassa.id },
  ]});
  console.log('  ✅ Notifications');

  // ═══════════════════════════════════════════════════════════════════════════
  // 23. MESSAGES (no isRead field in schema)
  // ═══════════════════════════════════════════════════════════════════════════
  await db.message.createMany({ data: [
    { content: "Bonjour, avez-vous les pièces pour l'audience de demain ?", tenantId: t1.id, senderId: uNgassa.id, receiverId: uFotso.id },
    { content: 'Oui, tout est prêt. Je vous les envoie par mail.', tenantId: t1.id, senderId: uFotso.id, receiverId: uNgassa.id },
    { content: 'Merci ! On se retrouve au tribunal à 8h30.', tenantId: t1.id, senderId: uNgassa.id, receiverId: uFotso.id },
    { content: 'Bien noté. À demain !', tenantId: t1.id, senderId: uFotso.id, receiverId: uNgassa.id },
    { content: 'Le client Kamga souhaite fixer un rendez-vous cette semaine.', tenantId: t1.id, senderId: uAche.id, receiverId: uNgassa.id },
    { content: 'Les conclusions pour Epee sont prêtes. Il faut les faire signer.', tenantId: t1.id, senderId: uTchinda.id, receiverId: uNgassa.id },
    { content: "J'ai préparé la mise en demeure Hadj. Peux-tu relancer ?", tenantId: t1.id, senderId: uTchinda.id, receiverId: uFotso.id },
    { content: 'Bien reçu, je m\'en occupe ce matin.', tenantId: t1.id, senderId: uFotso.id, receiverId: uTchinda.id },
  ]});
  console.log('  ✅ Messages');

  // ═══════════════════════════════════════════════════════════════════════════
  // 24. AUDIT LOGS
  // ═══════════════════════════════════════════════════════════════════════════
  await db.auditLog.createMany({ data: [
    { action: 'LOGIN', userId: uNgassa.id, tenantId: t1.id, ipAddress: '192.168.1.10', userAgent: 'Mozilla/5.0' },
    { action: 'CASE_CREATED', resourceType: 'case', resourceId: case6.id, userId: uNgassa.id, tenantId: t1.id, metadata: '{"title":"Litige commercial Epee"}', userAgent: 'Mozilla/5.0' },
    { action: 'INVOICE_CREATED', resourceType: 'invoice', resourceId: inv3.id, userId: uKamga.id, tenantId: t1.id, metadata: '{"amount":750000}', userAgent: 'Mozilla/5.0' },
    { action: 'CLIENT_CREATED', resourceType: 'client', resourceId: c6.id, userId: uAche.id, tenantId: t1.id, metadata: '{"name":"Pierre Epee"}', userAgent: 'Mozilla/5.0' },
    { action: 'DOCUMENT_UPLOADED', resourceType: 'document', userId: uFotso.id, tenantId: t1.id, metadata: '{"fileName":"titre_foncier_kamga.pdf"}', userAgent: 'Mozilla/5.0' },
    { action: 'TASK_CREATED', resourceType: 'task', userId: uNgassa.id, tenantId: t1.id, userAgent: 'Mozilla/5.0' },
    { action: 'CASE_VIEWED', resourceType: 'case', resourceId: case1.id, userId: uNgassa.id, tenantId: t1.id, userAgent: 'Mozilla/5.0' },
    { action: 'LOGIN', userId: uMbeki.id, tenantId: t1.id, ipAddress: '192.168.1.20', userAgent: 'Mozilla/5.0' },
    { action: 'PAYMENT_RECORDED', resourceType: 'payment', userId: uKamga.id, tenantId: t1.id, metadata: '{"amount":400000,"method":"virement"}', userAgent: 'Mozilla/5.0' },
    { action: 'EVENT_CREATED', resourceType: 'event', resourceId: ev8.id, userId: uNgassa.id, tenantId: t1.id, userAgent: 'Mozilla/5.0' },
  ]});
  console.log('  ✅ Audit logs');

  // ═══════════════════════════════════════════════════════════════════════════
  // 25. TIME ENTRIES
  // ═══════════════════════════════════════════════════════════════════════════
  await db.timeEntry.createMany({ data: [
    { description: 'Étude du dossier foncier Kamga', startTime: daysAgo(5), endTime: daysAgo(5), duration: 7200, isBillable: true, hourlyRate: 25000, totalAmount: 50000, tenantId: t1.id, userId: uNgassa.id, caseId: case1.id },
    { description: 'Rédaction conclusions Kamga', startTime: daysAgo(3), endTime: daysAgo(3), duration: 14400, isBillable: true, hourlyRate: 25000, totalAmount: 100000, tenantId: t1.id, userId: uNgassa.id, caseId: case1.id },
    { description: 'Consultation client Diallo', startTime: daysAgo(7), endTime: daysAgo(7), duration: 3600, isBillable: true, hourlyRate: 25000, totalAmount: 25000, tenantId: t1.id, userId: uNgassa.id, caseId: case2.id },
    { description: 'Recherche jurisprudence sociale', startTime: daysAgo(6), endTime: daysAgo(6), duration: 5400, isBillable: true, hourlyRate: 25000, totalAmount: 37500, tenantId: t1.id, userId: uFotso.id, caseId: case2.id },
    { description: 'Analyse factures Hadj', startTime: daysAgo(4), endTime: daysAgo(4), duration: 5400, isBillable: true, hourlyRate: 25000, totalAmount: 37500, tenantId: t1.id, userId: uTchinda.id, caseId: case3.id },
    { description: 'Préparation référé Epee', startTime: daysAgo(1), endTime: daysAgo(1), duration: 10800, isBillable: true, hourlyRate: 50000, totalAmount: 150000, tenantId: t1.id, userId: uNgassa.id, caseId: case6.id },
    { description: 'Préparation référé Epee', startTime: daysAgo(1), endTime: daysAgo(1), duration: 7200, isBillable: true, hourlyRate: 50000, totalAmount: 100000, tenantId: t1.id, userId: uFotso.id, caseId: case6.id },
    { description: 'Entretien client Nkoulou', startTime: daysAgo(3), endTime: daysAgo(3), duration: 3600, isBillable: true, hourlyRate: 25000, totalAmount: 25000, tenantId: t1.id, userId: uNgassa.id, caseId: case7.id },
    { description: 'Réunion interne - stratégie Epee', startTime: daysAgo(2), endTime: daysAgo(2), duration: 3600, isBillable: false, hourlyRate: 0, totalAmount: 0, tenantId: t1.id, userId: uNgassa.id },
  ]});
  console.log('  ✅ Time entries');

  // ═══════════════════════════════════════════════════════════════════════════
  // 26. DOCUMENT TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════
  await db.documentTemplate.createMany({ data: [
    { name: 'Assignation en justice', category: 'procedure', description: 'Modèle d\'assignation au fond', content: '<p>COUR D\'APPEL DE DOUALA</p><p>À l\'attention de Monsieur le Président</p><p>{{client_name}} demeurant à {{client_address}}...</p>', variables: 'client_name,client_address,adversary_name,tribunal,date', isActive: true, tenantId: t1.id },
    { name: 'Mise en demeure', category: 'correspondance', description: 'Modèle de lettre de mise en demeure', content: '<p>Lettre recommandée avec AR</p><p>Objet : Mise en demeure</p><p>{{client_name}} informe {{adversary_name}} que...</p>', variables: 'client_name,client_address,adversary_name,amount,date', isActive: true, tenantId: t1.id },
    { name: 'Conclusions récapitulatives', category: 'procedure', description: 'Modèle de conclusions', content: '<p>CONCLUSIONS</p><p>Pour {{client_name}}</p><p>CONTRE {{adversary_name}}</p><p>...</p>', variables: 'client_name,adversary_name,case_reference,tribunal', isActive: true, tenantId: t1.id },
    { name: 'Statuts SARL', category: 'societe', description: 'Modèle de statuts de SARL', content: '<p>STATUTS DE LA SOCIÉTÉ À RESPONSABILITÉ LIMITÉE</p><p>Dénomination sociale : {{company_name}}</p>...', variables: 'company_name,capital,siege,gerant,associes', isActive: true, tenantId: t1.id },
  ]});
  console.log('  ✅ Document templates');

  // ═══════════════════════════════════════════════════════════════════════════
  // 27. COMMUNICATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  await db.communication.createMany({ data: [
    { type: 'email', subject: 'Dossier Kamga - Pièces complémentaires', content: 'Bonjour Maître, voici les pièces complémentaires demandées par le tribunal...', status: 'sent', recipientEmail: 'j.kamga@email.com', sentAt: daysAgo(3), tenantId: t1.id, caseId: case1.id, clientId: c1.id, sentById: uNgassa.id },
    { type: 'email', subject: 'Rappel facture FAC-2025-003', content: 'Madame, Monsieur, nous vous rappelons que la facture FAC-2025-003 d\'un montant de 750 000 FCFA reste impayée...', status: 'sent', recipientEmail: 'i.hadj@email.com', sentAt: daysAgo(10), tenantId: t1.id, caseId: case3.id, clientId: c3.id, sentById: uKamga.id },
    { type: 'sms', subject: undefined, content: 'Rappel: votre audience est prévue demain à 8h30 au TGI Douala.', status: 'sent', recipientPhone: '+237 6 99 11 22', sentAt: daysAgo(1), tenantId: t1.id, caseId: case1.id, clientId: c1.id, sentById: uAche.id },
    { type: 'email', subject: 'Convocation - Réunion de préparation', content: 'Nous vous convions à une réunion de préparation du dossier le... à notre cabinet.', status: 'pending', recipientEmail: 'f.diallo@email.com', tenantId: t1.id, caseId: case2.id, clientId: c2.id, sentById: uNgassa.id },
    { type: 'email', subject: 'Mise en demeure - Dossier Hadj', content: 'Par la présente, nous mettons en demeure la société XYZ Trading de...', status: 'sent', recipientEmail: 'contact@xyztrading.com', sentAt: daysAgo(7), tenantId: t1.id, caseId: case3.id, clientId: c3.id, sentById: uFotso.id },
    { type: 'email', subject: 'Bienvenue sur JurisLink', content: 'Votre espace client est maintenant disponible. Vous pouvez suivre l\'avancement de votre dossier...', status: 'sent', recipientEmail: 'p.ondo@email.com', sentAt: daysAgo(15), tenantId: t2.id, caseId: case10.id, clientId: c9.id, sentById: uNdong.id },
  ]});
  console.log('  ✅ Communications');

  // ═══════════════════════════════════════════════════════════════════════════
  // 28. REMINDER LOGS
  // ═══════════════════════════════════════════════════════════════════════════
  await db.reminderLog.createMany({ data: [
    { level: 1, method: 'email', subject: '1re relance - Facture FAC-2025-002', content: 'Nous vous rappelons que la facture FAC-2025-002 d\'un montant de 300 000 FCFA...', status: 'sent', daysOverdue: 10, amountDue: 150000, invoiceId: inv2.id, tenantId: t1.id, sentById: uKamga.id },
    { level: 2, method: 'email', subject: '2e relance - Facture FAC-2025-003', content: 'Malgré notre précédente relance, la facture FAC-2025-003 d\'un montant de 750 000 FCFA...', status: 'sent', daysOverdue: 15, amountDue: 750000, invoiceId: inv3.id, tenantId: t1.id, sentById: uKamga.id },
    { level: 3, method: 'email', subject: '3e relance - Mise en demeure FAC-2025-005', content: 'En l\'absence de règlement, nous sommes contraints de vous adresser une mise en demeure...', status: 'sent', daysOverdue: 5, amountDue: 1200000, invoiceId: inv6.id, tenantId: t1.id, sentById: uKamga.id },
  ]});
  console.log('  ✅ Reminder logs');

  // ═══════════════════════════════════════════════════════════════════════════
  // 29. CLIENT PORTALS (with bcrypt-hashed password)
  // ═══════════════════════════════════════════════════════════════
  await db.clientPortal.createMany({ data: [
    { email: 'j.kamga@email.com', passwordHash: await h('Portal@123'), isActive: true, lastLoginAt: daysAgo(2), clientId: c1.id, tenantId: t1.id },
    { email: 'f.diallo@email.com', passwordHash: await h('Portal@123'), isActive: true, clientId: c2.id, tenantId: t1.id },
    { email: 'p.ondo@email.com', passwordHash: await h('Portal@123'), isActive: true, lastLoginAt: daysAgo(5), clientId: c9.id, tenantId: t2.id },
  ]});
  console.log('  ✅ Client portals');

  // ═══════════════════════════════════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n✅ Comprehensive seed complete!');
  console.log('\n📋 Credentials:');
  console.log('  Root Admin:   admin@jurislink.com / Admin@123');
  console.log('  Associé:      mbeki@jurislink.com / Admin@123');
  console.log('  Avocat:       ngassa@jurislink.com / Admin@123');
  console.log('  Avocat:       fotso@jurislink.com / Admin@123');
  console.log('  Juriste:      tchinda@jurislink.com / Admin@123');
  console.log('  Assistant:    ache@jurislink.com / Admin@123');
  console.log('  Comptable:    kamga.cpt@jurislink.com / Admin@123');
  console.log('  Associé T2:   ndong@jurislink.com / Admin@123');
  console.log('  Assistant T2: okoue@jurislink.com / Admin@123');
  console.log('\n  Client Portal: j.kamga@email.com / Portal@123');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
