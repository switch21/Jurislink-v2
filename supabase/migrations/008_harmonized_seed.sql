-- ============================================================
-- JURISLINK V2 — HARMONIZED SEED (matches current Prisma schema)
-- Part 1 of 2: clean + base data (currencies, plans, roles,
--   permissions, role_permissions, tenants, subscriptions)
-- ============================================================
SET ROLE postgres;
SET session_replication_role = 'replica';

-- ============================================================
-- 1. CLEAN all tables in FK-safe order
-- ============================================================
TRUNCATE TABLE
  reminder_logs,
  client_portals,
  communications,
  time_entries,
  document_templates,
  document_versions,
  audit_logs,
  messages,
  notifications,
  tasks,
  case_notes,
  payments,
  invoice_line_items,
  invoices,
  event_assignments,
  events,
  case_assignments,
  cases,
  clients,
  users,
  subscriptions,
  tenants,
  role_permissions,
  permissions,
  roles,
  currencies,
  subscription_plans
CASCADE;

-- ============================================================
-- 2. CURRENCIES (4 records)
-- ============================================================
INSERT INTO currencies (id, code, name, symbol, created_at, updated_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'XAF', 'Franc CFA (BEAC)',         'FCFA',  NOW(), NOW()),
  ('a1000000-0000-0000-0000-000000000002', 'XOF', 'Franc CFA (BCEAO)',        'FCFA',  NOW(), NOW()),
  ('a1000000-0000-0000-0000-000000000003', 'EUR', 'Euro',                     '€',     NOW(), NOW()),
  ('a1000000-0000-0000-0000-000000000004', 'USD', 'Dollar américain',         '$',     NOW(), NOW());

-- ============================================================
-- 3. SUBSCRIPTION PLANS (3 records)
-- ============================================================
INSERT INTO subscription_plans (
  id, name, slug, description,
  price_annual, price_semi_annual, price_quarterly, price_monthly,
  currency_code, max_users, max_storage_gb, has_ai, features,
  is_active, sort_order, created_at, updated_at
) VALUES
  ('a1000000-0001-0000-0000-000000000001',
   'Standard', 'standard', 'Idéal pour les petits cabinets',
   180000, 99000, 51750, 18000,
   'XAF', 3, 5, false,
   '["Gestion des dossiers","Gestion des clients","Agenda et échéances","Documents","Facturation de base","3 utilisateurs","5 Go stockage"]',
   true, 1, NOW(), NOW()),

  ('a1000000-0001-0000-0000-000000000002',
   'Premium', 'premium', 'Pour les cabinets en croissance',
   500000, 275000, 143750, 50000,
   'XAF', 9, 20, false,
   '["Tout le plan Standard","Rapports avancés","Recherche globale","Gestion des équipes","Workflow automatique","9 utilisateurs","20 Go stockage","Notifications email"]',
   true, 2, NOW(), NOW()),

  ('a1000000-0001-0000-0000-000000000003',
   'Entreprise', 'entreprise', 'Pour les grands cabinets',
   700000, 385000, 201250, 70000,
   'XAF', 999, 100, true,
   '["Tout le plan Premium","IA Juridique Copilot","Analyse de documents","Détection conflits","Utilisateurs illimités","100 Go stockage","API accès","Support prioritaire","Signature électronique"]',
   true, 3, NOW(), NOW());

-- ============================================================
-- 4. ROLES (8 records)
-- ============================================================
INSERT INTO roles (id, name, label, description, level, is_system, created_at, updated_at) VALUES
  ('a1000000-0002-0000-0000-000000000001', 'root_admin', 'Admin Racine',   'Super administrateur, gère tous les cabinets',           100, true, NOW(), NOW()),
  ('a1000000-0002-0000-0000-000000000002', 'firm_admin', 'Admin Cabinet',  'Administrateur du cabinet',                             70,  true, NOW(), NOW()),
  ('a1000000-0002-0000-0000-000000000003', 'associate',  'Associé',         'Accès complet à tous les dossiers du cabinet',            80,  true, NOW(), NOW()),
  ('a1000000-0002-0000-0000-000000000004', 'lawyer',     'Avocat',         'Accès à ses dossiers et dossiers autorisés',             50,  true, NOW(), NOW()),
  ('a1000000-0002-0000-0000-000000000005', 'jurist',     'Juriste',        'Dossiers attribués uniquement',                          40,  true, NOW(), NOW()),
  ('a1000000-0002-0000-0000-000000000006', 'assistant',  'Assistant',      'Agenda, tâches et documents autorisés',                   30,  true, NOW(), NOW()),
  ('a1000000-0002-0000-0000-000000000007', 'accountant', 'Comptable',      'Facturation et paiements',                                20,  true, NOW(), NOW()),
  ('a1000000-0002-0000-0000-000000000008', 'client',     'Client',         'Uniquement son espace client',                            10,  true, NOW(), NOW());

