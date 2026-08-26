-- ============================================================
-- Migration 001 — Ajouter tenant_id a event_assignments
-- Severite : MOYENNE (isolation existe via RLS JOIN, mais
--   performance et defense-in-depth necessitent la colonne)
-- Non-destructif : preserve toutes les donnees existantes
-- ============================================================

BEGIN;

-- 1. Ajouter la colonne avec un UUID temporaire
ALTER TABLE event_assignments 
ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;

-- 2. Backfill : recuperer le tenant_id depuis la table events liee
UPDATE event_assignments ea
SET tenant_id = e.tenant_id
FROM events e 
WHERE ea.event_id = e.id;

-- 3. Supprimer le default apres backfill
ALTER TABLE event_assignments ALTER COLUMN tenant_id DROP DEFAULT;

-- 4. Contrainte FK
ALTER TABLE event_assignments 
ADD CONSTRAINT fk_event_assignments_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_event_assignments_tenant_id 
ON event_assignments(tenant_id);

-- 6. Mettre a jour la RLS : remplacer le JOIN par un filtre direct
--    (la policy existante continue de fonctionner, mais on ajoute une policy directe plus performante)
CREATE POLICY event_assignments_direct_tenant_isolation
ON event_assignments
FOR ALL
TO public
USING ((tenant_id = get_tenant_id()) OR (get_user_role() = 'root_admin'::user_role))
WITH CHECK ((tenant_id = get_tenant_id()) OR (get_user_role() = 'root_admin'::user_role));

COMMIT;