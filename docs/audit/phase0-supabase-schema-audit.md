# 📋 JURISLINK V2 — PHASE 0 : RAPPORT D'AUDIT DU SCHÉMA SUPABASE

**Date** : 2025-06-18  
**Projet** : `switch21/jurislink`  
**Référence Supabase** : `zosqktvmihtkqbbgdbgx`  
**PostgREST version** : 14.5  
**Méthode d'audit** : API REST (PostgREST + Auth Admin + Storage) — connexion directe PostgreSQL impossible (IPv6 only, sandbox IPv4-only)

---

## ⚠️ LIMITATIONS DE L'AUDIT

| Élément | Statut | Détail |
|---|---|---|
| Tables/colonnes/types | ✅ Complet | Via OpenAPI spec |
| Données existantes | ✅ Complet | Via REST API service_role |
| Auth utilisateurs | ✅ Complet | Via Auth Admin API |
| Storage buckets | ✅ Complet | Via Storage API |
| RPC fonctions (signatures) | ✅ Complet | Via OpenAPI spec |
| **RLS politiques** | ⚠️ **PARTIEL** | OpenAPI montre des filtres par colonne, mais le texte SQL des policies (USING/WITH CHECK) n'est pas accessible via REST. **Requiert connexion directe PostgreSQL ou exécution SQL par le dashboard.** |
| **Triggers** | ❌ Non vérifiable | Nécessite pg_catalog |
| **Fonctions SQL (corps)** | ❌ Non vérifiable | Nécessite pg_proc |
| **Index** | ❌ Non vérifiable | Nécessite pg_indexes |
| **Contraintes CHECK/UNIQUE** | ❌ Non vérifiable | Nécessite information_schema |
| **Edge Functions** | ❌ Non vérifiable | Nécessite Management API token |
| **CORS config** | ❌ Non vérifiable | Nécessite Dashboard ou Management API |

> **ACTION REQUISE** : Pour compléter l'audit (RLS, triggers, fonctions, index, contraintes), merci d'exécuter le script SQL fourni en section 11 dans le SQL Editor du dashboard Supabase et me fournir le résultat.

---

## 1. INVENTAIRE DES TABLES (18 tables + 2 vues)

### 1.1 Tables métier

| # | Table | Lignes | Clé primaire | tenant_id | Rôle métier |
|---|---|---|---|---|
| 1 | `tenants` | 3 | `id (uuid)` | — | Cabinet juridique |
| 2 | `users` | 8 | `id (uuid)` | ✅ NULLABLE | Profils utilisateurs |
| 3 | `clients` | 4 | `id (uuid)` | ✅ NOT NULL | Clients du cabinet |
| 4 | `cases` | 3 | `id (uuid)` | ✅ NOT NULL | Dossiers juridiques |
| 5 | `case_assignments` | 4 | `id (uuid)` | ✅ NOT NULL | Avocats assignés aux dossiers |
| 6 | `case_notes` | 2 | `id (uuid)` | ✅ NOT NULL | Notes de dossier |
| 7 | `documents` | 3 | `id (uuid)` | ✅ NOT NULL | Documents stockés |
| 8 | `events` | 5 | `id (uuid)` | ✅ NOT NULL | Événements/calendrier |
| 9 | `event_assignments` | 5 | `id (uuid)` | ❌ **MANQUANT** | Assignation événements |
| 10 | `tasks` | 0 | `id (uuid)` | ✅ NOT NULL | Tâches |
| 11 | `invoices` | 4 | `id (uuid)` | ✅ NOT NULL | Factures |
| 12 | `messages` | 3 | `id (uuid)` | ✅ NOT NULL | Messages internes |
| 13 | `notifications` | 2 | `id (uuid)` | ✅ NOT NULL | Notifications |
| 14 | `currencies` | 4 | `id (uuid)` | ❌ N/A | Devises |

### 1.2 Tables système/sécurité

| # | Table | Lignes | Rôle |
|---|---|---|
| 15 | `audit_logs` | 35 | Journal d'audit avec chaîne de hachage |
| 16 | `audit_chain_alerts` | 0 | Alertes d'intégrité de la chaîne d'audit |
| 17 | `sessions_log` | 0 | Journal des sessions |
| 18 | `rate_limit_buckets` | 0 | Rate limiting |
| 19 | `csp_violations` | 0 | Violations Content Security Policy |

### 1.3 Vues

| Vue | Lignes | Description |
|---|---|---|
| `v_active_sessions` | 0 | Sessions actives avec info utilisateur |
| `v_csp_violations_top` | 0 | Top des violations CSP |

---

## 2. DÉTAIL DES COLONNES PAR TABLE

### `tenants`
| Colonne | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | NOT NULL | PK |
| name | string | NOT NULL | |
| logo_url | string | ✅ | Logo du cabinet |
| language | string | ✅ | Par défaut 'fr' |
| timezone | string | ✅ | Par défaut 'Europe/Paris' |
| phone | string | ✅ | |
| email | string | ✅ | |
| address | string | ✅ | |
| niu | string | ✅ | Numéro d'identification unique |
| plan | string | ✅ | 'starter', 'premium', etc. |
| max_users | integer | ✅ | |
| max_storage_gb | number | ✅ | |
| is_active | boolean | ✅ | |
| created_at | timestamptz | ✅ | |
| updated_at | timestamptz | ✅ | |

### `users`
| Colonne | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | NOT NULL | PK, FK vers auth.users |
| tenant_id | uuid | ✅ | **NULL pour root_admin** |
| role | string | NOT NULL | Pas de contrainte ENUM |
| full_name | string | NOT NULL | |
| email | string | NOT NULL | |
| preferred_language | string | ✅ | |
| is_active | boolean | ✅ | |
| failed_login_attempts | integer | NOT NULL | Default 0 |
| session_count_today | integer | NOT NULL | Default 0 |
| locked_until | timestamptz | ✅ | Verrouillage compte |
| last_login_at | timestamptz | ✅ | |
| last_session_id | string | ✅ | |
| created_at | timestamptz | ✅ | |
| updated_at | timestamptz | ✅ | |

### `clients`
| Colonne | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | NOT NULL | PK |
| tenant_id | uuid | NOT NULL | |
| full_name | string | NOT NULL | |
| company | string | ✅ | |
| phone | string | ✅ | |
| email | string | ✅ | |
| address | string | ✅ | |
| notes | string | ✅ | |
| created_at | timestamptz | ✅ | |
| updated_at | timestamptz | ✅ | |

### `cases`
| Colonne | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | NOT NULL | PK |
| tenant_id | uuid | NOT NULL | |
| client_id | uuid | NOT NULL | FK → clients |
| title | string | NOT NULL | |
| description | string | ✅ | |
| status | string | ✅ | Pas de contrainte ENUM |
| open_date | date | ✅ | |
| is_secret | boolean | ✅ | Dossier confidentiel |
| payment_status | string | ✅ | |
| outcome | string | ✅ | |
| created_at | timestamptz | ✅ | |
| updated_at | timestamptz | ✅ | |

### `documents`
| Colonne | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | NOT NULL | PK |
| tenant_id | uuid | NOT NULL | |
| case_id | uuid | ✅ | FK → cases |
| uploader_id | uuid | NOT NULL | FK → users |
| file_name | string | NOT NULL | |
| file_path | string | NOT NULL | Chemin Supabase Storage |
| file_size | integer | NOT NULL | En bytes |
| tags | jsonb | ✅ | Tableau de tags |
| created_at | timestamptz | ✅ | |

### `events`
| Colonne | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | NOT NULL | PK |
| tenant_id | uuid | NOT NULL | |
| case_id | uuid | ✅ | FK → cases |
| title | string | NOT NULL | |
| description | string | ✅ | |
| start_time | timestamptz | NOT NULL | |
| end_time | timestamptz | NOT NULL | |
| event_type | string | ✅ | |
| criticality | string | ✅ | |
| reminder_sent | boolean | ✅ | |
| created_at | timestamptz | ✅ | |

### `notifications`
| Colonne | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | NOT NULL | PK |
| tenant_id | uuid | NOT NULL | |
| user_id | uuid | ✅ | |
| title | string | NOT NULL | |
| message | string | ✅ | |
| type | string | ✅ | |
| read | boolean | ✅ | |
| event_id | uuid | ✅ | Référence vers l'événement |
| created_at | timestamptz | ✅ | |

### `audit_logs`
| Colonne | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | NOT NULL | PK |
| tenant_id | uuid | NOT NULL | |
| user_id | uuid | ✅ | |
| action | string | NOT NULL | INSERT, UPDATE, DELETE, etc. |
| entity | string | NOT NULL | Nom de la table |
| entity_id | string | NOT NULL | ID de la ligne |
| timestamp | timestamptz | ✅ | |
| previous_state | jsonb | ✅ | État avant modification |
| new_state | jsonb | ✅ | État après modification |
| metadata | jsonb | ✅ | |
| prev_hash | string | ✅ | Hachage chaîne d'audit |
| curr_hash | string | ✅ | |

---

## 3. DONNÉES EXISTANTES

### 3.1 Tenants (3)
| Nom | Plan | Utilisateurs | Région |
|---|---|---|---|
| EKOKA LAW FIRM | starter | 3 | Douala |
| SCP NDOKI & ASSOCIES | premium | 1 | Douala |
| SCP MBOCK & PINDY | premium | 4 | Douala |

### 3.2 Utilisateurs (8)
| Email | Rôle | Tenant | Actif | MFA |
|---|---|---|---|---|
| pat.epee@gmail.com | root_admin | (global) | ✅ | ❌ |
| pod126@yahoo.fr | firm_admin | EKOKA | ✅ | ❌ |
| charlenendoki91@gmail.com | lawyer | EKOKA | ✅ | ❌ |
| thewarehouse.cm@gmail.com | secretary | EKOKA | ✅ | ❌ |
| pindy@scpmock-pindy.com | firm_admin | MBOCK & PINDY | ✅ | ❌ |
| mbock@scpmock-pindy.com | firm_admin | MBOCK & PINDY | ✅ | ❌ |
| eboukijean@gmail.com | lawyer | MBOCK & PINDY | ✅ | ❌ |
| cndoki@scp-ndoki.com | firm_admin | SCP NDOKI | ✅ | ❌ |

### 3.3 Distribution des données
| Table | EKOKA | SCP NDOKI | MBOCK & PINDY | Total |
|---|---|---|---|---|
| Cases | 1 | 0 | 2 | 3 |
| Clients | 1 | 0 | 3 | 4 |
| Documents | 1 | 0 | 2 | 3 |
| Events | 2 | 0 | 3 | 5 |
| Invoices | 2 | 0 | 2 | 4 |
| Messages | 2 | 0 | 1 | 3 |
| Notifications | 2 | 0 | 0 | 2 |
| Audit Logs | 1 | 1 | 33 | 35 |

---

## 4. FONCTIONS RPC (14)

### 4.1 Sécurité & Sessions
| Fonction | Paramètres | Rôle |
|---|---|---|
| `get_tenant_id` | (aucun, utilise auth.uid()) | Retourne le tenant_id de l'utilisateur connecté |
| `get_user_role` | (aucun, utilise auth.uid()) | Retourne le rôle de l'utilisateur connecté |
| `is_aal2` | (aucun, utilise auth.uid()) | Vérifie si l'utilisateur est en AAL2 (MFA actif) |
| `is_account_locked` | p_user_id | Vérifie si un compte est verrouillé |
| `is_session_suspicious` | p_user_id | Détecte sessions suspectes |
| `is_case_assignee` | check_case_id | Vérifie si l'utilisateur est assigné à un dossier |
| `register_successful_login` | p_user_id, p_session_id? | Enregistre une connexion réussie |
| `register_failed_login` | p_email | Enregistre un échec de connexion |
| `register_session_end` | p_session_id, p_reason? | Enregistre la fin d'une session |
| `revoke_session` | p_session_id, p_revoked_by? | Révoque une session |

### 4.2 Audit
| Fonction | Paramètres | Rôle |
|---|---|---|
| `compute_audit_hash` | p_action, p_entity, p_entity_id, p_metadata, p_prev_hash, p_timestamp, p_user_id | Calcule le hash pour la chaîne d'audit |
| `verify_audit_chain` | p_from_id?, p_to_id? | Vérifie l'intégrité de la chaîne d'audit |

### 4.3 Données
| Fonction | Paramètres | Rôle |
|---|---|---|
| `export_user_data` | p_user_id | Exporte les données utilisateur (RGPD) |
| `soft_delete_user_data` | p_user_id, p_deleted_by?, p_reason? | Suppression soft des données utilisateur |

### 4.4 Système
| Fonction | Paramètres | Rôle |
|---|---|---|
| `detect_suspicious_sessions` | p_hours_back? | Détecte les sessions suspectes |
| `purge_old_csp_violations` | p_max_age_days? | Nettoie les anciennes violations CSP |

---

## 5. STORAGE

### Buckets
| Bucket | Public | File Size Limit | Notes |
|---|---|---|---|
| `documents` | ❌ Private | Aucune | Documents juridiques |
| `logos` | ✅ **Public** | Aucune | Logos des cabinets |

### Stockage actuel
Documents observés dans le bucket `documents` :
- Chemins isolés par `tenant_id/` (bonne pratique)
- Exemples : `02f9415d.../1...pdf`, `e14f96e9.../1778842270254_055egm.pdf`

### ⚠️ Problèmes Storage
1. **Policies 404** : L'API Storage retourne 404 sur les policies. Cela peut signifier :
   - Aucune policy définie (accès par défaut = public pour logos, service_role pour documents)
   - L'endpoint a changé dans les versions récentes de Supabase
2. **`logos` bucket PUBLIC** : Les logos sont accessibles sans authentification. C'est acceptable pour des logos, mais il faut s'assurer qu'aucune donnée sensible n'y est stockée.
3. **Pas de `file_size_limit`** : Aucun des deux buckets n'a de limite de taille de fichier.

---

## 6. AUTH & MFA

### 6.1 Statut Auth
- 8 utilisateurs, tous avec email confirmé
- Tous les emails confirmés automatiquement à la création

### 6.2 MFA — ⚠️ CRITIQUE
| Métrique | Valeur |
|---|---|
| Utilisateurs avec MFA | **0 / 8 (0%)** |
| Facteurs TOTP enregistrés | **0** |
| Niveau AAL | **AAL1 (aucun MFA)** pour tous |

**Problème** : L'application a l'infrastructure pour MFA (fonction `is_aal2`, mentions dans instructions.md Phase 2), mais **aucun utilisateur n'a activé MFA**. Pour un outil juridique, c'est un risque majeur.

---

## 7. ANALYSE MULTI-TENANT

### 7.1 Isolation par tenant_id

| Table | tenant_id présent | NOT NULL | Statut |
|---|---|---|---|
| tenants | — | — | N/A (table racine) |
| users | ✅ | ❌ NULLABLE | ⚠️ root_admin a NULL |
| clients | ✅ | ✅ | ✅ Bon |
| cases | ✅ | ✅ | ✅ Bon |
| case_assignments | ✅ | ✅ | ✅ Bon |
| case_notes | ✅ | ✅ | ✅ Bon |
| documents | ✅ | ✅ | ✅ Bon |
| events | ✅ | ✅ | ✅ Bon |
| **event_assignments** | ❌ **MANQUANT** | ❌ | 🔴 **CRITIQUE** |
| tasks | ✅ | ✅ | ✅ Bon |
| invoices | ✅ | ✅ | ✅ Bon |
| messages | ✅ | ✅ | ✅ Bon |
| notifications | ✅ | ✅ | ✅ Bon |
| audit_logs | ✅ | ✅ | ✅ Bon |
| sessions_log | ✅ | ❌ NULLABLE | ⚠️ |
| currencies | ❌ | — | N/A (données globales) |

### 7.2 🔴 FAILLE CRITIQUE : `event_assignments` sans tenant_id