-- ============================================================
-- 5. PERMISSIONS (19 resources × 6 actions = 114 records)
--    Resources : case, client, document, invoice, task, event,
--               audit, user, report, setting, message, notification,
--               time_entry, document_template, payment, communication,
--               role, audit_log, subscription
--    Actions   : view, create, edit, delete, export, manage_permissions
--    UUID pattern: a1000000-0003-00RR-0000-00000000000A
--      RR = resource index (01-19), A = action index (1-6)
-- ============================================================

-- Resource 1: case
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0001-0000-000000000001', 'case_view',              'case', 'view',               'Voir les dossiers',               NOW()),
  ('a1000000-0003-0001-0000-000000000002', 'case_create',            'case', 'create',             'Créer un dossier',                NOW()),
  ('a1000000-0003-0001-0000-000000000003', 'case_edit',              'case', 'edit',               'Modifier un dossier',             NOW()),
  ('a1000000-0003-0001-0000-000000000004', 'case_delete',            'case', 'delete',             'Supprimer un dossier',            NOW()),
  ('a1000000-0003-0001-0000-000000000005', 'case_export',            'case', 'export',             'Exporter les dossiers',            NOW()),
  ('a1000000-0003-0001-0000-000000000006', 'case_manage_permissions','case', 'manage_permissions',  'Gérer permissions dossiers',       NOW());

-- Resource 2: client
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0002-0000-000000000001', 'client_view',              'client', 'view',               'Voir les clients',                NOW()),
  ('a1000000-0003-0002-0000-000000000002', 'client_create',            'client', 'create',             'Créer un client',                 NOW()),
  ('a1000000-0003-0002-0000-000000000003', 'client_edit',              'client', 'edit',               'Modifier un client',              NOW()),
  ('a1000000-0003-0002-0000-000000000004', 'client_delete',            'client', 'delete',             'Supprimer un client',             NOW()),
  ('a1000000-0003-0002-0000-000000000005', 'client_export',            'client', 'export',             'Exporter les clients',             NOW()),
  ('a1000000-0003-0002-0000-000000000006', 'client_manage_permissions','client', 'manage_permissions',  'Gérer permissions clients',        NOW());

-- Resource 3: document
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0003-0000-000000000001', 'document_view',              'document', 'view',               'Voir les documents',              NOW()),
  ('a1000000-0003-0003-0000-000000000002', 'document_create',            'document', 'create',             'Créer un document',               NOW()),
  ('a1000000-0003-0003-0000-000000000003', 'document_edit',              'document', 'edit',               'Modifier un document',            NOW()),
  ('a1000000-0003-0003-0000-000000000004', 'document_delete',            'document', 'delete',             'Supprimer un document',           NOW()),
  ('a1000000-0003-0003-0000-000000000005', 'document_export',            'document', 'export',             'Exporter les documents',           NOW()),
  ('a1000000-0003-0003-0000-000000000006', 'document_manage_permissions','document', 'manage_permissions',  'Gérer permissions documents',      NOW());

-- Resource 4: invoice
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0004-0000-000000000001', 'invoice_view',              'invoice', 'view',               'Voir les factures',               NOW()),
  ('a1000000-0003-0004-0000-000000000002', 'invoice_create',            'invoice', 'create',             'Créer une facture',               NOW()),
  ('a1000000-0003-0004-0000-000000000003', 'invoice_edit',              'invoice', 'edit',               'Modifier une facture',            NOW()),
  ('a1000000-0003-0004-0000-000000000004', 'invoice_delete',            'invoice', 'delete',             'Supprimer une facture',           NOW()),
  ('a1000000-0003-0004-0000-000000000005', 'invoice_export',            'invoice', 'export',             'Exporter les factures',            NOW()),
  ('a1000000-0003-0004-0000-000000000006', 'invoice_manage_permissions','invoice', 'manage_permissions',  'Gérer permissions factures',       NOW());

