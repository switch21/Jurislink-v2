-- Roles
INSERT INTO roles (id,name,label,description,level,is_system,created_at,updated_at) VALUES
('a0000000-0000-0000-0000-000000000001','root_admin','Admin Racine','Super administrateur',100,true,NOW(),NOW()),
('a0000000-0000-0000-0000-000000000002','associate','Associé','Accès complet aux dossiers',80,true,NOW(),NOW()),
('a0000000-0000-0000-0000-000000000003','firm_admin','Admin Cabinet','Administrateur du cabinet',70,true,NOW(),NOW()),
('a0000000-0000-0000-0000-000000000004','lawyer','Avocat','Ses dossiers et autorisés',50,true,NOW(),NOW()),
('a0000000-0000-0000-0000-000000000005','jurist','Juriste','Dossiers attribués',40,true,NOW(),NOW()),
('a0000000-0000-0000-0000-000000000006','assistant','Assistant','Agenda, tâches, documents',30,true,NOW(),NOW()),
('a0000000-0000-0000-0000-000000000007','accountant','Comptable','Facturation et paiements',20,true,NOW(),NOW()),
('a0000000-0000-0000-0000-000000000008','client','Client','Son espace client',10,true,NOW(),NOW())
ON CONFLICT (name) DO NOTHING;

-- Permissions (12 resources × 6 actions = 72)
INSERT INTO permissions (name,resource,action,created_at) VALUES
('case_view','case','view',NOW()),('case_create','case','create',NOW()),('case_edit','case','edit',NOW()),('case_delete','case','delete',NOW()),('case_export','case','export',NOW()),('case_manage_permissions','case','manage_permissions',NOW()),
('client_view','client','view',NOW()),('client_create','client','create',NOW()),('client_edit','client','edit',NOW()),('client_delete','client','delete',NOW()),('client_export','client','export',NOW()),('client_manage_permissions','client','manage_permissions',NOW()),
('document_view','document','view',NOW()),('document_create','document','create',NOW()),('document_edit','document','edit',NOW()),('document_delete','document','delete',NOW()),('document_export','document','export',NOW()),('document_manage_permissions','document','manage_permissions',NOW()),
('invoice_view','invoice','view',NOW()),('invoice_create','invoice','create',NOW()),('invoice_edit','invoice','edit',NOW()),('invoice_delete','invoice','delete',NOW()),('invoice_export','invoice','export',NOW()),('invoice_manage_permissions','invoice','manage_permissions',NOW()),
('task_view','task','view',NOW()),('task_create','task','create',NOW()),('task_edit','task','edit',NOW()),('task_delete','task','delete',NOW()),('task_export','task','export',NOW()),('task_manage_permissions','task','manage_permissions',NOW()),
('event_view','event','view',NOW()),('event_create','event','create',NOW()),('event_edit','event','edit',NOW()),('event_delete','event','delete',NOW()),('event_export','event','export',NOW()),('event_manage_permissions','event','manage_permissions',NOW()),
('audit_view','audit','view',NOW()),('audit_create','audit','create',NOW()),('audit_edit','audit','edit',NOW()),('audit_delete','audit','delete',NOW()),('audit_export','audit','export',NOW()),('audit_manage_permissions','audit','manage_permissions',NOW()),
('user_view','user','view',NOW()),('user_create','user','create',NOW()),('user_edit','user','edit',NOW()),('user_delete','user','delete',NOW()),('user_export','user','export',NOW()),('user_manage_permissions','user','manage_permissions',NOW()),
('report_view','report','view',NOW()),('report_create','report','create',NOW()),('report_edit','report','edit',NOW()),('report_delete','report','delete',NOW()),('report_export','report','export',NOW()),('report_manage_permissions','report','manage_permissions',NOW()),
('setting_view','setting','view',NOW()),('setting_create','setting','create',NOW()),('setting_edit','setting','edit',NOW()),('setting_delete','setting','delete',NOW()),('setting_export','setting','export',NOW()),('setting_manage_permissions','setting','manage_permissions',NOW()),
('message_view','message','view',NOW()),('message_create','message','create',NOW()),('message_edit','message','edit',NOW()),('message_delete','message','delete',NOW()),('message_export','message','export',NOW()),('message_manage_permissions','message','manage_permissions',NOW()),
('notification_view','notification','view',NOW()),('notification_create','notification','create',NOW()),('notification_edit','notification','edit',NOW()),('notification_delete','notification','delete',NOW()),('notification_export','notification','export',NOW()),('notification_manage_permissions','notification','manage_permissions',NOW())
ON CONFLICT (name) DO NOTHING;

-- Subscription plans
INSERT INTO subscription_plans (id,name,slug,description,price_annual,price_semi_annual,price_quarterly,price_monthly,currency_code,max_users,max_storage_gb,has_ai,features,is_active,sort_order,created_at,updated_at) VALUES
('b0000000-0000-0000-0000-000000000001','Standard','standard','Idéal pour les petits cabinets',180000,99000,51750,18000,'XAF',3,5,false,'["Gestion des dossiers","Gestion des clients","Agenda et échéances","Documents","Facturation de base","3 utilisateurs","5 Go stockage"]',true,1,NOW(),NOW()),
('b0000000-0000-0000-0000-000000000002','Premium','premium','Pour les cabinets en croissance',500000,275000,143750,50000,'XAF',9,20,false,'["Tout le plan Standard","Rapports avancés","Recherche globale","Gestion des équipes","Workflow automatique","9 utilisateurs","20 Go stockage","Notifications email"]',true,2,NOW(),NOW()),
('b0000000-0000-0000-0000-000000000003','Entreprise','entreprise','Pour les grands cabinets',700000,385000,201250,70000,'XAF',999,100,true,'["Tout le plan Premium","IA Juridique Copilot","Analyse de documents","Détection conflits","Utilisateurs illimités","100 Go stockage","API accès","Support prioritaire","Signature électronique"]',true,3,NOW(),NOW())
ON CONFLICT (slug) DO NOTHING;

-- Link users to roles
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = users.role) WHERE role_id IS NULL;

-- Subscriptions for tenants without one
INSERT INTO subscriptions (tenant_id, plan_id, status, billing_period, current_period_start, current_period_end, created_at, updated_at)
SELECT t.id, 'b0000000-0000-0000-0000-000000000001', 'active', 'annual', NOW(), NOW() + INTERVAL '1 year', NOW(), NOW()
FROM tenants t WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.tenant_id = t.id);
