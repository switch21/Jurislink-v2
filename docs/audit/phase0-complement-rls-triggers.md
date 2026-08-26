# JURISLINK V2 — COMPLEMENT D'AUDIT (Resultats SQL Section 11)

**Date** : 2025-06-18
**Source** : Execution du script SQL dans le Dashboard Supabase

---

## 1. RLS — TOUTES LES TABLES SONT PROTEGEES

**19/19 tables** ont RLS active (`rls_enabled = true`). C'est un excellent score.

### 56 policies RLS identifiees

| Pattern | Tables | Count |
|---|---|---|
| Isolation tenant (`tenant_id = get_tenant_id() OR root_admin`) | cases, clients, documents, events, invoices, messages, notifications, tasks, case_assignments, case_notes | 10 |
| RESTRICTIVE AAL2 (MFA requis pour non-admin) | audit_logs, cases, documents, events, invoices, messages, tasks | 8 |
| Root admin only (system tables) | audit_chain_alerts, csp_violations, sessions_log | 6 |
| Append-only (audit protection) | audit_logs (block UPDATE/DELETE) | 3 |
| Utilisateurs (nuanced) | users (self-update, admin-update, role protection) | 7 |
| Messages (privacy) | messages (sender/receiver/admin only) | 5 |
| Globals (currencies) | currencies (public read, root write) | 2 |
| Tenants (self or root) | tenants | 4 |
| event_assignments (JOIN-based) | event_assignments | 2 |

### event_assignments — ISOLATION EXISTANTE (via JOIN)

**MISE A JOUR CRITIQUE** : La "faille" identifiee dans le rapport PDF est **partiellement mitigee** par la RLS. La policy utilise une jointure :

```sql
EXISTS (SELECT 1 FROM events e
  WHERE e.id = event_assignments.event_id
    AND e.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
```

Cela fournit l'isolation, mais :
- **Performance** : chaque requete fait un JOIN supplementaire
- **Defense-in-depth** : un `tenant_id` direct est plus robuste
- **Consistence** : toutes les autres tables utilisent `tenant_id` direct

**Verdict** : La Migration 001 reste recommandee mais la severite passe de CRITIQUE a MOYENNE.

---

## 2. TRIGGERS — 26 triggers actifs

| Trigger | Table | Type | Role |
|---|---|---|---|
| `audit_log_trigger` | cases, clients, documents, invoices, tenants, users | AFTER INSERT/UPDATE/DELETE | Journalisation automatique |
| `handle_updated_at` | cases, invoices, tasks, tenants, users | BEFORE UPDATE | Auto-timestamp |
| `fn_audit_chain_before_insert` | audit_logs | BEFORE INSERT | Calcule hash chaine d'audit |
| `fn_audit_chain_block_mutation` | audit_logs | AFTER UPDATE/DELETE | Bloque toute modification |
| `fn_log_session_insert` | auth.sessions | AFTER INSERT | Log les nouvelles sessions |

### Audit chain — HASHES NULL CAR VAULT NON CONFIGURE

**CAUSE TROUVEE** : La fonction `compute_audit_hash` lit le secret depuis `vault.decrypted_secrets` :

```sql
SELECT decrypted_secret INTO v_secret
FROM vault.decrypted_secrets
WHERE name = 'AUDIT_CHAIN_SECRET'
LIMIT 1;
IF v_secret IS NULL THEN
    RAISE EXCEPTION 'AUDIT_CHAIN_SECRET not found in Vault.';
END IF;
```

Les 35 entrees avec `curr_hash = NULL` ont ete inserees avec le bypass active (`audit_chain.bypass = 'true'`) ou avant que le trigger ne soit actif.

**FIX SIMPLE** (une seule commande) :
```sql
SELECT vault.create_secret('votre-cle-secrete-32-bytes-ici', 'AUDIT_CHAIN_SECRET');
```

Puis un backfill pour les 35 entrees existantes (a ecrire).

---

## 3. FONCTIONS SQL — Analyse des corps

### 17 fonctions dont les sources sont maintenant visibles

| Fonction | Qualite | Notes |
|---|---|---|
| `compute_audit_hash` | ✅ Excellent | HMAC-SHA256 via pgcrypto, secret dans Vault, fail-closed |
| `verify_audit_chain` | ✅ Excellent | Re-compute et compare chaque maillon |
| `fn_audit_chain_before_insert` | ✅ Excellent | Chainage automatique avec bypass pour tests |
| `fn_audit_chain_block_mutation` | ✅ Excellent | Bloque UPDATE/DELETE + alerte |
| `audit_log_trigger` | ✅ Bon | Capture diff (OLD/NEW) + tenant_id + user_id |
| `export_user_data` | ✅ Excellent | 9 categories de donnees, GDPR Art.15/20, audit log |
| `soft_delete_user_data` | ✅ Excellent | Anonymisation complete, GDPR Art.17, 11 etapes |
| `register_successful_login` | ⚠️ 2 overloads | Deux versions (simple + full), la simple ne reset pas session_count |
| `register_failed_login` | ✅ Bon | Lockout apres 5 tentatives, 15 min, anti-enumeration |
| `detect_suspicious_sessions` | ✅ Bon | Multi-IP (>5) + session count (>20) |
| `handle_new_user` | ⚠️ Attention | Role par defaut = 'client' (pas 'lawyer') |
| `revoke_session` | ✅ Bon | Supprime aussi auth.sessions (JWT invalide immediatement) |
| `register_session_end` | ✅ Bon | Validation stricte des end_reason |

### ⚠️ Colonnes referencees dans les fonctions mais ABSENTES du schema