-- Resource 5: task
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0005-0000-000000000001', 'task_view',              'task', 'view',               'Voir les tâches',                 NOW()),
  ('a1000000-0003-0005-0000-000000000002', 'task_create',            'task', 'create',             'Créer une tâche',                 NOW()),
  ('a1000000-0003-0005-0000-000000000003', 'task_edit',              'task', 'edit',               'Modifier une tâche',              NOW()),
  ('a1000000-0003-0005-0000-000000000004', 'task_delete',            'task', 'delete',             'Supprimer une tâche',             NOW()),
  ('a1000000-0003-0005-0000-000000000005', 'task_export',            'task', 'export',             'Exporter les tâches',              NOW()),
  ('a1000000-0003-0005-0000-000000000006', 'task_manage_permissions','task', 'manage_permissions',  'Gérer permissions tâches',         NOW());

-- Resource 6: event
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0006-0000-000000000001', 'event_view',              'event', 'view',               'Voir les événements',             NOW()),
  ('a1000000-0003-0006-0000-000000000002', 'event_create',            'event', 'create',             'Créer un événement',              NOW()),
  ('a1000000-0003-0006-0000-000000000003', 'event_edit',              'event', 'edit',               'Modifier un événement',           NOW()),
  ('a1000000-0003-0006-0000-000000000004', 'event_delete',            'event', 'delete',             'Supprimer un événement',          NOW()),
  ('a1000000-0003-0006-0000-000000000005', 'event_export',            'event', 'export',             'Exporter les événements',          NOW()),
  ('a1000000-0003-0006-0000-000000000006', 'event_manage_permissions','event', 'manage_permissions',  'Gérer permissions événements',     NOW());

-- Resource 7: audit
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0007-0000-000000000001', 'audit_view',              'audit', 'view',               'Voir les audits',                 NOW()),
  ('a1000000-0003-0007-0000-000000000002', 'audit_create',            'audit', 'create',             'Créer un audit',                  NOW()),
  ('a1000000-0003-0007-0000-000000000003', 'audit_edit',              'audit', 'edit',               'Modifier un audit',               NOW()),
  ('a1000000-0003-0007-0000-000000000004', 'audit_delete',            'audit', 'delete',             'Supprimer un audit',              NOW()),
  ('a1000000-0003-0007-0000-000000000005', 'audit_export',            'audit', 'export',             'Exporter les audits',              NOW()),
  ('a1000000-0003-0007-0000-000000000006', 'audit_manage_permissions','audit', 'manage_permissions',  'Gérer permissions audits',         NOW());

-- Resource 8: user
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0008-0000-000000000001', 'user_view',              'user', 'view',               'Voir les utilisateurs',            NOW()),
  ('a1000000-0003-0008-0000-000000000002', 'user_create',            'user', 'create',             'Créer un utilisateur',             NOW()),
  ('a1000000-0003-0008-0000-000000000003', 'user_edit',              'user', 'edit',               'Modifier un utilisateur',          NOW()),
  ('a1000000-0003-0008-0000-000000000004', 'user_delete',            'user', 'delete',             'Supprimer un utilisateur',         NOW()),
  ('a1000000-0003-0008-0000-000000000005', 'user_export',            'user', 'export',             'Exporter les utilisateurs',        NOW()),
  ('a1000000-0003-0008-0000-000000000006', 'user_manage_permissions','user', 'manage_permissions',  'Gérer permissions utilisateurs',   NOW());

-- Resource 9: report
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0009-0000-000000000001', 'report_view',              'report', 'view',               'Voir les rapports',               NOW()),
  ('a1000000-0003-0009-0000-000000000002', 'report_create',            'report', 'create',             'Créer un rapport',                NOW()),
  ('a1000000-0003-0009-0000-000000000003', 'report_edit',              'report', 'edit',               'Modifier un rapport',             NOW()),
  ('a1000000-0003-0009-0000-000000000004', 'report_delete',            'report', 'delete',             'Supprimer un rapport',            NOW()),
  ('a1000000-0003-0009-0000-000000000005', 'report_export',            'report', 'export',             'Exporter les rapports',            NOW()),
  ('a1000000-0003-0009-0000-000000000006', 'report_manage_permissions','report', 'manage_permissions',  'Gérer permissions rapports',        NOW());

