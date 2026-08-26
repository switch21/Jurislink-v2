-- ============================================================
-- Migration 004 — Index performance (revises)
-- 8 index manquants (3 existaient deja dans le schema)
-- Utilise IF NOT EXISTS pour etre idempotent
-- Non-destructif
-- ============================================================

BEGIN;

-- users : filtrer par cabinet et role
CREATE INDEX IF NOT EXISTS idx_users_tenant_role 
ON users(tenant_id, role);

-- cases : filtrer par statut
CREATE INDEX IF NOT EXISTS idx_cases_tenant_status 
ON cases(tenant_id, status);

-- cases : dossiers d'un client
CREATE INDEX IF NOT EXISTS idx_cases_tenant_client 
ON cases(tenant_id, client_id);

-- clients : recherche par nom
CREATE INDEX IF NOT EXISTS idx_clients_tenant_name 
ON clients(tenant_id, full_name);

-- documents : documents d'un dossier
CREATE INDEX IF NOT EXISTS idx_documents_tenant_case 
ON documents(tenant_id, case_id);

-- events : evenements par date
CREATE INDEX IF NOT EXISTS idx_events_tenant_start 
ON events(tenant_id, start_time);

-- notifications : notifications non lues
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, read);

-- messages : messages non lus
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read 
ON messages(tenant_id, receiver_id, read_status);

COMMIT;