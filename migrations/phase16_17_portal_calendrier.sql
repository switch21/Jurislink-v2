-- ============================================================
-- Phase 16+17: Portal Notifications & External Calendar Sync
-- JurisLink Schema Migration (PostgreSQL / Supabase)
-- ============================================================

BEGIN;

-- -----------------------------------------------------------
-- 1. ALTER TABLE: events — add location, external_event_id, all_day
-- -----------------------------------------------------------
ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "location"         TEXT,
  ADD COLUMN IF NOT EXISTS "external_event_id" TEXT,
  ADD COLUMN IF NOT EXISTS "all_day"          BOOLEAN NOT NULL DEFAULT false;

-- -----------------------------------------------------------
-- 2. ALTER TABLE: documents — add uploaded_by_portal_id (FK)
-- -----------------------------------------------------------
ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "uploaded_by_portal_id" UUID;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_uploaded_by_portal_id_fkey"
    FOREIGN KEY ("uploaded_by_portal_id") REFERENCES "client_portals"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- -----------------------------------------------------------
-- 3. CREATE TABLE: portal_notifications
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "portal_notifications" (
  "id"            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "title"         TEXT        NOT NULL,
  "message"       TEXT        NOT NULL,
  "category"      TEXT        NOT NULL DEFAULT 'dossier',
  "read"          BOOLEAN     NOT NULL DEFAULT false,
  "resource_type" TEXT,
  "resource_id"   TEXT,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "portal_id"     UUID        NOT NULL,
  "tenant_id"     UUID        NOT NULL
);

-- FK: portal_notifications -> client_portals
ALTER TABLE "portal_notifications"
  ADD CONSTRAINT "portal_notifications_portal_id_fkey"
    FOREIGN KEY ("portal_id") REFERENCES "client_portals"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- FK: portal_notifications -> tenants
ALTER TABLE "portal_notifications"
  ADD CONSTRAINT "portal_notifications_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- Indexes for portal_notifications
CREATE INDEX IF NOT EXISTS "portal_notifications_portal_id_idx" ON "portal_notifications" ("portal_id");
CREATE INDEX IF NOT EXISTS "portal_notifications_tenant_id_idx" ON "portal_notifications" ("tenant_id");

-- -----------------------------------------------------------
-- 4. CREATE TABLE: external_calendars
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "external_calendars" (
  "id"             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider"       TEXT        NOT NULL,
  "access_token"   TEXT        NOT NULL,
  "refresh_token"  TEXT,
  "token_expiry"   TIMESTAMPTZ,
  "calendar_id"    TEXT,
  "calendar_email" TEXT,
  "sync_enabled"   BOOLEAN     NOT NULL DEFAULT true,
  "last_sync_at"   TIMESTAMPTZ,
  "sync_direction" TEXT        NOT NULL DEFAULT 'bidirectional',
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "user_id"        UUID        NOT NULL,
  "tenant_id"      UUID        NOT NULL
);

-- FK: external_calendars -> users
ALTER TABLE "external_calendars"
  ADD CONSTRAINT "external_calendars_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- FK: external_calendars -> tenants
ALTER TABLE "external_calendars"
  ADD CONSTRAINT "external_calendars_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

COMMIT;