-- Resource 10: setting
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0010-0000-000000000001', 'setting_view',              'setting', 'view',               'Voir les paramètres',             NOW()),
  ('a1000000-0003-0010-0000-000000000002', 'setting_create',            'setting', 'create',             'Créer un paramètre',              NOW()),
  ('a1000000-0003-0010-0000-000000000003', 'setting_edit',              'setting', 'edit',               'Modifier un paramètre',           NOW()),
  ('a1000000-0003-0010-0000-000000000004', 'setting_delete',            'setting', 'delete',             'Supprimer un paramètre',          NOW()),
  ('a1000000-0003-0010-0000-000000000005', 'setting_export',            'setting', 'export',             'Exporter les paramètres',          NOW()),
  ('a1000000-0003-0010-0000-000000000006', 'setting_manage_permissions','setting', 'manage_permissions',  'Gérer permissions paramètres',     NOW());

-- Resource 11: message
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0011-0000-000000000001', 'message_view',              'message', 'view',               'Voir les messages',               NOW()),
  ('a1000000-0003-0011-0000-000000000002', 'message_create',            'message', 'create',             'Créer un message',                NOW()),
  ('a1000000-0003-0011-0000-000000000003', 'message_edit',              'message', 'edit',               'Modifier un message',             NOW()),
  ('a1000000-0003-0011-0000-000000000004', 'message_delete',            'message', 'delete',             'Supprimer un message',            NOW()),
  ('a1000000-0003-0011-0000-000000000005', 'message_export',            'message', 'export',             'Exporter les messages',            NOW()),
  ('a1000000-0003-0011-0000-000000000006', 'message_manage_permissions','message', 'manage_permissions',  'Gérer permissions messages',       NOW());

-- Resource 12: notification
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0012-0000-000000000001', 'notification_view',              'notification', 'view',               'Voir les notifications',          NOW()),
  ('a1000000-0003-0012-0000-000000000002', 'notification_create',            'notification', 'create',             'Créer une notification',          NOW()),
  ('a1000000-0003-0012-0000-000000000003', 'notification_edit',              'notification', 'edit',               'Modifier une notification',       NOW()),
  ('a1000000-0003-0012-0000-000000000004', 'notification_delete',            'notification', 'delete',             'Supprimer une notification',      NOW()),
  ('a1000000-0003-0012-0000-000000000005', 'notification_export',            'notification', 'export',             'Exporter les notifications',      NOW()),
  ('a1000000-0003-0012-0000-000000000006', 'notification_manage_permissions','notification', 'manage_permissions',  'Gérer permissions notifications',  NOW());

-- Resource 13: time_entry
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0013-0000-000000000001', 'time_entry_view',              'time_entry', 'view',               'Voir les temps',                  NOW()),
  ('a1000000-0003-0013-0000-000000000002', 'time_entry_create',            'time_entry', 'create',             'Créer un temps',                  NOW()),
  ('a1000000-0003-0013-0000-000000000003', 'time_entry_edit',              'time_entry', 'edit',               'Modifier un temps',               NOW()),
  ('a1000000-0003-0013-0000-000000000004', 'time_entry_delete',            'time_entry', 'delete',             'Supprimer un temps',              NOW()),
  ('a1000000-0003-0013-0000-000000000005', 'time_entry_export',            'time_entry', 'export',             'Exporter les temps',              NOW()),
  ('a1000000-0003-0013-0000-000000000006', 'time_entry_manage_permissions','time_entry', 'manage_permissions',  'Gérer permissions temps',          NOW());

-- Resource 14: document_template
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0014-0000-000000000001', 'document_template_view',              'document_template', 'view',               'Voir les modèles',                NOW()),
  ('a1000000-0003-0014-0000-000000000002', 'document_template_create',            'document_template', 'create',             'Créer un modèle',                 NOW()),
  ('a1000000-0003-0014-0000-000000000003', 'document_template_edit',              'document_template', 'edit',               'Modifier un modèle',              NOW()),
  ('a1000000-0003-0014-0000-000000000004', 'document_template_delete',            'document_template', 'delete',             'Supprimer un modèle',             NOW()),
  ('a1000000-0003-0014-0000-000000000005', 'document_template_export',            'document_template', 'export',             'Exporter les modèles',             NOW()),
  ('a1000000-0003-0014-0000-000000000006', 'document_template_manage_permissions','document_template', 'manage_permissions',  'Gérer permissions modèles',        NOW());