La table `event_assignments` lie un événement à un utilisateur mais **n'a pas de colonne `tenant_id`**. Cela signifie :
- Impossible d'appliquer une RLS basée sur tenant
- Un utilisateur du tenant A pourrait théoriquement voir les assignations d'événements du tenant B
- La jointure avec `events.tenant_id` est nécessaire pour filtrer, mais la RLS ne peut pas faire ça directement

**Action** : Ajouter `tenant_id uuid NOT NULL REFERENCES tenants(id)` + index

---

## 8. CHAÎNE D'AUDIT — ANALYSE

### 8.1 Structure existante
La table `audit_logs` a une excellente structure :
- `prev_hash` / `curr_hash` pour la chaîne de hachage
- `previous_state` / `new_state` pour le diff
- `metadata` pour les infos supplémentaires
- Fonctions `compute_audit_hash` et `verify_audit_chain`

### 8.2 ⚠️ Problèmes identifiés

| Problème | Sévérité | Détail |
|---|---|---|
| **Tous les hashes sont NULL** | 🔴 Critique | Les 35 entrées ont `prev_hash=null` et `curr_hash=null`. La chaîne d'intégrité n'est pas utilisée. |
| **user_id NULL** | 🟡 Moyen | Certaines entrées (création tenant, création user) ont `user_id=null`. |
| **Pas d'IP** | 🟡 Moyen | Pas de colonne `ip_address` dans audit_logs |
| **Pas de user_agent** | 🟡 Moyen | Pas de colonne `user_agent` dans audit_logs |
| **pas de resource_type** | 🟡 Faible | La colonne `entity` sert à ça, mais le naming est incohérent avec instructions.md qui dit `resource_type` |

---

## 9. COMPARAISON AVEC INSTRUCTIONS.MD — ÉCARTS IDENTIFIÉS

### 9.1 Éléments compatibles (réutilisables)

| Élément | Statut | Commentaire |
|---|---|---|
| Table `tenants` | ✅ | Bonne structure, ajouter colonnes si nécessaire |
| Table `users` | ✅ | Bonne structure avec sécurité (locked_until, failed_login_attempts) |
| Table `clients` | ✅ | Structure adéquate |
| Table `cases` | ✅ | Bonne base, `is_secret` est un bon ajout |
| Table `documents` | ✅ | Structure correcte, `tags` en jsonb |
| Table `events` | ✅ | Avec `criticality` et `event_type` |
| Table `invoices` | ✅ | Avec devise et statut |
| Table `audit_logs` | ✅ | Excellente structure avec chaîne de hachage |
| Table `sessions_log` | ✅ | Prêt pour le suivi de sessions |
| Table `rate_limit_buckets` | ✅ | Infrastructure rate limiting |
| RPC `get_tenant_id` | ✅ | Utilise auth.uid() |
| RPC `get_user_role` | ✅ | Utilise auth.uid() |
| RPC `is_aal2` | ✅ | Pour vérification MFA |
| 2 buckets Storage | ✅ | Documents (private) + Logos (public) |
| 8 utilisateurs | ✅ | Données de démo préservées |
| 3 tenants | ✅ | Données de démo préservées |

### 9.2 Colonnes manquantes (Migration ADD COLUMN)

