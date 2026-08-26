-- ============================================================
-- Migration 003 — Colonnes manquantes pour V2
-- 17 colonnes ADD COLUMN IF NOT EXISTS
-- Non-destructif : toutes les nouvelles colonnes sont NULLABLE
--   ou ont des valeurs par defaut
-- ============================================================

BEGIN;

-- ==================== CASES ====================
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reference varchar(50);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_type varchar(100);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS priority varchar(20) DEFAULT 'normal';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS assigned_lawyer_id uuid REFERENCES users(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS next_deadline timestamptz;

-- ==================== CLIENTS ====================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS responsible_lawyer_id uuid REFERENCES users(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'active';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- ==================== NOTIFICATIONS ====================
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category varchar(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS resource_type varchar(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS resource_id uuid;

-- ==================== AUDIT LOGS ====================
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address varchar(45);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent text;

-- ==================== DOCUMENTS ====================
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type varchar(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_confidential boolean DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMIT;