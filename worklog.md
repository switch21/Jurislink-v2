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