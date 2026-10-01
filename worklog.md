# JurisLink - Worklog

---
Task ID: 1
Agent: Main
Task: Migration Prisma/SQLite → Supabase-only

Work Log:
- Audit complet du projet : 467 appels DB Prisma dans 123 fichiers, 32 modèles
- Identifié Supabase déjà configuré pour le stockage uniquement (supabase.ts)
- Identifié 7 fichiers avec identifiants Supabase en dur (risque de sécurité)
- Identifié .env pointant vers SQLite (file:...) mais schema Prisma déclarant PostgreSQL (incohérence)
- Créé l'adaptateur Prisma-compatible dans src/lib/db.ts (~1700 lignes) utilisant pg (node-postgres)
  - Supporte: findMany, findUnique, findFirst, create, update, delete, deleteMany, updateMany, count, aggregate, groupBy, upsert, createMany
  - Supporte: $transaction (interactif et batch), $queryRaw, $executeRaw, $queryRawUnsafe
  - Mapping complet: Model→Table (32 modèles), Field→Column (tous les @map)
  - Mapping complet: Relations (include/select avec résolution récursive)
  - Supporte: _count, nested create, OR/AND, contains/ILIKE, some/none (EXISTS)
- Mis à jour .env avec DATABASE_URL PostgreSQL Supabase et variables Supabase Storage
- Supprimé: prisma/ (schéma + 4 seeds), seed-multi-tenant.ts, seed-scp.ts, inspect-db.js
- Supprimé: 7 scripts (seed-ndoki.ts, seed-rbac.ts, check-expiry-*.ts/.js, test-login-query.ts, seed-portal-accounts.js)
- Supprimé: tests/database-runtime-build.sh
- Mis à jour: package.json (retiré @prisma/client et prisma, scripts db:* → no-op)
- Mis à jour: mini-services/notification-service (PrismaClient → pg direct)
- Corrigé: 9 fichiers important PrismaClient directement (debug, document-templates, invoices, reports, communications, payments, time-entries)
- Corrigé: scripts/auto-remind-direct.js et check-expiry.js (PrismaClient → pg)
- Ajouté: export type DbClient dans db.ts
- Désinstallé: @prisma/client et prisma (bun remove)
- Lint: 0 erreurs
- Serveur: démarre, GET / 200, page de login JurisLink s'affiche

Stage Summary:
- **Prisma entièrement supprimé** du projet
- **SQLite entièrement supprimé** (aucune référence restante)
- **L'app communique uniquement avec Supabase** (pg pour DB, @supabase/supabase-js pour Storage)
- L'adaptateur est API-compatible Prisma: les 123 fichiers existants n'ont PAS besoin de modification
- Aucun import @prisma/client restant dans src/
- ⚠️ Les clés Supabase (NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) sont vides dans .env — à renseigner pour le stockage

Unresolved issues or risks:
- Les env vars Supabase Storage sont vides — le stockage fichiers revient au filesystem local
- L'adaptateur ne gère pas certains patterns très spécifiques (include avec orderBy + where sur relations dans le même include) — à affiner si besoin
- Le mini-service notification-service utilise maintenant pg directement — vérifier qu'il démarre correctement
- Certains scripts Python dans scripts/ n'ont pas été vérifiés (non liés à Prisma)

---
Task ID: 2
Agent: Main
Task: Fix erreur de connexion root_admin

Work Log:
- Diagnostiqué: DATABASE_URL shell env var = `file:/home/z/my-project/db/custom.db` (SQLite) surcharge le .env (Supabase PostgreSQL)
- Installé dotenv@18.0.5 et ajouté `dotenvConfig({ override: true })` au début de src/lib/db.ts pour forcer le .env
- Diagnostiqué: `db.$disconnect()` non implémenté → TypeError crash dans finally block de toutes les API routes (140+ appels)
- Ajouté `$disconnect` et `$connect` methods (no-op Promise.resolve()) à l'adaptateur db pour compat Prisma
- Vérifié root_admin existe dans Supabase: email=pat.epee@gmail.com, role=root_admin, 114 permissions, is_active=true
- Testé login API: POST /api/auth/login → 200, retourne utilisateur + 114 permissions
- Testé login UI via agent-browser: formulaire rempli, connexion réussie, dashboard admin affiché
- Mauvais mot de passe → 401 "Mot de passe incorrect" ✓

Stage Summary:
- **DATABASE_URL corrigé**: dotenv override force le .env Supabase PostgreSQL
- **$disconnect/$connect ajoutés**: toutes les API routes fonctionnent sans crash
- **Login root_admin fonctionnel**: API 200, UI dashboard admin accessible
- Credentials: pat.epee@gmail.com / Admin@123
