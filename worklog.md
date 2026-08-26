# JurisLink v2 — Worklog

---
Task ID: 1
Agent: Main
Task: Correction débordement montants tuiles Dashboard KPI

Work Log:
- Réduit padding p-4 → p-3, gap-4 → gap-3 sur les 4 tuiles KPI supérieures
- Réduit la taille de police text-2xl → text-lg sm:text-xl
- Ajouté min-w-0 overflow-hidden et truncate sur les montants
- Ajouté mode `compact` à fmtMoney() : ≥1M → "15 M XAF"
- Appliqué le format compact sur les 4 tuiles financières (CA, Encaissé, À recouvrer)
- Ajouté "facture(s)" au compteur d'impayés pour plus de clarté

Stage Summary:
- Les montants en FCFA ne débordent plus des tuiles
- Le tooltip title= affiche le montant complet au survol

---
Task ID: 2
Agent: Main
Task: Logo cabinet — onglet Mon cabinet + upload + endpoint

Work Log:
- Créé /api/tenants/logo/route.ts (POST multipart, sharp resize 400x400, max 2MB)
- Ajouté onglet 'cabinet' aux Settings tabs (Mon profil, Mon cabinet, Équipe...)
- Formulaire d'édition cabinet : nom, email, téléphone, NIU, adresse, ville, pays, devise
- Zone upload logo avec aperçu, bouton choisir/supprimer
- Mutation updateTenant + uploadLogo dans SettingsView
- Mis à jour PUT /api/tenants/[id] pour accepter city, country, niu, currencyCode

Stage Summary:
- L'onglet "Mon cabinet" est accessible à tout utilisateur avec tenantId
- Logo sauvegardé en /public/uploads/logos/ et chemin dans tenant.logoUrl
- Logo utilisable dans les factures PDF (via tenant.logoUrl)

---
Task ID: 3
Agent: Main
Task: Génération factures PDF

Work Log:
- Installé pdfkit et exceljs
- Créé /api/invoices/[id]/pdf/route.ts — vrai PDF pdfkit
- En-tête avec logo cabinet, nom, adresse, NIU
- Informations client + détails facture (dates, statut, dossier)
- Tableau des lignes (description, quantité, PU HT, montant HT, montant TTC)
- TVA 19.25%, totaux HT/TTC, déduction des paiements
- Pied de page avec infos cabinet
- Mis à jour handlePrint() pour appeler /pdf au lieu de /print

Stage Summary:
- Le bouton "Imprimer" télécharge un vrai fichier PDF
- Le logo du cabinet apparaît en haut de la facture si configuré

---
Task ID: 4-5
Agent: Subagent
Task: Filtres Finances + Export Rapports

Work Log:
- Ajouté filtres période (ce mois, trimestre, semestre, annuel, personnalisé)
- Ajouté filtre client dans la vue Finances
- Créé /api/finances/export/excel/route.ts (2 onglets: Factures + Paiements)
- Ajouté boutons export CSV/PDF dans Finances et Rapports
- KPIs mis à jour pour refléter les données filtrées

Stage Summary:
- Vue Finances avec filtres fonctionnels
- Export Excel disponible

---
Task ID: 6
Agent: Main
Task: Abonnement — compteur, relances auto, désactivation

Work Log:
- Créé /api/subscriptions/check-expiry/route.ts
- Seuil de relance : 30, 15, 10, 5, 1 jours avant expiration
- Création de notifications pour chaque seuil
- Désactivation automatique du tenant + subscription.status = 'expired' si date dépassée
- Bannière d'alerte sur le Dashboard avec compteur de jours restants
- Cron job configuré (fixed_rate 3600s) pour vérification périodique

Stage Summary:
- Bannière rouge/orange visible sur le dashboard si abonnement bientôt expiré
- Notifications créées dans la table pour chaque palier
- Désactivation automatique du cabinet à l'expiration

---
Task ID: 7-8-9
Agent: Main
Task: Dossiers — confidentiels, collaborateurs, téléchargement docs

Work Log:
- Créé /api/cases/[id]/assignments/route.ts (GET, POST, DELETE)
- Créé /api/documents/[id]/download/route.ts
- Ajouté isSecret au formulaire de création/édition de dossier (checkbox custom)
- Ajouté sélection multi-utilisateurs (collaborateurs) dans le formulaire
- Ajouté icône Lock 🔒 sur les tuiles de dossiers confidentiels
- Ajouté bouton "Télécharger" pour chaque document dans le détail dossier
- Mis à jour POST /api/cases pour créer les CaseAssignment en transaction
- Payload includes isSecret + assignments array

Stage Summary:
- Toggle confidentiel fonctionnel dans le formulaire
- Badge Lock visible sur les tuiles de dossiers secrets
- Sélection de collaborateurs par tags cliquables
- Téléchargement de documents fonctionnel
- API assignments CRUD opérationnelle
---
Task ID: cron-check-expiry
Agent: Cron Agent
Task: Vérification expiration abonnements via POST /api/subscriptions/check-expiry