| Table | Colonne manquante | Type | Justification (Phase) |
|---|---|---|---|
| `event_assignments` | `tenant_id` | uuid NOT NULL | **CRITIQUE** — Isolation multi-tenant (Phase 3) |
| `cases` | `reference` | varchar | Référence unique du dossier (Phase 9) |
| `cases` | `case_type` | varchar | Type de dossier (civil, pénal, etc.) (Phase 9) |
| `cases` | `priority` | varchar | Priorité (haute, moyenne, basse) (Phase 9) |
| `cases` | `assigned_lawyer_id` | uuid | Avocat responsable du dossier (Phase 9) |
| `cases` | `next_deadline` | timestamptz | Prochaine échéance (Phase 9) |
| `clients` | `responsible_lawyer_id` | uuid | Avocat responsable (Phase 8) |
| `clients` | `status` | varchar | Statut client (actif, inactif, archivé) (Phase 8) |
| `clients` | `last_activity_at` | timestamptz | Dernière activité (Phase 8) |
| `notifications` | `category` | varchar | Catégorie (Phase 12) |
| `notifications` | `resource_type` | varchar | Type de ressource liée (Phase 12) |
| `notifications` | `resource_id` | uuid | ID de la ressource liée (Phase 12) |
| `audit_logs` | `ip_address` | varchar | Traçabilité (Phase 11) |
| `audit_logs` | `user_agent` | text | Traçabilité (Phase 11) |
| `documents` | `mime_type` | varchar | Type MIME (Phase 10) |
| `documents` | `version` | integer | Numéro de version (Phase 10) |
| `documents` | `is_confidential` | boolean | Document confidentiel (Phase 20) |

### 9.3 Nouvelles entités nécessaires

| Entité | Justification | Phase |
|---|---|---|
| `document_versions` | Historique de versionnage des documents | Phase 10 |

### 9.4 Contraintes manquantes

| Table | Contrainte | Détail |
|---|---|---|
| `users.role` | CHECK | Limiter à : root_admin, firm_admin, lawyer, secretary, collaborator, accountant, trainee |
| `cases.status` | CHECK | Limiter à : nouveau, ouvert, en_cours, en_attente, clos, archive |
| `invoices.status` | CHECK | Limiter à : draft, sent, paid, overdue, cancelled |
| `events.criticality` | CHECK | Limiter à : low, normal, high, urgent |

### 9.5 Relations manquantes

| Relation | Type | Justification |
|---|---|---|
| `event_assignments.tenant_id` → `tenants.id` | FK + index | **CRITIQUE** — Isolation multi-tenant |
| `cases.assigned_lawyer_id` → `users.id` | FK | Avocat responsable (Phase 9) |
| `clients.responsible_lawyer_id` → `users.id` | FK | Avocat responsable (Phase 8) |

### 9.6 Index recommandés

| Table | Colonnes | Type | Requête typique |
|---|---|---|---|
| `users` | (tenant_id, role) | B-tree | Liste utilisateurs par cabinet et rôle |
| `cases` | (tenant_id, status) | B-tree | Filtre dossiers par statut |
| `cases` | (tenant_id, client_id) | B-tree | Dossiers d'un client |
| `clients` | (tenant_id, full_name) | B-tree | Recherche clients |
| `documents` | (tenant_id, case_id) | B-tree | Documents d'un dossier |
| `events` | (tenant_id, start_time) | B-tree | Événements par date |
| `notifications` | (user_id, read) | B-tree | Notifications non lues |
| `audit_logs` | (tenant_id, timestamp) | B-tree | Historique d'audit |
| `audit_logs` | (entity, entity_id) | B-tree | Suivi d'une entité |
| `messages` | (tenant_id, receiver_id, read_status) | B-tree | Messages non lus |
| `sessions_log` | (user_id, started_at) | B-tree | Historique sessions |

---

## 10. PLAN DE MIGRATIONS (NON-DESTRUCTIVES)

### Migration 001 — Correction critique : tenant_id sur event_assignments
```sql
ALTER TABLE event_assignments 
ADD COLUMN tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;

UPDATE event_assignments ea
SET tenant_id = e.tenant_id
FROM events e WHERE ea.event_id = e.id;

ALTER TABLE event_assignments ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE event_assignments 
ADD CONSTRAINT fk_event_assignments_tenant 
FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_event_assignments_tenant_id ON event_assignments(tenant_id);
```

### Migration 002 — Contraintes CHECK
```sql
ALTER TABLE users ADD CONSTRAINT chk_user_role 
CHECK (role IN ('root_admin', 'firm_admin', 'lawyer', 'secretary', 'collaborator', 'accountant', 'trainee'));

ALTER TABLE cases ADD CONSTRAINT chk_case_status 
CHECK (status IN ('new', 'open', 'in_progress', 'pending', 'closed', 'archived'));

ALTER TABLE invoices ADD CONSTRAINT chk_invoice_status 
CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled'));

ALTER TABLE events ADD CONSTRAINT chk_event_criticality 
CHECK (criticality IN ('low', 'normal', 'high', 'urgent'));
```