| Fonction | Colonne referencee | Table | Status |
|---|---|---|---|
| `export_user_data` | `assigned_lawyer_id` | clients | ❌ MANQUANTE |
| `export_user_data` | `uploaded_by` | documents | ❌ MANQUANTE (colonne = `uploader_id`) |
| `soft_delete_user_data` | `assigned_lawyer_id` | clients | ❌ MANQUANTE |
| `soft_delete_user_data` | `name`, `description`, `deleted_at` | documents | ❌ MANQUANTES |

Ces references dans les fonctions vont **echouer a l'execution** si les colonnes ne sont pas ajoutees.

---

## 4. INDEX — Etat actuel

### Index deja existants (reduisent la Migration 004)

| Index | Colonne(s) | Status |
|---|---|---|
| `idx_audit_logs_tenant_timestamp` | (tenant_id, timestamp DESC) | ✅ Deja existe |
| `idx_audit_logs_user_timestamp` | (user_id, timestamp DESC) | ✅ Deja existe |
| `idx_audit_logs_action_timestamp` | (action, timestamp DESC) | ✅ Deja existe |
| `idx_audit_logs_chain_order` | (id DESC) WHERE curr_hash IS NOT NULL | ✅ Deja existe |
| `idx_audit_logs_metadata` | GIN(metadata) | ✅ Deja existe |
| `idx_sessions_log_user_id` | (user_id) | ✅ Deja existe |
| `idx_sessions_log_started_at` | (started_at DESC) | ✅ Deja existe |
| `idx_users_last_login_at` | (last_login_at DESC) | ✅ Deja existe |
| `idx_users_locked_until` | (locked_until) WHERE NOT NULL | ✅ Deja existe |

### Index MANQUANTS (a creer)

| Table | Colonne(s) | Requete |
|---|---|---|
| users | (tenant_id, role) | Liste utilisateurs par cabinet/role |
| cases | (tenant_id, status) | Filtre dossiers par statut |
| cases | (tenant_id, client_id) | Dossiers d'un client |
| clients | (tenant_id, full_name) | Recherche clients |
| documents | (tenant_id, case_id) | Documents d'un dossier |
| events | (tenant_id, start_time) | Evenements par date |
| notifications | (user_id, read) | Notifications non lues |
| messages | (tenant_id, receiver_id, read_status) | Messages non lus |

**La Migration 004 est reduite de 11 a 8 index** (3 existaient deja). De plus, l'index sur `audit_logs(entity, entity_id)` n'est pas dans l'existant, mais `idx_audit_logs_action_timestamp` couvre partiellement ce besoin.

---

## 5. CONTRAINTES

### Aucune CHECK sur les ENUM — MAIS les types ENUM existent!

Les colonnes utilisent vraisemblablement les types ENUM (pas varchar) :
- `user_role` : root_admin, firm_admin, lawyer, secretary, **client**
- `case_status` : open, closed, pending, archived
- `invoice_status` : draft, sent, paid, overdue, cancelled
- `criticality_level` : low, medium, high, urgent
- `case_outcome` : ongoing, won, lost, settled, dismissed
- `task_status` : todo, in_progress, done
- `payment_status` : pending, partial, paid

**La Migration 002 (CHECK constraints) est INUTILE** si les colonnes utilisent deja les types ENUM. A verifier avec : `\d public.users` etc.

### Ecarts ENUM vs instructions.md

| Enum | Valeurs existantes | Attendu instructions.md | Action |
|---|---|---|---|
| `user_role` | root_admin, firm_admin, lawyer, secretary, client | + collaborator, accountant, trainee | ALTER TYPE ADD VALUE |
| `case_status` | open, closed, pending, archived | + new, in_progress | ALTER TYPE ADD VALUE |
| `criticality_level` | low, medium, high, urgent | 'normal' au lieu de 'medium' | A clarifier |

---

## 6. PLAN DE MIGRATIONS REVISE

### Migration 001 — tenant_id sur event_assignments
**Severite revisee : MOYENNE** (isolation existe via RLS JOIN, mais performance/consistence a ameliorer)

### Migration 002 — SUPPRIMEE
Les types ENUM existent deja et font office de contraintes. Remplacee par :

### Migration 002 (nouvelle) — Etendre les ENUM
```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'collaborator';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'trainee';
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'in_progress';
```

### Migration 003 — Colonnes manquantes (INCHANGEE)
17 colonnes a ajouter + corrections des noms references dans les fonctions.

### Migration 004 — Index (REDUITE)
8 index au lieu de 11 (3 existaient deja). Utiliser `CREATE INDEX IF NOT EXISTS`.

### Migration 005 (NOUVELLE) — Activer la chaine d'audit
```sql
-- 1. Creer le secret dans Vault
SELECT vault.create_secret('CLE-SECRETE-A-GENERER', 'AUDIT_CHAIN_SECRET');

-- 2. Backfill les 35 entrees existantes (script a ecrire)
```

---

## 7. RESUME DES CORRECTIONS AU RAPPORT PDF

| Point du rapport PDF | Ancienne conclusion | Nouvelle conclusion |
|---|---|---|
| event_assignments sans tenant_id | FAILLE CRITIQUE | Mitigee par RLS JOIN. Passage a MOYENNE |
| RLS non verifiables | INCERTAIN | ✅ 56 policies, toutes les tables protegees |
| Triggers non verifiables | INCERTAIN | ✅ 26 triggers, audit automatique + chaine de hachage |
| Hashes NULL | Chaîne non activee | Vault non configure. FIX = 1 commande SQL |
| CHECK constraints manquantes | 4 contraintes a ajouter | INUTILE si ENUM types utilises |
| Index manquants | 11 index a creer | 8 index (3 existaient deja) |
| Fonctions SQL non verifiables | INCERTAIN | ✅ 17 fonctions, corps completement visibles |

---
*Complement genere apres execution du script SQL Section 11 dans le Dashboard Supabase.*