-- Resource 15: payment
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0015-0000-000000000001', 'payment_view',              'payment', 'view',               'Voir les paiements',              NOW()),
  ('a1000000-0003-0015-0000-000000000002', 'payment_create',            'payment', 'create',             'Créer un paiement',               NOW()),
  ('a1000000-0003-0015-0000-000000000003', 'payment_edit',              'payment', 'edit',               'Modifier un paiement',            NOW()),
  ('a1000000-0003-0015-0000-000000000004', 'payment_delete',            'payment', 'delete',             'Supprimer un paiement',           NOW()),
  ('a1000000-0003-0015-0000-000000000005', 'payment_export',            'payment', 'export',             'Exporter les paiements',           NOW()),
  ('a1000000-0003-0015-0000-000000000006', 'payment_manage_permissions','payment', 'manage_permissions',  'Gérer permissions paiements',      NOW());

-- Resource 16: communication
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0016-0000-000000000001', 'communication_view',              'communication', 'view',               'Voir les communications',         NOW()),
  ('a1000000-0003-0016-0000-000000000002', 'communication_create',            'communication', 'create',             'Créer une communication',         NOW()),
  ('a1000000-0003-0016-0000-000000000003', 'communication_edit',              'communication', 'edit',               'Modifier une communication',      NOW()),
  ('a1000000-0003-0016-0000-000000000004', 'communication_delete',            'communication', 'delete',             'Supprimer une communication',     NOW()),
  ('a1000000-0003-0016-0000-000000000005', 'communication_export',            'communication', 'export',             'Exporter les communications',      NOW()),
  ('a1000000-0003-0016-0000-000000000006', 'communication_manage_permissions','communication', 'manage_permissions',  'Gérer permissions communications', NOW());

-- Resource 17: role
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0017-0000-000000000001', 'role_view',              'role', 'view',               'Voir les rôles',                  NOW()),
  ('a1000000-0003-0017-0000-000000000002', 'role_create',            'role', 'create',             'Créer un rôle',                  NOW()),
  ('a1000000-0003-0017-0000-000000000003', 'role_edit',              'role', 'edit',               'Modifier un rôle',               NOW()),
  ('a1000000-0003-0017-0000-000000000004', 'role_delete',            'role', 'delete',             'Supprimer un rôle',              NOW()),
  ('a1000000-0003-0017-0000-000000000005', 'role_export',            'role', 'export',             'Exporter les rôles',              NOW()),
  ('a1000000-0003-0017-0000-000000000006', 'role_manage_permissions','role', 'manage_permissions',  'Gérer permissions rôles',         NOW());

-- Resource 18: audit_log
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0018-0000-000000000001', 'audit_log_view',              'audit_log', 'view',               'Voir les logs d''audit',          NOW()),
  ('a1000000-0003-0018-0000-000000000002', 'audit_log_create',            'audit_log', 'create',             'Créer un log d''audit',           NOW()),
  ('a1000000-0003-0018-0000-000000000003', 'audit_log_edit',              'audit_log', 'edit',               'Modifier un log d''audit',        NOW()),
  ('a1000000-0003-0018-0000-000000000004', 'audit_log_delete',            'audit_log', 'delete',             'Supprimer un log d''audit',       NOW()),
  ('a1000000-0003-0018-0000-000000000005', 'audit_log_export',            'audit_log', 'export',             'Exporter les logs d''audit',      NOW()),
  ('a1000000-0003-0018-0000-000000000006', 'audit_log_manage_permissions','audit_log', 'manage_permissions',  'Gérer permissions logs d''audit',  NOW());

-- Resource 19: subscription
INSERT INTO permissions (id, name, resource, action, description, created_at) VALUES
  ('a1000000-0003-0019-0000-000000000001', 'subscription_view',              'subscription', 'view',               'Voir les abonnements',            NOW()),
  ('a1000000-0003-0019-0000-000000000002', 'subscription_create',            'subscription', 'create',             'Créer un abonnement',             NOW()),
  ('a1000000-0003-0019-0000-000000000003', 'subscription_edit',              'subscription', 'edit',               'Modifier un abonnement',          NOW()),
  ('a1000000-0003-0019-0000-000000000004', 'subscription_delete',            'subscription', 'delete',             'Supprimer un abonnement',         NOW()),
  ('a1000000-0003-0019-0000-000000000005', 'subscription_export',            'subscription', 'export',             'Exporter les abonnements',         NOW()),
  ('a1000000-0003-0019-0000-000000000006', 'subscription_manage_permissions','subscription', 'manage_permissions',  'Gérer permissions abonnements',    NOW());

