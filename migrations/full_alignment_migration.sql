-- ============================================================
-- MIGRATION D'ALIGNEMENT COMPLÈTE : Prisma Schema ↔ Supabase DB
-- ============================================================
-- Cette migration ajoute TOUTES les colonnes manquantes,
-- renomme les colonnes mal nommées, et corrige les types.
-- IDEMPOTENTE : peut être réexécutée sans danger.
-- 
-- ⚠️ Exécuter dans l'éditeur SQL Supabase avec SET ROLE postgres;
-- ============================================================

SET ROLE postgres;
BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. INVOICES — colonnes manquantes + corrections
-- ══════════════════════════════════════════════════════════════
-- 1a. Ajouter les colonnes manquantes
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'facture';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS billing_type TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS reminder_level INT NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;

-- 1b. Si issue_date existe mais pas issued_at, copier les données
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='issue_date')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='issued_at') THEN
    -- Ajouter issued_at d'abord
    ALTER TABLE public.invoices ADD COLUMN issued_at TIMESTAMPTZ;
    -- Copier les données
    UPDATE public.invoices SET issued_at = issue_date WHERE issue_date IS NOT NULL;
  END IF;
END $$;

-- 1c. Rendre currency_id nullable (Prisma l'attend optionnel)
DO $$
BEGIN
  ALTER TABLE public.invoices ALTER COLUMN currency_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 1d. Rendre case_id nullable (Prisma l'attend optionnel)
DO $$
BEGIN
  ALTER TABLE public.invoices ALTER COLUMN case_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 2. AUDIT_LOGS — renommer created_at → timestamp
-- ══════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Si la colonne timestamp n'existe pas, la créer (ou renommer created_at)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='timestamp') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='created_at') THEN
      ALTER TABLE public.audit_logs RENAME COLUMN created_at TO timestamp;
    ELSE
      ALTER TABLE public.audit_logs ADD COLUMN timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2b. Corriger le type de metadata : JSONB → TEXT (Prisma attend String)
DO $$
BEGIN
  ALTER TABLE public.audit_logs ALTER COLUMN metadata TYPE TEXT USING metadata::TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2c. Corriger resource_id : UUID → TEXT (Prisma attend String?)
DO $$
BEGIN
  ALTER TABLE public.audit_logs ALTER COLUMN resource_id TYPE TEXT USING resource_id::TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 3. DOCUMENTS — corrections de colonnes
-- ══════════════════════════════════════════════════════════════
-- 3a. Renommer uploader_id → uploaded_by_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='uploader_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='uploaded_by_id') THEN
    ALTER TABLE public.documents RENAME COLUMN uploader_id TO uploaded_by_id;
  END IF;
  -- Si aucun des deux n'existe, créer uploaded_by_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='uploaded_by_id') THEN
    ALTER TABLE public.documents ADD COLUMN uploaded_by_id UUID;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3b. Rendre uploaded_by_id nullable
DO $$
BEGIN
  ALTER TABLE public.documents ALTER COLUMN uploaded_by_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3c. Corriger le type de tags : TEXT[] → TEXT
DO $$
BEGIN
  ALTER TABLE public.documents ALTER COLUMN tags TYPE TEXT USING array_to_string(tags, ',');
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3d. Ajouter colonnes manquantes
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'actif';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'autre';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS folder TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS uploaded_by_portal_id UUID;

-- 3e. Rendre file_path et file_size nullable
DO $$ BEGIN ALTER TABLE public.documents ALTER COLUMN file_path DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.documents ALTER COLUMN file_size DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.documents ALTER COLUMN mime_type DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.documents ALTER COLUMN version DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.documents ALTER COLUMN is_confidential DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;

-- 3f. FK pour uploaded_by_portal_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'documents_uploaded_by_portal_id_fkey') THEN
    ALTER TABLE public.documents ADD CONSTRAINT documents_uploaded_by_portal_id_fkey
      FOREIGN KEY (uploaded_by_portal_id) REFERENCES public.client_portals(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 4. TASKS — corrections
-- ══════════════════════════════════════════════════════════════
-- 4a. Ajouter assigned_to_id (distinct de assignee_id)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to_id UUID;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tasks_assigned_to_id_fkey') THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_assigned_to_id_fkey
      FOREIGN KEY (assigned_to_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to_id);

-- 4b. Rendre case_id nullable (Prisma l'attend optionnel)
DO $$
BEGIN
  ALTER TABLE public.tasks ALTER COLUMN case_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 5. CASES — colonnes manquantes
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS is_secret BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS ai_analysis TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS next_due_date DATE;

-- ══════════════════════════════════════════════════════════════
-- 6. EVENTS — colonnes manquantes (phase16_17)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS external_event_id TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS all_day BOOLEAN NOT NULL DEFAULT false;

-- ══════════════════════════════════════════════════════════════
-- 7. PAYMENTS — colonnes manquantes
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS recorded_by UUID;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payments_recorded_by_fkey') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_recorded_by_fkey
      FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 8. CURRENCIES — ajouter tenant_id
-- ══════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='currencies' AND column_name='tenant_id') THEN
    ALTER TABLE public.currencies ADD COLUMN tenant_id UUID;
    ALTER TABLE public.currencies ADD CONSTRAINT currencies_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
    -- Supprimer l'index unique sur code seul s'il existe
    -- et créer un index unique composite (code, tenant_id)
    DROP INDEX IF EXISTS currencies_code_idx;
    CREATE UNIQUE INDEX IF NOT EXISTS currencies_code_tenant_idx ON public.currencies (code, tenant_id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 9. CASE_NOTES — renommer user_id → author_id
-- ══════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_notes' AND column_name='user_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_notes' AND column_name='author_id') THEN
    ALTER TABLE public.case_notes RENAME COLUMN user_id TO author_id;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 10. PHASE 14/15 : colonnes facturation avancée
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_rate DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- ══════════════════════════════════════════════════════════════
-- 11. PHASE 16/17 : portal_notifications + external_calendars
-- ══════════════════════════════════════════════════════════════
-- 11a. portal_notifications
CREATE TABLE IF NOT EXISTS public.portal_notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  message       TEXT        NOT NULL,
  category      TEXT        NOT NULL DEFAULT 'dossier',
  read          BOOLEAN     NOT NULL DEFAULT false,
  resource_type TEXT,
  resource_id   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  portal_id     UUID        NOT NULL,
  tenant_id     UUID        NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'portal_notifications_portal_id_fkey') THEN
    ALTER TABLE public.portal_notifications ADD CONSTRAINT portal_notifications_portal_id_fkey
      FOREIGN KEY (portal_id) REFERENCES public.client_portals(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'portal_notifications_tenant_id_fkey') THEN
    ALTER TABLE public.portal_notifications ADD CONSTRAINT portal_notifications_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS portal_notifications_portal_id_idx ON public.portal_notifications (portal_id);
CREATE INDEX IF NOT EXISTS portal_notifications_tenant_id_idx ON public.portal_notifications (tenant_id);

-- 11b. external_calendars
CREATE TABLE IF NOT EXISTS public.external_calendars (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider       TEXT        NOT NULL,
  access_token   TEXT        NOT NULL,
  refresh_token  TEXT,
  token_expiry   TIMESTAMPTZ,
  calendar_id    TEXT,
  calendar_email TEXT,
  sync_enabled   BOOLEAN     NOT NULL DEFAULT true,
  last_sync_at   TIMESTAMPTZ,
  sync_direction TEXT        NOT NULL DEFAULT 'bidirectional',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id        UUID        NOT NULL,
  tenant_id      UUID        NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'external_calendars_user_id_fkey') THEN
    ALTER TABLE public.external_calendars ADD CONSTRAINT external_calendars_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'external_calendars_tenant_id_fkey') THEN
    ALTER TABLE public.external_calendars ADD CONSTRAINT external_calendars_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 12. TIME_ENTRIES — colonnes facturation
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS billed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS invoice_id UUID;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'time_entries_invoice_id_fkey') THEN
    ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_time_entries_billed ON public.time_entries(tenant_id, billed);
