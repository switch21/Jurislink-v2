-- ============================================================
-- Phase 19+20: SaaS Monétisation & Sécurité Maximale
-- JurisLink Schema Migration (PostgreSQL / Supabase)
-- ============================================================

SET ROLE postgres;
BEGIN;

-- ═══════════════════════════════════════════════════════
-- 1. SUBSCRIPTION_PLANS: ajouter max_cases
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_cases INT NOT NULL DEFAULT 50;

-- ═══════════════════════════════════════════════════════
-- 2. PRIVACY_CONSENTS: table pour le consentement
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.privacy_consent_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address  TEXT,
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS privacy_consent_logs_user_idx ON public.privacy_consent_logs(user_id);
CREATE INDEX IF NOT EXISTS privacy_consent_logs_tenant_idx ON public.privacy_consent_logs(tenant_id);

-- ═══════════════════════════════════════════════════════
-- 3. DATA_EXPORT_REQUESTS: suivi des exports (Loi 2024/017)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending',
  file_path   TEXT,
  completed_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- 4. ENCRYPTION_KEY: colonne sur documents pour tracking
--    (la clé AES est stockée dans les variables d'env, pas en DB)
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS encryption_iv TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN NOT NULL DEFAULT false;

COMMIT;

SELECT 'OK: Phase 19+20 migration terminée' AS result;