-- ============================================================
-- 6. ROLE PERMISSIONS (8 roles × 114 permissions = 912 records)
--    Matrix from seed-rbac.ts.  Uses CROSS JOIN + CASE to compute
--    allowed flag;  every role×permission combo is inserted.
--    UUID pattern: a1000000-0004-SSSS-0000-SSSSSSSSSSSS
--      (sequential counter, deterministic via ORDER BY)
-- ============================================================
INSERT INTO role_permissions (id, role_id, permission_id, allowed, created_at)
SELECT
  ('a1000000-0004-' || LPAD(seq::text, 4, '0') || '-0000-' || LPAD(seq::text, 12, '0'))::uuid,
  role_id,
  permission_id,
  CASE
    -- ── root_admin: all true EXCEPT manage_permissions for ──
    --   message, notification, time_entry, document_template,
    --   payment, communication, audit_log
    WHEN role_name = 'root_admin'
      AND NOT (action = 'manage_permissions'
               AND resource IN ('message','notification','time_entry',
                                'document_template','payment','communication',
                                'audit_log'))
    THEN true

    -- ── associate ──
    WHEN role_name = 'associate' AND (
      (resource IN ('case','client','invoice','task','event') AND action IN ('view','create','edit','export')) OR
      (resource = 'document' AND action IN ('view','create','edit','delete','export')) OR
      (resource = 'audit' AND action IN ('view','export')) OR
      (resource = 'user' AND action = 'view') OR
      (resource = 'report' AND action IN ('view','create','export')) OR
      (resource = 'setting' AND action = 'view') OR
      (resource = 'message' AND action IN ('view','create','edit','delete','export')) OR
      (resource = 'notification' AND action IN ('view','create','edit','export')) OR
      (resource = 'time_entry' AND action IN ('view','create','edit','export')) OR
      (resource = 'document_template' AND action IN ('view','create','edit','export')) OR
      (resource = 'payment' AND action IN ('view','create','edit','export')) OR
      (resource = 'communication' AND action IN ('view','create','edit','export')) OR
      (resource = 'role' AND action = 'view') OR
      (resource = 'audit_log' AND action IN ('view','export')) OR
      (resource = 'subscription' AND action = 'view')
    ) THEN true

    -- ── firm_admin  (same as associate + user:create+edit, setting:edit) ──
    WHEN role_name = 'firm_admin' AND (
      (resource IN ('case','client','invoice','task','event') AND action IN ('view','create','edit','export')) OR
      (resource = 'document' AND action IN ('view','create','edit','delete','export')) OR
      (resource = 'audit' AND action IN ('view','export')) OR
      (resource = 'user' AND action IN ('view','create','edit')) OR
      (resource = 'report' AND action IN ('view','create','export')) OR
      (resource = 'setting' AND action IN ('view','edit')) OR
      (resource = 'message' AND action IN ('view','create','edit','delete','export')) OR
      (resource = 'notification' AND action IN ('view','create','edit','export')) OR
      (resource = 'time_entry' AND action IN ('view','create','edit','export')) OR
      (resource = 'document_template' AND action IN ('view','create','edit','export')) OR
      (resource = 'payment' AND action IN ('view','create','edit','export')) OR
      (resource = 'communication' AND action IN ('view','create','edit','export')) OR
      (resource = 'role' AND action = 'view') OR
      (resource = 'audit_log' AND action IN ('view','export')) OR
      (resource = 'subscription' AND action = 'view')
    ) THEN true

    -- ── lawyer ──
    WHEN role_name = 'lawyer' AND (
      (resource IN ('case','client','task','event','message','notification','time_entry','communication') AND action IN ('view','create','edit','export')) OR
      (resource = 'document' AND action IN ('view','create','edit','delete','export')) OR
      (resource = 'invoice' AND action IN ('view','export')) OR
      (resource = 'user' AND action = 'view') OR
      (resource = 'report' AND action IN ('view','export')) OR
      (resource = 'document_template' AND action = 'view') OR
      (resource = 'payment' AND action = 'view')
    ) THEN true

    -- ── jurist ──
    WHEN role_name = 'jurist' AND (
      (resource = 'case' AND action IN ('view','edit','export')) OR
      (resource = 'client' AND action = 'view') OR
      (resource = 'document' AND action IN ('view','create','edit','export')) OR
      (resource = 'task' AND action IN ('view','edit','export')) OR
      (resource IN ('event','user','message','notification','document_template','communication') AND action = 'view') OR
      (resource = 'report' AND action IN ('view','export')) OR
      (resource = 'time_entry' AND action IN ('view','edit'))
    ) THEN true

    -- ── assistant ──
    WHEN role_name = 'assistant' AND (
      (resource IN ('case','client') AND action IN ('view','edit','export')) OR
      (resource IN ('document','task','event') AND action IN ('view','create','edit','export')) OR
      (resource = 'user' AND action = 'view') OR
      (resource IN ('message','notification','communication','document_template') AND action = 'view') OR
      (resource = 'time_entry' AND action IN ('view','create','edit'))
    ) THEN true

    -- ── accountant ──
    WHEN role_name = 'accountant' AND (
      (resource = 'case' AND action = 'view') OR
      (resource = 'client' AND action IN ('view','export')) OR
      (resource IN ('document','invoice') AND action IN ('view','create','edit','export')) OR
      (resource = 'task' AND action = 'view') OR
      (resource = 'report' AND action IN ('view','create','export')) OR
      (resource IN ('time_entry','payment') AND action IN ('view','create','edit')) OR
      (resource = 'document_template' AND action = 'view')
    ) THEN true

    -- ── client ──
    WHEN role_name = 'client' AND (
      (resource IN ('case','document','invoice') AND action IN ('view','export')) OR
      (resource = 'event' AND action = 'view') OR
      (resource = 'message' AND action IN ('view','create')) OR
      (resource IN ('notification','payment') AND action = 'view') OR
      (resource = 'communication' AND action IN ('view','create'))
    ) THEN true

    -- Everything else is false
    ELSE false
  END AS allowed,
  NOW()