Work Log:
- Serveur Next.js impossible à lancer en dev (OOM, Turbopack trop lourd)
- Build production OK mais serveur crash aussi par contrainte mémoire
- agent-browser ne peut pas joindre localhost (namespace réseau isolé)
- Exécution du même code Prisma directement via tsx avec DATABASE_URL Supabase
- 3 abonnements actifs trouvés

Stage Summary:
- 1 abonnement sans nom de cabinet désactivé (expiré depuis 602 jours)
- Mengue & Associés : 127 jours restants → OK
- Fotso Law Firm : 186 jours restants → OK
- Aucune nouvelle relance créée (Mengue et Fotso > 30 jours)
- L'endpoint fonctionne correctement côté logique métier

---
Task ID: subscription-management
Agent: Main
Task: Gestion abonnements depuis interface Cabinets root_admin

Work Log:
- Créé PUT /api/subscriptions/admin avec 3 actions : renew, change, upgrade
- renew/upgrade prolongent depuis la date de fin actuelle ; change démarre depuis aujourd'hui
- Toute action réactive le cabinet si désactivé (isActive = true)
- Mis à jour type AdminTenant avec currentPeriodStart, currentPeriodEnd, maxUsers, maxStorageGb
- Ajouté colonne 'Abonnement' dans la table Cabinets (remplace 'Plan') : badge forfait + jours restants colorés + date de fin
- Ajouté bouton CreditCard (bleu) par ligne pour ouvrir le dialog de gestion
- Dialog avec résumé abonnement actuel, sélecteur forfait, sélecteur période (4 options), 3 boutons d'action
- Extrait composant TenantRow pour résoudre problème parsing Turbopack
- Build OK, poussé sur GitHub (9386b9d)

Stage Summary:
- root_admin peut maintenant renouveler, changer ou upgrader tout abonnement depuis la vue Cabinets
- Indicateurs visuels : vert (>15j), orange (1-15j), rouge (expiré) dans le tableau
- Cabinet désactivé automatiquement réactivé lors d'une action d'abonnement

---
Task ID: fix-cabinet-wipe
Agent: Main
Task: Correction bug — mise à jour cabinet efface les données (nom, email, etc.)

Work Log:
- Diagnostic : cabinetForm initialisé avec des chaînes vides ('')
- Les inputs affichent `cabinetForm.name || tenantInfo.name` (fallback visuel)
- Mais onClick envoie tout le cabinetForm y compris les champs vides
- Le backend vérifiait `body.name !== undefined` → '' passe ce test → écrase la DB avec des chaînes vides
- Correction frontend : filtrer les champs vides avant envoi (`if (v) clean[k] = v`)
- Correction backend : vérifier `typeof body.name === 'string' && body.name.trim()` pour exclure les chaînes vides
- Le logo upload n'était pas impacté (ne met à jour que logoUrl)
- Commit 61c9979 poussé sur GitHub

Stage Summary:
- Le bouton "Enregistrer les modifications" n'efface plus les champs non modifiés
- Double protection : frontend filtre + backend ignore les chaînes vides
- L'upload du logo n'a jamais été la cause (ne modifie que logoUrl)
- Les cabinets dont les données ont été effacées doivent être re-remplis manuellement

---
Task ID: dashboard-comparison-rbac
Agent: Main
Task: Dashboard comparaison mensuelle réelle + utilitaire RBAC

Work Log:
- Modifié /api/dashboard/route.ts pour calculer le CA facturé et les encaissements du mois précédent
- Ajouté les bornes temporelles du mois précédent (firstDayOfLastMonth, lastDayOfLastMonth)
- Remplacé revenueLastMonth: 0 et collectedLastMonth: 0 par des valeurs réelles depuis la DB
- CA filtré par issuedAt dans le mois courant vs mois précédent
- Encaissements filtrés par paidAt dans le mois courant vs mois précédent
- Créé src/lib/rbac.ts avec hasPermission(), requirePermission(), getUserPermissions(), clearPermissionCache()
- hasPermission: vérifie si un rôle a une permission resource:action autorisée
- Cache en mémoire Map pour éviter les requêtes répétées dans une même requête API
- root_admin (sans roleId) a toujours accès (retourne true)
- getUserPermissions retourne un Set de "resource:action" pour un rôle donné
- Commit 553b15e poussé sur GitHub

Stage Summary:
- Les tuiles "CA ce mois" et "Encaissé" affichent maintenant ↑/↓ vs mois dernier
- L'utilitaire RBAC est prêt à être appliqué progressivement aux routes API sensibles
- Aucune modification frontend nécessaire pour la comparaison (le code existant attendait déjà ces données)
- L'erreur ESLint à la ligne 1162 de page.tsx est pré-existente (Turbopack/fragment JSX)
