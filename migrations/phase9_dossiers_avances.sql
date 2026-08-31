-- Phase 9: Dossiers Avancés — Migration SQL
-- Exécuter sur la base de données Supabase avant le déploiement

-- 1. Ajouter nextDueDate sur Case
ALTER TABLE cases ADD COLUMN IF NOT EXISTS next_due_date DATE;

-- 2. Ajouter assignedToId sur Task
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_id);

-- 3. Créer la table case_tags
CREATE TABLE IF NOT EXISTS case_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT case_tags_name_tenant UNIQUE (name, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_case_tags_tenant ON case_tags(tenant_id);

-- 4. Créer la table de liaison case_taggings
CREATE TABLE IF NOT EXISTS case_taggings (
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES case_tags(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (case_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_case_taggings_tag ON case_taggings(tag_id);

-- 5. Données initiales : tags par défaut pour chaque tenant existant
INSERT INTO case_tags (name, color, tenant_id)
SELECT
  unnest(ARRAY['Urgent', 'Contentieux', 'Conseil', 'Fiscal', 'Social', 'Immobilier', 'Famille', 'Commercial']),
  unnest(ARRAY['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#06B6D4', '#F97316']),
  t.id
FROM tenants t
ON CONFLICT (name, tenant_id) DO NOTHING;