FROM (
  SELECT
    ROW_NUMBER() OVER (ORDER BY r.name, p.resource, p.action) - 1 AS seq,
    r.id   AS role_id,
    r.name AS role_name,
    p.id   AS permission_id,
    p.resource,
    p.action
  FROM roles r
  CROSS JOIN permissions p
) t;

-- ============================================================
-- 7. TENANTS (2 records)
-- ============================================================
INSERT INTO tenants (
  id, name, slug, logo_url, language, timezone,
  phone, email, address, niu, city, country,
  currency_code, plan, max_users, max_storage_gb,
  is_active, created_at, updated_at
) VALUES
  ('a1000000-0005-0000-0000-000000000001',
   'Cabinet Mbeki & Associés',
   'cabinet-mbeki-associes',
   NULL,
   'fr', 'Africa/Douala',
   '+237 233 456 789', 'contact@mbeki-associes.cm',
   '45 Rue Joss', 'CAM-2024-001',
   'Douala', 'Cameroun',
   'XAF', 'premium', 9, 20,
   true, NOW(), NOW()),

  ('a1000000-0005-0000-0000-000000000002',
   'Etude Ndong Avocats',
   'etude-ndong-avocats',
   NULL,
   'fr', 'Africa/Libreville',
   '+241 01 44 56 78', 'contact@ndong-avocats.ga',
   '12 Blvd de la Libération', 'GAB-2024-001',
   'Libreville', 'Gabon',
   'XAF', 'starter', 3, 5,
   true, NOW(), NOW());

-- ============================================================
-- 8. SUBSCRIPTIONS (2 records)
-- ============================================================
INSERT INTO subscriptions (
  id, tenant_id, plan_id, status, billing_period,
  current_period_start, current_period_end,
  trial_ends_at, created_at, updated_at
) VALUES
  ('a1000000-0006-0000-0000-000000000001',
   'a1000000-0005-0000-0000-000000000001',   -- Cabinet Mbeki
   'a1000000-0001-0000-0000-000000000002',   -- Premium plan
   'active', 'annual',
   NOW(), NOW() + INTERVAL '1 year',
   NULL, NOW(), NOW()),

  ('a1000000-0006-0000-0000-000000000002',
   'a1000000-0005-0000-0000-000000000002',   -- Etude Ndong
   'a1000000-0001-0000-0000-000000000001',   -- Standard plan
   'active', 'annual',
   NOW(), NOW() + INTERVAL '1 year',
   NULL, NOW(), NOW());

-- ============================================================
SET session_replication_role = 'origin';