CREATE INDEX IF NOT EXISTS idx_time_entries_invoice_id ON public.time_entries(invoice_id);

-- ══════════════════════════════════════════════════════════════
-- 13. INDEX manquants pour le dashboard
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS invoices_type_idx ON public.invoices(type);
CREATE INDEX IF NOT EXISTS invoices_issued_at_idx ON public.invoices(issued_at);
CREATE INDEX IF NOT EXISTS invoices_paid_at_idx ON public.invoices(paid_at);
CREATE INDEX IF NOT EXISTS invoices_reminder_level_idx ON public.invoices(reminder_level);
CREATE INDEX IF NOT EXISTS cases_status_idx ON public.cases(status);
CREATE INDEX IF NOT EXISTS cases_tenant_id_idx ON public.cases(tenant_id);
CREATE INDEX IF NOT EXISTS payments_paid_at_idx ON public.payments(paid_at);
CREATE INDEX IF NOT EXISTS events_start_time_idx ON public.events(start_time);
CREATE INDEX IF NOT EXISTS events_tenant_id_idx ON public.events(tenant_id);

COMMIT;

-- ============================================================
-- VÉRIFICATION
-- ============================================================
SELECT 'invoices' AS tbl, column_name, data_type, is_nullable
FROM information_schema.columns WHERE table_name = 'invoices'
  AND column_name IN ('invoice_number','type','paid_amount','issued_at','billing_type','reminder_level','last_reminder_at','tax_rate','discount_amount','terms','paid_at')
ORDER BY column_name;

SELECT 'audit_logs' AS tbl, column_name, data_type
FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'timestamp';

SELECT 'documents' AS tbl, column_name, data_type, is_nullable
FROM information_schema.columns WHERE table_name = 'documents'
  AND column_name IN ('uploaded_by_id','description','status','document_type','folder','uploaded_by_portal_id')
ORDER BY column_name;

SELECT 'tasks' AS tbl, column_name, data_type, is_nullable
FROM information_schema.columns WHERE table_name = 'tasks'
  AND column_name IN ('assigned_to_id')
ORDER BY column_name;

SELECT 'events' AS tbl, column_name, data_type
FROM information_schema.columns WHERE table_name = 'events'
  AND column_name IN ('location','external_event_id','all_day')
ORDER BY column_name;

SELECT 'OK: Migration terminée avec succès' AS result;