### Migration 003 — Colonnes manquantes pour V2
```sql
-- Cases
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reference varchar(50);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_type varchar(100);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS priority varchar(20) DEFAULT 'normal';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS assigned_lawyer_id uuid REFERENCES users(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS next_deadline timestamptz;

-- Clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS responsible_lawyer_id uuid REFERENCES users(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'active';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- Notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category varchar(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS resource_type varchar(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS resource_id uuid;

-- Audit logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address varchar(45);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent text;

-- Documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type varchar(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_confidential boolean DEFAULT false;
```

### Migration 004 — Index performance
```sql
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_cases_tenant_status ON cases(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cases_tenant_client ON cases(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_name ON clients(tenant_id, full_name);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_case ON documents(tenant_id, case_id);
CREATE INDEX IF NOT EXISTS idx_events_tenant_start ON events(tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_ts ON audit_logs(tenant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON messages(tenant_id, receiver_id, read_status);
CREATE INDEX IF NOT EXISTS idx_sessions_log_user ON sessions_log(user_id, started_at);
```

---

## 11. SCRIPT SQL À EXÉCUTER DANS LE DASHBOARD SUPABASE

Pour compléter l'audit (RLS, triggers, fonctions, index, contraintes existantes), veuillez exécuter ce script dans le **SQL Editor** du Supabase Dashboard et me fournir le résultat :

```sql
-- RLS STATUS
SELECT relname AS table_name, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' ORDER BY relname;

-- RLS POLICIES
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- TRIGGERS
SELECT event_object_table AS table_name, trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table, trigger_name;

-- FUNCTIONS (public schema)
SELECT p.proname AS name, pg_get_function_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS returns, prosrc AS source
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' ORDER BY p.proname;

-- INDEXES
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- CONSTRAINTS (UNIQUE + CHECK)
SELECT tc.table_name, tc.constraint_name, tc.constraint_type, cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' AND tc.constraint_type IN ('UNIQUE', 'CHECK')
ORDER BY tc.table_name;

-- ENUM TYPES
SELECT t.typname, e.enumlabel, e.enumsortorder
FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid ORDER BY t.typname, e.enumsortorder;

-- STORAGE POLICIES
SELECT * FROM storage.policies ORDER BY bucket_id, name;
```

---

## 12. RÉSUMÉ EXÉCUTIF

### Forces identifiées
- ✅ Architecture multi-tenant déjà en place avec `tenant_id`
- ✅ Système d'audit avec chaîne de hachage (bien que non activé)
- ✅ 14 fonctions RPC couvrant sécurité, audit, sessions
- ✅ Tables de sécurité (sessions_log, rate_limit_buckets, csp_violations)
- ✅ Isolation des documents par tenant dans le Storage
- ✅ Données de démonstration préservées (8 utilisateurs, 3 tenants, 35+ entrées)

### Faiblesses critiques
- 🔴 `event_assignments` sans `tenant_id` — faille d'isolation
- 🔴 Chaîne de hachage d'audit non activée (tous les hashes NULL)
- 🔴 MFA à 0% d'adoption
- 🔴 RLS policies non vérifiables par API REST (confirmation SQL requise)
- 🔴 Storage policies non vérifiables (404)

### Améliorations prioritaires
1. **Ajouter `tenant_id` à `event_assignments`** — Migration 001
2. **Vérifier et renforcer les RLS** — Script SQL section 11
3. **Activer la chaîne de hachage d'audit** — Backfill + trigger
4. **Ajouter les colonnes manquantes** — Migration 003
5. **Ajouter les contraintes CHECK** — Migration 002
6. **Créer les index manquants** — Migration 004
7. **Définir les Storage policies** — À déterminer après vérification

---
*Rapport généré automatiquement. Les migrations proposées sont non-destructives et préservent toutes les données existantes.*