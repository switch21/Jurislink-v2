SET session_replication_role = 'replica';

-- Section 7: Users
INSERT INTO users (id, full_name, email, password, role_id, tenant_id, phone, is_active, preferred_language, created_at, updated_at)
VALUES
  ('a1000000-0007-0000-0000-000000000001', 'Administrateur Système', 'admin@jurislink.com', '$2b$10$plfP9RPtwfQ0F.l0XRXCIOpNU5BHeWreWm9my1Rxr36D/.IbCW9j6', 'a1000000-0002-0000-0000-000000000001', NULL, NULL, true, 'fr', NOW(), NOW()),
  ('a1000000-0007-0000-0000-000000000002', 'Maître Mbeki', 'mbeki@jurislink.com', '$2b$10$plfP9RPtwfQ0F.l0XRXCIOpNU5BHeWreWm9my1Rxr36D/.IbCW9j6', 'a1000000-0002-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', '+237 6 11 22 33', true, 'fr', NOW(), NOW()),
  ('a1000000-0007-0000-0000-000000000003', 'Me Ngassa Paul', 'ngassa@jurislink.com', '$2b$10$plfP9RPtwfQ0F.l0XRXCIOpNU5BHeWreWm9my1Rxr36D/.IbCW9j6', 'a1000000-0002-0000-0000-000000000004', 'a1000000-0005-0000-0000-000000000001', '+237 6 55 44 33', true, 'fr', NOW(), NOW()),
  ('a1000000-0007-0000-0000-000000000004', 'Me Fotso Marie', 'fotso@jurislink.com', '$2b$10$plfP9RPtwfQ0F.l0XRXCIOpNU5BHeWreWm9my1Rxr36D/.IbCW9j6', 'a1000000-0002-0000-0000-000000000004', 'a1000000-0005-0000-0000-000000000001', '+237 6 77 88 99', true, 'fr', NOW(), NOW()),
  ('a1000000-0007-0000-0000-000000000005', 'Tchinda Armand', 'tchinda@jurislink.com', '$2b$10$plfP9RPtwfQ0F.l0XRXCIOpNU5BHeWreWm9my1Rxr36D/.IbCW9j6', 'a1000000-0002-0000-0000-000000000005', 'a1000000-0005-0000-0000-000000000001', '+237 6 33 22 11', true, 'fr', NOW(), NOW()),
  ('a1000000-0007-0000-0000-000000000006', 'Ache Clémentine', 'ache@jurislink.com', '$2b$10$plfP9RPtwfQ0F.l0XRXCIOpNU5BHeWreWm9my1Rxr36D/.IbCW9j6', 'a1000000-0002-0000-0000-000000000006', 'a1000000-0005-0000-0000-000000000001', NULL, true, 'fr', NOW(), NOW()),
  ('a1000000-0007-0000-0000-000000000007', 'Kamga Comptable', 'kamga.cpt@jurislink.com', '$2b$10$plfP9RPtwfQ0F.l0XRXCIOpNU5BHeWreWm9my1Rxr36D/.IbCW9j6', 'a1000000-0002-0000-0000-000000000007', 'a1000000-0005-0000-0000-000000000001', NULL, true, 'fr', NOW(), NOW()),
  ('a1000000-0007-0000-0000-000000000008', 'Me Ndong', 'ndong@jurislink.com', '$2b$10$plfP9RPtwfQ0F.l0XRXCIOpNU5BHeWreWm9my1Rxr36D/.IbCW9j6', 'a1000000-0002-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000002', '+241 07 55 66 77', true, 'fr', NOW(), NOW()),
  ('a1000000-0007-0000-0000-000000000009', 'Okoue Sandrine', 'okoue@jurislink.com', '$2b$10$plfP9RPtwfQ0F.l0XRXCIOpNU5BHeWreWm9my1Rxr36D/.IbCW9j6', 'a1000000-0002-0000-0000-000000000006', 'a1000000-0005-0000-0000-000000000002', NULL, true, 'fr', NOW(), NOW());

-- Section 8: Clients
INSERT INTO clients (id, full_name, company, email, phone, city, country, client_type, risk_level, source, niu, notes, responsible_lawyer_id, last_activity_at, tenant_id, created_at, updated_at)
VALUES
  ('a1000000-0008-0000-0000-000000000001', 'Jean Kamga', 'Kamga SARL', 'j.kamga@email.com', '+237 6 99 11 22', 'Douala', 'Cameroun', 'entreprise', 'moyen', 'recommandation', '123456789A', 'Client fidèle depuis 2022', 'a1000000-0007-0000-0000-000000000003', NOW() - interval '1 day', 'a1000000-0005-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-0008-0000-0000-000000000002', 'Fatou Diallo', 'Diallo & Fils', 'f.diallo@email.com', '+237 6 88 22 11', 'Douala', 'Cameroun', 'entreprise', 'faible', 'internet', NULL, NULL, NULL, NOW() - interval '3 days', 'a1000000-0005-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-0008-0000-0000-000000000003', 'Ibrahim Hadj', NULL, 'i.hadj@email.com', '+237 6 77 33 44', 'Yaoundé', 'Cameroun', 'particulier', 'eleve', 'bouche_a_oreille', NULL, 'Difficultés de paiement antérieures', 'a1000000-0007-0000-0000-000000000004', NOW(), 'a1000000-0005-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-0008-0000-0000-000000000004', 'Aïcha Bello', 'Bello Enterprises', 'a.bello@email.com', '+237 6 66 55 44', 'Douala', 'Cameroun', 'entreprise', 'faible', NULL, NULL, NULL, NULL, NOW() - interval '7 days', 'a1000000-0005-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-0008-0000-0000-000000000005', 'Olivier Dupont', NULL, 'o.dupont@email.com', '+237 6 55 66 77', 'Douala', 'Cameroun', 'particulier', 'faible', 'internet', NULL, NULL, 'a1000000-0007-0000-0000-000000000003', NOW() - interval '45 days', 'a1000000-0005-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-0008-0000-0000-000000000006', 'Pierre Epee', 'Epee & Co', 'p.epee@email.com', '+237 6 44 33 22', 'Douala', 'Cameroun', 'entreprise', 'moyen', 'recommandation', '987654321B', 'Ancien client du cabinet Ndong', 'a1000000-0007-0000-0000-000000000004', NOW(), 'a1000000-0005-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-0008-0000-0000-000000000007', 'Solange Nkoulou', NULL, 's.nkoulou@email.com', '+237 6 22 11 00', 'Douala', 'Cameroun', 'particulier', 'eleve', 'bouche_a_oreille', NULL, NULL, 'a1000000-0007-0000-0000-000000000003', NOW() - interval '2 days', 'a1000000-0005-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-0008-0000-0000-000000000008', 'André Mbarga', 'Mbarga Consulting', 'a.mbarga@email.com', '+237 6 33 44 55', 'Yaoundé', 'Cameroun', 'entreprise', 'faible', 'internet', NULL, NULL, NULL, NULL, 'a1000000-0005-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-0008-0000-0000-000000000009', 'Paul Ondo', 'Ondo Import', 'p.ondo@email.com', '+241 06 11 22 33', 'Libreville', 'Gabon', 'entreprise', 'faible', NULL, NULL, NULL, 'a1000000-0007-0000-0000-000000000008', NULL, 'a1000000-0005-0000-0000-000000000002', NOW(), NOW()),
  ('a1000000-0008-0000-0000-000000000010', 'Marie Nzoussi', NULL, 'm.nzoussi@email.com', '+241 06 44 55 66', 'Libreville', 'Gabon', 'particulier', 'moyen', NULL, NULL, NULL, NULL, NULL, 'a1000000-0005-0000-0000-000000000002', NOW(), NOW());

-- Section 9: Cases
INSERT INTO cases (id, reference, title, description, case_type, status, priority, client_id, tenant_id, adversary, jurisdiction, amount_in_dispute, billing_type, is_secret, outcome, created_at, updated_at)
VALUES
  ('a1000000-0009-0000-0000-000000000001', 'DOU-2025-001', 'Litige foncier Kamga SARL', 'Contentieux portant sur un terrain de 2000m² à Douala Bonapriso', 'civil', 'en_cours', 'haute', 'a1000000-0008-0000-0000-000000000001', 'a1000000-0005-0000-0000-000000000001', 'Société ABC Immo', 'TPI de Douala', 25000000, 'forfait', false, NULL, NOW() - interval '30 days', NOW()),
  ('a1000000-0009-0000-0000-000000000002', 'DOU-2025-002', 'Licenciement abusif - Diallo', 'Contestation d''un licenciement sans motif légitime', 'social', 'ouvert', 'normal', 'a1000000-0008-0000-0000-000000000002', 'a1000000-0005-0000-0000-000000000001', 'Société Diallo & Fils (employeur)', 'Tribunal du Travail de Douala', 8000000, 'horaire', false, NULL, NOW() - interval '14 days', NOW()),
  ('a1000000-0009-0000-0000-000000000003', 'DOU-2025-003', 'Recouvrement créances Hadj', 'Recouvrement de créances impayées d''un montant de 15M FCFA', 'commercial', 'en_attente', 'haute', 'a1000000-0008-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', 'Société XYZ Trading', 'Tribunal de Commerce de Douala', 15000000, 'provision', false, NULL, NOW() - interval '21 days', NOW()),
  ('a1000000-0009-0000-0000-000000000004', 'DOU-2025-004', 'Divorce Bello', 'Procédure de divorce contentieux', 'civil', 'nouveau', 'basse', 'a1000000-0008-0000-0000-000000000004', 'a1000000-0005-0000-0000-000000000001', NULL, 'TPI de Douala', NULL, NULL, true, NULL, NOW() - interval '5 days', NOW()),
  ('a1000000-0009-0000-0000-000000000005', 'DOU-2024-010', 'Constitution société Dupont', 'Création de SARL et formalités associées', 'commercial', 'ferme', 'normal', 'a1000000-0008-0000-0000-000000000005', 'a1000000-0005-0000-0000-000000000001', NULL, NULL, NULL, 'forfait', false, 'favorable', NOW() - interval '90 days', NOW()),
  ('a1000000-0009-0000-0000-000000000006', 'DOU-2025-005', 'Litige commercial Epee c/ Société X', 'Litige portant sur la livraison de marchandises non conformes', 'commercial', 'en_cours', 'urgente', 'a1000000-0008-0000-0000-000000000006', 'a1000000-0005-0000-0000-000000000001', 'Société X Import-Export', 'Tribunal de Commerce de Douala', 35000000, 'success_fee', false, NULL, NOW() - interval '10 days', NOW()),
  ('a1000000-0009-0000-0000-000000000007', 'DOU-2025-006', 'Affaire pénale Nkoulou', 'Défense dans une affaire de détention illégale de produits', 'penal', 'ouvert', 'haute', 'a1000000-0008-0000-0000-000000000007', 'a1000000-0005-0000-0000-000000000001', 'Ministère Public', 'Tribunal Correctionnel de Douala', NULL, 'horaire', false, NULL, NOW() - interval '7 days', NOW()),
  ('a1000000-0009-0000-0000-000000000008', 'DOU-2025-007', 'Contentieux administratif Mbarga', 'Recours contre un arrêté préfectoral', 'administratif', 'nouveau', 'normal', 'a1000000-0008-0000-0000-000000000008', 'a1000000-0005-0000-0000-000000000001', 'Préfecture du Wouri', 'Tribunal Administratif de Douala', NULL, 'forfait', false, NULL, NOW() - interval '2 days', NOW()),
  ('a1000000-0009-0000-0000-000000000009', 'DOU-2025-008', 'Conseil juridique - Bello Enterprises', 'Mission de conseil en droit des sociétés', 'commercial', 'en_cours', 'normal', 'a1000000-0008-0000-0000-000000000004', 'a1000000-0005-0000-0000-000000000001', NULL, NULL, NULL, 'horaire', false, NULL, NOW() - interval '12 days', NOW()),
  ('a1000000-0009-0000-0000-000000000010', 'LBV-2025-001', 'Litige contractuel Ondo Import', 'Non-respect des clauses contractuelles par le fournisseur', 'commercial', 'en_cours', 'haute', 'a1000000-0008-0000-0000-000000000009', 'a1000000-0005-0000-0000-000000000002', 'Gabi Supplies SARL', 'TPI de Libreville', 12000000, 'forfait', false, NULL, NOW() - interval '20 days', NOW()),
  ('a1000000-0009-0000-0000-000000000011', 'LBV-2025-002', 'Succession Nzoussi', 'Partage de succession litigieux', 'civil', 'ouvert', 'normal', 'a1000000-0008-0000-0000-000000000010', 'a1000000-0005-0000-0000-000000000002', NULL, 'TPI de Libreville', NULL, 'forfait', false, NULL, NOW() - interval '8 days', NOW());

-- Section 10: Case Assignments (pas de created_at dans le schéma)
INSERT INTO case_assignments (id, user_id, case_id, tenant_id)
VALUES
  ('a1000000-000a-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000002', 'a1000000-0007-0000-0000-000000000004', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000003', 'a1000000-0007-0000-0000-000000000005', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000004', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0009-0000-0000-000000000002', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000005', 'a1000000-0007-0000-0000-000000000006', 'a1000000-0009-0000-0000-000000000002', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000006', 'a1000000-0007-0000-0000-000000000004', 'a1000000-0009-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000007', 'a1000000-0007-0000-0000-000000000005', 'a1000000-0009-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000008', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0009-0000-0000-000000000004', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000009', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0009-0000-0000-000000000005', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000010', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0009-0000-0000-000000000006', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000011', 'a1000000-0007-0000-0000-000000000004', 'a1000000-0009-0000-0000-000000000006', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000012', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0009-0000-0000-000000000007', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000013', 'a1000000-0007-0000-0000-000000000004', 'a1000000-0009-0000-0000-000000000007', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000014', 'a1000000-0007-0000-0000-000000000002', 'a1000000-0009-0000-0000-000000000008', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000015', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0009-0000-0000-000000000009', 'a1000000-0005-0000-0000-000000000001'),
  ('a1000000-000a-0000-0000-000000000016', 'a1000000-0007-0000-0000-000000000008', 'a1000000-0009-0000-0000-000000000010', 'a1000000-0005-0000-0000-000000000002'),
  ('a1000000-000a-0000-0000-000000000017', 'a1000000-0007-0000-0000-000000000009', 'a1000000-0009-0000-0000-000000000010', 'a1000000-0005-0000-0000-000000000002'),
  ('a1000000-000a-0000-0000-000000000018', 'a1000000-0007-0000-0000-000000000008', 'a1000000-0009-0000-0000-000000000011', 'a1000000-0005-0000-0000-000000000002');

-- Section 11: Events (pas de updated_at dans le schéma)
INSERT INTO events (id, title, description, start_time, end_time, event_type, criticality, tenant_id, case_id, created_at)
VALUES
  ('a1000000-000b-0000-0000-000000000001', 'Audience - TGI Douala', 'Audience principale dossier Kamga', NOW() + interval '2 days', NULL, 'audience', 'urgente', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', NOW()),
  ('a1000000-000b-0000-0000-000000000002', 'Réunion client Diallo', 'Préparation du dossier', NOW() + interval '3 days', NULL, 'rdv', 'normal', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000002', NOW()),
  ('a1000000-000b-0000-0000-000000000003', 'Échéance dépôt mémoire Hadj', 'Dépôt du mémoire en défense', NOW() + interval '1 day', NULL, 'echeance', 'urgente', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000003', NOW()),
  ('a1000000-000b-0000-0000-000000000004', 'Consultation M. Dupont', 'Première consultation', NOW() + interval '5 days', NULL, 'rdv', 'basse', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000005', NOW()),
  ('a1000000-000b-0000-0000-000000000005', 'Audience - Tribunal Commerce Douala', 'Affaire recouvrement créances Hadj', NOW() + interval '6 days', NULL, 'audience', 'haute', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000003', NOW()),
  ('a1000000-000b-0000-0000-000000000006', 'Audience urgente Epee - Référé', 'Ordonnance de référé - dossier Epee c/ Société X', NOW() + interval '12 hours', NULL, 'audience', 'urgente', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000006', NOW()),
  ('a1000000-000b-0000-0000-000000000007', 'Dépôt conclusions Kamga', 'Dépôt des conclusions récapitulatives', NOW() + interval '4 days', NULL, 'depot', 'haute', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', NOW()),
  ('a1000000-000b-0000-0000-000000000008', 'Audience pénale Nkoulou', 'Audience au Tribunal Correctionnel', NOW() + interval '3 hours', NOW() + interval '5 hours', 'audience', 'haute', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000007', NOW()),
  ('a1000000-000b-0000-0000-000000000009', 'Première audience Kamga', 'Audience reportée - pièces complémentaires demandées', NOW() - interval '5 days', NOW() - interval '5 days', 'audience', 'normale', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', NOW()),
  ('a1000000-000b-0000-0000-000000000010', 'Audience - TPI Libreville', 'Audience dossier Ondo Import', NOW() + interval '4 days', NULL, 'audience', 'haute', 'a1000000-0005-0000-0000-000000000002', 'a1000000-0009-0000-0000-000000000010', NOW());

-- Section 12: Event Assignments (pas de tenant_id ni created_at dans le schéma)
INSERT INTO event_assignments (id, user_id, event_id)
VALUES
  ('a1000000-000c-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', 'a1000000-000b-0000-0000-000000000001'),
  ('a1000000-000c-0000-0000-000000000002', 'a1000000-0007-0000-0000-000000000004', 'a1000000-000b-0000-0000-000000000001'),
  ('a1000000-000c-0000-0000-000000000003', 'a1000000-0007-0000-0000-000000000003', 'a1000000-000b-0000-0000-000000000002'),
  ('a1000000-000c-0000-0000-000000000004', 'a1000000-0007-0000-0000-000000000004', 'a1000000-000b-0000-0000-000000000003'),
  ('a1000000-000c-0000-0000-000000000005', 'a1000000-0007-0000-0000-000000000005', 'a1000000-000b-0000-0000-000000000003'),
  ('a1000000-000c-0000-0000-000000000006', 'a1000000-0007-0000-0000-000000000003', 'a1000000-000b-0000-0000-000000000004'),
  ('a1000000-000c-0000-0000-000000000007', 'a1000000-0007-0000-0000-000000000003', 'a1000000-000b-0000-0000-000000000005'),
  ('a1000000-000c-0000-0000-000000000008', 'a1000000-0007-0000-0000-000000000004', 'a1000000-000b-0000-0000-000000000005'),
  ('a1000000-000c-0000-0000-000000000009', 'a1000000-0007-0000-0000-000000000003', 'a1000000-000b-0000-0000-000000000006'),
  ('a1000000-000c-0000-0000-000000000010', 'a1000000-0007-0000-0000-000000000004', 'a1000000-000b-0000-0000-000000000006'),
  ('a1000000-000c-0000-0000-000000000011', 'a1000000-0007-0000-0000-000000000003', 'a1000000-000b-0000-0000-000000000007'),
  ('a1000000-000c-0000-0000-000000000012', 'a1000000-0007-0000-0000-000000000005', 'a1000000-000b-0000-0000-000000000007'),
  ('a1000000-000c-0000-0000-000000000013', 'a1000000-0007-0000-0000-000000000003', 'a1000000-000b-0000-0000-000000000008'),
  ('a1000000-000c-0000-0000-000000000014', 'a1000000-0007-0000-0000-000000000004', 'a1000000-000b-0000-0000-000000000008'),
  ('a1000000-000c-0000-0000-000000000015', 'a1000000-0007-0000-0000-000000000003', 'a1000000-000b-0000-0000-000000000009'),
  ('a1000000-000c-0000-0000-000000000016', 'a1000000-0007-0000-0000-000000000008', 'a1000000-000b-0000-0000-000000000010');

-- Section 13: Invoices
INSERT INTO invoices (id, invoice_number, type, amount, paid_amount, status, issued_at, due_date, client_id, tenant_id, case_id, currency_id, billing_type, reminder_level, last_reminder_at, notes, created_at, updated_at)
VALUES
  ('a1000000-000d-0000-0000-000000000001', 'FAC-2025-001', 'facture', 500000, 500000, 'paye', NOW() - interval '45 days', NOW() - interval '30 days', 'a1000000-0008-0000-0000-000000000001', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'forfait', NULL, NULL, 'Honoraires provision dossier foncier', NOW(), NOW()),
  ('a1000000-000d-0000-0000-000000000002', 'FAC-2025-002', 'facture', 300000, 150000, 'partiel', NOW() - interval '40 days', NOW() - interval '10 days', 'a1000000-0008-0000-0000-000000000002', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', NULL, 1, NOW() - interval '5 days', 'Premier versement reçu', NOW(), NOW()),
  ('a1000000-000d-0000-0000-000000000003', 'FAC-2025-003', 'facture', 750000, 0, 'non_paye', NOW() - interval '35 days', NOW() - interval '15 days', 'a1000000-0008-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', NULL, 2, NOW() - interval '3 days', 'Relance envoyée par courrier', NOW(), NOW()),
  ('a1000000-000d-0000-0000-000000000004', 'FAC-2024-015', 'facture', 200000, 200000, 'paye', NOW() - interval '120 days', NOW() - interval '105 days', 'a1000000-0008-0000-0000-000000000005', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'forfait', NULL, NULL, NULL, NOW(), NOW()),
  ('a1000000-000d-0000-0000-000000000005', 'FAC-2025-004', 'avoir', 150000, 0, 'annule', NOW() - interval '20 days', NULL, 'a1000000-0008-0000-0000-000000000004', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', NULL, NULL, NULL, 'Avoir émis pour erreur de facturation', NOW(), NOW()),
  ('a1000000-000d-0000-0000-000000000006', 'FAC-2025-005', 'facture', 1200000, 0, 'non_paye', NOW() - interval '25 days', NOW() - interval '5 days', 'a1000000-0008-0000-0000-000000000006', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001', NULL, 3, NOW() - interval '1 day', 'Mise en demeure envisagée', NOW(), NOW()),
  ('a1000000-000d-0000-0000-000000000007', 'FAC-2025-006', 'facture', 400000, 400000, 'paye', NOW() - interval '5 days', NOW() + interval '25 days', 'a1000000-0008-0000-0000-000000000001', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'horaire', NULL, NULL, NULL, NOW(), NOW()),
  ('a1000000-000d-0000-0000-000000000008', 'DEV-2025-001', 'devis', 2500000, 0, 'non_paye', NOW() - interval '1 day', NULL, 'a1000000-0008-0000-0000-000000000008', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001', 'forfait', NULL, NULL, NULL, NOW(), NOW()),
  ('a1000000-000d-0000-0000-000000000009', 'FAC-2024-020', 'facture', 350000, 350000, 'paye', NOW() - interval '40 days', NOW() - interval '25 days', 'a1000000-0008-0000-0000-000000000001', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('a1000000-000d-0000-0000-000000000010', 'REC-2025-001', 'recu', 150000, 150000, 'paye', NOW() - interval '10 days', NULL, 'a1000000-0008-0000-0000-000000000002', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', NULL, NULL, NULL, NULL, NOW(), NOW()),
  ('a1000000-000d-0000-0000-000000000011', 'LBV-FAC-2025-001', 'facture', 600000, 0, 'non_paye', NOW() - interval '15 days', NOW() - interval '3 days', 'a1000000-0008-0000-0000-000000000009', 'a1000000-0005-0000-0000-000000000002', 'a1000000-0009-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001', NULL, NULL, NULL, NULL, NOW(), NOW());

-- Section 14: Invoice Line Items (pas de created_at dans le schéma)
INSERT INTO invoice_line_items (id, description, quantity, unit_price, total, sort_order, invoice_id)
VALUES
  ('a1000000-000e-0000-0000-000000000001', 'Honoraires provision - Dossier foncier', 1, 500000, 500000, 0, 'a1000000-000d-0000-0000-000000000001'),
  ('a1000000-000e-0000-0000-000000000002', 'Consultation juridique initiale', 2, 75000, 150000, 0, 'a1000000-000d-0000-0000-000000000002'),
  ('a1000000-000e-0000-0000-000000000003', 'Rédaction conclusions', 1, 150000, 150000, 1, 'a1000000-000d-0000-0000-000000000002'),
  ('a1000000-000e-0000-0000-000000000004', 'Étude du dossier recouvrement', 1, 500000, 500000, 0, 'a1000000-000d-0000-0000-000000000003'),
  ('a1000000-000e-0000-0000-000000000005', 'Mise en demeure', 1, 250000, 250000, 1, 'a1000000-000d-0000-0000-000000000003'),
  ('a1000000-000e-0000-0000-000000000006', 'Constitution SARL - Forfait global', 1, 200000, 200000, 0, 'a1000000-000d-0000-0000-000000000004'),
  ('a1000000-000e-0000-0000-000000000007', 'Urgence référé - heures supplémentaires', 1, 1200000, 1200000, 0, 'a1000000-000d-0000-0000-000000000006'),
  ('a1000000-000e-0000-0000-000000000008', 'Recherche jurisprudence (3h)', 3, 25000, 75000, 0, 'a1000000-000d-0000-0000-000000000007'),
  ('a1000000-000e-0000-0000-000000000009', 'Rédaction assignation (5h)', 5, 25000, 125000, 1, 'a1000000-000d-0000-0000-000000000007'),
  ('a1000000-000e-0000-0000-000000000010', 'Représentation audience (8h)', 8, 25000, 200000, 2, 'a1000000-000d-0000-0000-000000000007');

-- Section 15: Payments (pas de updated_at dans le schéma)
INSERT INTO payments (id, amount, method, reference, status, paid_at, notes, tenant_id, invoice_id, recorded_by, created_at)
VALUES
  ('a1000000-000f-0000-0000-000000000001', 500000, 'virement', 'VIR-2025-001', 'complet', NOW() - interval '42 days', 'Virement bancaire BICEC', 'a1000000-0005-0000-0000-000000000001', 'a1000000-000d-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000007', NOW()),
  ('a1000000-000f-0000-0000-000000000002', 150000, 'mobile_money', 'MM-2025-001', 'complet', NOW() - interval '35 days', 'Paiement MTN Mobile Money', 'a1000000-0005-0000-0000-000000000001', 'a1000000-000d-0000-0000-000000000002', 'a1000000-0007-0000-0000-000000000007', NOW()),
  ('a1000000-000f-0000-0000-000000000003', 200000, 'especes', NULL, 'complet', NOW() - interval '115 days', 'Paiement en espèces', 'a1000000-0005-0000-0000-000000000001', 'a1000000-000d-0000-0000-000000000004', 'a1000000-0007-0000-0000-000000000007', NOW()),
  ('a1000000-000f-0000-0000-000000000004', 400000, 'virement', 'VIR-2025-005', 'complet', NOW() - interval '3 days', 'Virement SG Douala', 'a1000000-0005-0000-0000-000000000001', 'a1000000-000d-0000-0000-000000000007', 'a1000000-0007-0000-0000-000000000007', NOW()),
  ('a1000000-000f-0000-0000-000000000005', 350000, 'cheque', 'CHQ-2025-001', 'complet', NOW() - interval '38 days', 'Chèque Société Générale', 'a1000000-0005-0000-0000-000000000001', 'a1000000-000d-0000-0000-000000000009', 'a1000000-0007-0000-0000-000000000007', NOW()),
  ('a1000000-000f-0000-0000-000000000006', 150000, 'mobile_money', 'MM-2025-002', 'complet', NOW() - interval '8 days', 'Paiement Orange Money', 'a1000000-0005-0000-0000-000000000001', 'a1000000-000d-0000-0000-000000000010', 'a1000000-0007-0000-0000-000000000007', NOW());

-- Section 16: Documents
INSERT INTO documents (id, file_name, file_size, file_path, version, folder, tags, document_type, mime_type, description, status, tenant_id, case_id, uploaded_by_id, created_at, updated_at)
VALUES
  ('a1000000-0010-0000-0000-000000000001', 'assignation_tgi_kamga.pdf', 245760, '/uploads/assignation_tgi_kamga.pdf', 1, 'Procédure', 'assignation,tribunal,tgi', 'assignation', 'application/pdf', 'Assignation du TGI de Douala pour le litige foncier', 'actif', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', NOW(), NOW()),
  ('a1000000-0010-0000-0000-000000000002', 'titre_foncier_kamga.pdf', 524288, '/uploads/titre_foncier_kamga.pdf', 1, 'Pièces client', 'foncier,titre,propriété', 'titre', 'application/pdf', 'Copie du titre foncier contesté', 'actif', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000004', NOW(), NOW()),
  ('a1000000-0010-0000-0000-000000000003', 'contrat_diallo.pdf', 184320, '/uploads/contrat_diallo.pdf', 1, 'Contrats', 'travail,cdi', 'contrat', 'application/pdf', 'Contrat de travail de Mme Diallo', 'actif', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000002', 'a1000000-0007-0000-0000-000000000003', NOW(), NOW()),
  ('a1000000-0010-0000-0000-000000000004', 'fiches_paie_diallo.pdf', 327680, '/uploads/fiches_paie_diallo.pdf', 1, 'Pièces client', 'paie,salaire', 'fiche_paie', 'application/pdf', 'Fiches de paie des 12 derniers mois', 'actif', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000002', 'a1000000-0007-0000-0000-000000000006', NOW(), NOW()),
  ('a1000000-0010-0000-0000-000000000005', 'facture_hadj.pdf', 102400, '/uploads/facture_hadj.pdf', 1, 'Factures', 'facture,impayé', 'facture', 'application/pdf', 'Facture impayée de 15M FCFA', 'actif', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000003', 'a1000000-0007-0000-0000-000000000004', NOW(), NOW()),
  ('a1000000-0010-0000-0000-000000000006', 'mise_en_demeure_hadj.pdf', 81920, '/uploads/mise_en_demeure_hadj.pdf', 1, 'Correspondances', 'mise_en_demeure,relance', 'correspondance', 'application/pdf', 'Lettre de mise en demeure envoyée', 'actif', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000003', 'a1000000-0007-0000-0000-000000000003', NOW(), NOW()),
  ('a1000000-0010-0000-0000-000000000007', 'acte_mariage_bello.pdf', 204800, '/uploads/acte_mariage_bello.pdf', 1, 'Pièces client', 'mariage,etat_civil', 'acte', 'application/pdf', 'Acte de mariage du couple Bello', 'actif', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000004', 'a1000000-0007-0000-0000-000000000003', NOW(), NOW()),
  ('a1000000-0010-0000-0000-000000000008', 'statuts_dupont_sarl.pdf', 409600, '/uploads/statuts_dupont_sarl.pdf', 1, 'Contrats', 'statuts,sarl,constitution', 'statuts', 'application/pdf', 'Statuts de la SARL Dupont', 'actif', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000005', 'a1000000-0007-0000-0000-000000000003', NOW(), NOW()),
  ('a1000000-0010-0000-0000-000000000009', 'pv_ag_dupont.pdf', 153600, '/uploads/pv_ag_dupont.pdf', 1, 'Procédure', 'pv,ag,constitutive', 'pv', 'application/pdf', 'PV de l''assemblée générale constitutive', 'actif', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000005', 'a1000000-0007-0000-0000-000000000006', NOW(), NOW()),
  ('a1000000-0010-0000-0000-000000000010', 'commande_epee.pdf', 125000, '/uploads/commande_epee.pdf', 1, 'Pièces client', 'commande,marchandises', 'contrat', 'application/pdf', 'Bon de commande initial', 'actif', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000006', 'a1000000-0007-0000-0000-000000000003', NOW(), NOW()),
  ('a1000000-0010-0000-0000-000000000011', 'conclusions_kamga_v3.docx', 95000, '/uploads/conclusions_kamga_v3.docx', 1, 'Brouillons', 'conclusions,brouillon', 'conclusions', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Conclusions récapitulatives - en cours de révision', 'brouillon', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000005', NOW(), NOW()),
  ('a1000000-0010-0000-0000-000000000012', 'certificat_nkoulou.pdf', 75000, '/uploads/certificat_nkoulou.pdf', 1, 'Pièces client', 'certificat,penal', 'certificat', 'application/pdf', 'Certificat de bonne conduite - en attente de vérification', 'en_attente', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000007', 'a1000000-0007-0000-0000-000000000006', NOW(), NOW()),
  ('a1000000-0010-0000-0000-000000000013', 'arrete_prefectoral_mbarga.pdf', 180000, '/uploads/arrete_prefectoral_mbarga.pdf', 1, 'Pièces client', 'arrete,administratif', 'arrete', 'application/pdf', 'Copie de l''arrêté préfectoral contesté - en attente de validation', 'en_attente', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000008', 'a1000000-0007-0000-0000-000000000006', NOW(), NOW());

-- Section 17: Document Versions
INSERT INTO document_versions (id, version, file_name, file_size, file_path, mime_type, change_note, document_id, uploaded_by_id, created_at)
VALUES
  ('a1000000-0011-0000-0000-000000000001', 2, 'conclusions_kamga_v2.pdf', 310000, '/uploads/conclusions_kamga_v2.pdf', 'application/pdf', 'Ajout des pièces complémentaires demandées par le tribunal', 'a1000000-0010-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', NOW());

-- Section 18: Case Notes
INSERT INTO case_notes (id, content, case_id, author_id, tenant_id, created_at)
VALUES
  ('a1000000-0012-0000-0000-000000000001', 'Première audience reportée. Le tribunal a demandé des pièces complémentaires.', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', NOW() - interval '5 days'),
  ('a1000000-0012-0000-0000-000000000002', 'Documents complémentaires collectés auprès du client. Prêts pour le dépôt.', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000004', 'a1000000-0005-0000-0000-000000000001', NOW() - interval '3 days'),
  ('a1000000-0012-0000-0000-000000000003', 'Le client a fourni le contrat de travail et les fiches de paie. Analyse en cours.', 'a1000000-0009-0000-0000-000000000002', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', NOW() - interval '10 days'),
  ('a1000000-0012-0000-0000-000000000004', 'Dépôt de mémoire urgent. Client Hadj très préoccupé par les délais.', 'a1000000-0009-0000-0000-000000000003', 'a1000000-0007-0000-0000-000000000004', 'a1000000-0005-0000-0000-000000000001', NOW() - interval '2 days'),
  ('a1000000-0012-0000-0000-000000000005', 'Ordonnance de référé obtenue! Le juge a suspendu l''exécution. Victoire partielle.', 'a1000000-0009-0000-0000-000000000006', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', NOW() - interval '1 day'),
  ('a1000000-0012-0000-0000-000000000006', 'Témoin clé auditionné. Déclarations favorables à la défense.', 'a1000000-0009-0000-0000-000000000007', 'a1000000-0007-0000-0000-000000000004', 'a1000000-0005-0000-0000-000000000001', NOW() - interval '3 days');

-- Section 19: Tasks
INSERT INTO tasks (id, title, description, status, priority, due_date, tenant_id, case_id, event_id, created_at, updated_at)
VALUES
  ('a1000000-0013-0000-0000-000000000001', 'Vérifier dossier Kamga avant audience', 'Revoir toutes les pièces et préparer la trame argumentaire', 'en_cours_t', 'urgente', NOW() + interval '1 day', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', 'a1000000-000b-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-0013-0000-0000-000000000002', 'Préparer conclusions récapitulatives', 'Rédiger les conclusions pour le dossier Kamga', 'a_faire', 'haute', NOW() + interval '3 days', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', 'a1000000-000b-0000-0000-000000000007', NOW(), NOW()),
  ('a1000000-0013-0000-0000-000000000003', 'Dépôt mémoire défense Hadj', 'Finaliser et déposer le mémoire en défense', 'a_faire', 'urgente', NOW() + interval '1 day', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000003', 'a1000000-000b-0000-0000-000000000003', NOW(), NOW()),
  ('a1000000-0013-0000-0000-000000000004', 'Préparer pièces audience Epee', 'Rassembler tous les documents pour l''ordonnance de référé', 'a_faire', 'urgente', NOW() + interval '6 hours', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000006', 'a1000000-000b-0000-0000-000000000006', NOW(), NOW()),
  ('a1000000-0013-0000-0000-000000000005', 'Rédiger mise en demeure complémentaire', 'Suite au non-paiement de la FAC-2025-003', 'en_cours_t', 'haute', NOW() + interval '2 days', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000003', NULL, NOW(), NOW()),
  ('a1000000-0013-0000-0000-000000000006', 'Relancer client Diallo pour paiement', 'Second rappel pour solde restant FAC-2025-002', 'a_faire', 'normal', NOW() + interval '4 days', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000002', NULL, NOW(), NOW()),
  ('a1000000-0013-0000-0000-000000000007', 'Préparer rendez-vous client Dupont', 'Vérifier les documents de constitution SARL', 'terminee', 'basse', NOW() + interval '4 days', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000005', 'a1000000-000b-0000-0000-000000000004', NOW(), NOW()),
  ('a1000000-0013-0000-0000-000000000008', 'Archiver dossier Dupont', 'Classement définitif du dossier de constitution', 'terminee', 'normal', NULL, 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000005', NULL, NOW(), NOW()),
  ('a1000000-0013-0000-0000-000000000009', 'Vérifier certificat Nkoulou', 'Confirmer authenticité du certificat de bonne conduite', 'a_faire', 'haute', NOW() + interval '1 day', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000007', NULL, NOW(), NOW()),
  ('a1000000-0013-0000-0000-000000000010', 'Rédiger requête administrative Mbarga', 'Préparer le recours contre l''arrêté préfectoral', 'a_faire', 'normal', NOW() + interval '5 days', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000008', NULL, NOW(), NOW()),
  ('a1000000-0013-0000-0000-000000000011', 'Recherche jurisprudence foncière', 'Trouver des précédents similaires pour le dossier Kamga', 'a_faire', 'haute', NOW() + interval '2 days', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', NULL, NOW(), NOW()),
  ('a1000000-0013-0000-0000-000000000012', 'Préparer audience Ondo', 'Rassembler les pièces pour audience Libreville', 'a_faire', 'haute', NOW() + interval '3 days', 'a1000000-0005-0000-0000-000000000002', 'a1000000-0009-0000-0000-000000000010', 'a1000000-000b-0000-0000-000000000010', NOW(), NOW());

-- Section 20: Notifications (colonne 'read' boolean au lieu de 'read_at')
INSERT INTO notifications (id, title, message, category, resource_type, resource_id, tenant_id, user_id, created_at, read)
VALUES
  ('a1000000-0014-0000-0000-000000000001', 'Audience dans 2 jours', 'Dossier Kamga — Audience TGI Douala prévue dans 48h.', 'dossier', 'event', 'a1000000-000b-0000-0000-000000000001', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', NOW(), false),
  ('a1000000-0014-0000-0000-000000000002', 'Échéance dépôt mémoire demain', 'Le mémoire en défense du dossier Hadj doit être déposé demain.', 'dossier', 'event', 'a1000000-000b-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000004', NOW(), false),
  ('a1000000-0014-0000-0000-000000000003', 'Référé Epee dans 12h', 'Ordonnance de référé pour le dossier Epee c/ Société X dans 12 heures.', 'dossier', 'event', 'a1000000-000b-0000-0000-000000000006', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', NOW(), false),
  ('a1000000-0014-0000-0000-000000000004', 'Facture impayée depuis 15 jours', 'La facture FAC-2025-003 de 750 000 FCFA est impayée.', 'dossier', 'invoice', 'a1000000-000d-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000002', NOW(), false),
  ('a1000000-0014-0000-0000-000000000005', 'Facture impayée depuis 5 jours', 'La facture FAC-2025-005 de 1 200 000 FCFA est impayée.', 'dossier', 'invoice', 'a1000000-000d-0000-0000-000000000006', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000007', NOW(), false),
  ('a1000000-0014-0000-0000-000000000006', 'Nouvelle tâche assignée', 'Vérifier le dossier Kamga avant audience.', 'dossier', 'task', '00000000-0000-0000-0000-000000000000', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', NOW(), false),
  ('a1000000-0014-0000-0000-000000000007', 'Document en attente de validation', 'Le certificat de bonne conduite Nkoulou est en attente.', 'dossier', 'document', '00000000-0000-0000-0000-000000000000', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', NOW(), false),
  ('a1000000-0014-0000-0000-000000000008', 'Audience pénale aujourd''hui', 'Audience au Tribunal Correctionnel pour le dossier Nkoulou.', 'dossier', 'event', 'a1000000-000b-0000-0000-000000000008', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', NOW(), false),
  ('a1000000-0014-0000-0000-000000000009', 'Message reçu', 'Tchinda Armand vous a envoyé un message.', 'message', NULL, NULL, 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', NOW(), false);

-- Section 21: Messages (pas de read_at dans le schéma)
INSERT INTO messages (id, content, tenant_id, sender_id, receiver_id, created_at)
VALUES
  ('a1000000-0015-0000-0000-000000000001', 'Bonjour, avez-vous les pièces pour l''audience de demain ?', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0007-0000-0000-000000000004', NOW()),
  ('a1000000-0015-0000-0000-000000000002', 'Oui, tout est prêt. Je vous les envoie par mail.', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000004', 'a1000000-0007-0000-0000-000000000003', NOW()),
  ('a1000000-0015-0000-0000-000000000003', 'Merci ! On se retrouve au tribunal à 8h30.', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0007-0000-0000-000000000004', NOW()),
  ('a1000000-0015-0000-0000-000000000004', 'Bien noté. À demain !', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000004', 'a1000000-0007-0000-0000-000000000003', NOW()),
  ('a1000000-0015-0000-0000-000000000005', 'Le client Kamga souhaite fixer un rendez-vous cette semaine.', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000006', 'a1000000-0007-0000-0000-000000000003', NOW()),
  ('a1000000-0015-0000-0000-000000000006', 'Les conclusions pour Epee sont prêtes. Il faut les faire signer.', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000005', 'a1000000-0007-0000-0000-000000000003', NOW()),
  ('a1000000-0015-0000-0000-000000000007', 'J''ai préparé la mise en demeure Hadj. Peux-tu relancer ?', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000005', 'a1000000-0007-0000-0000-000000000004', NOW()),
  ('a1000000-0015-0000-0000-000000000008', 'Bien reçu, je m''en occupe ce matin.', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000004', 'a1000000-0007-0000-0000-000000000005', NOW());

-- Section 22: Audit Logs (colonne 'timestamp' au lieu de 'created_at')
INSERT INTO audit_logs (id, action, resource_type, resource_id, user_id, tenant_id, ip_address, user_agent, metadata, timestamp)
VALUES
  ('a1000000-0016-0000-0000-000000000001', 'LOGIN', NULL, NULL, 'a1000000-0007-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', '192.168.1.10', 'Mozilla/5.0', NULL, NOW()),
  ('a1000000-0016-0000-0000-000000000002', 'CASE_CREATED', 'case', 'a1000000-0009-0000-0000-000000000006', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', NULL, 'Mozilla/5.0', '{"title":"Litige commercial Epee"}', NOW()),
  ('a1000000-0016-0000-0000-000000000003', 'INVOICE_CREATED', 'invoice', 'a1000000-000d-0000-0000-000000000003', 'a1000000-0007-0000-0000-000000000007', 'a1000000-0005-0000-0000-000000000001', NULL, 'Mozilla/5.0', '{"amount":750000}', NOW()),
  ('a1000000-0016-0000-0000-000000000004', 'CLIENT_CREATED', 'client', 'a1000000-0008-0000-0000-000000000006', 'a1000000-0007-0000-0000-000000000006', 'a1000000-0005-0000-0000-000000000001', NULL, 'Mozilla/5.0', '{"name":"Pierre Epee"}', NOW()),
  ('a1000000-0016-0000-0000-000000000005', 'DOCUMENT_UPLOADED', 'document', NULL, 'a1000000-0007-0000-0000-000000000004', 'a1000000-0005-0000-0000-000000000001', NULL, 'Mozilla/5.0', '{"fileName":"titre_foncier_kamga.pdf"}', NOW()),
  ('a1000000-0016-0000-0000-000000000006', 'TASK_CREATED', 'task', NULL, 'a1000000-0007-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', NULL, 'Mozilla/5.0', NULL, NOW()),
  ('a1000000-0016-0000-0000-000000000007', 'CASE_VIEWED', 'case', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', NULL, 'Mozilla/5.0', NULL, NOW()),
  ('a1000000-0016-0000-0000-000000000008', 'LOGIN', NULL, NULL, 'a1000000-0007-0000-0000-000000000002', 'a1000000-0005-0000-0000-000000000001', '192.168.1.20', 'Mozilla/5.0', NULL, NOW()),
  ('a1000000-0016-0000-0000-000000000009', 'PAYMENT_RECORDED', 'payment', NULL, 'a1000000-0007-0000-0000-000000000007', 'a1000000-0005-0000-0000-000000000001', NULL, 'Mozilla/5.0', '{"amount":400000,"method":"virement"}', NOW()),
  ('a1000000-0016-0000-0000-000000000010', 'EVENT_CREATED', 'event', 'a1000000-000b-0000-0000-000000000008', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', NULL, 'Mozilla/5.0', NULL, NOW());

-- Section 23: Time Entries
INSERT INTO time_entries (id, description, start_time, end_time, duration, is_billable, hourly_rate, total_amount, tenant_id, user_id, case_id, created_at)
VALUES
  ('a1000000-0017-0000-0000-000000000001', 'Étude du dossier foncier Kamga', NOW() - interval '5 days', NOW() - interval '5 days', 7200, true, 25000, 50000, 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0009-0000-0000-000000000001', NOW()),
  ('a1000000-0017-0000-0000-000000000002', 'Rédaction conclusions Kamga', NOW() - interval '3 days', NOW() - interval '3 days', 14400, true, 25000, 100000, 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0009-0000-0000-000000000001', NOW()),
  ('a1000000-0017-0000-0000-000000000003', 'Consultation client Diallo', NOW() - interval '7 days', NOW() - interval '7 days', 3600, true, 25000, 25000, 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0009-0000-0000-000000000002', NOW()),
  ('a1000000-0017-0000-0000-000000000004', 'Recherche jurisprudence sociale', NOW() - interval '6 days', NOW() - interval '6 days', 5400, true, 25000, 37500, 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000004', 'a1000000-0009-0000-0000-000000000002', NOW()),
  ('a1000000-0017-0000-0000-000000000005', 'Analyse factures Hadj', NOW() - interval '4 days', NOW() - interval '4 days', 5400, true, 25000, 37500, 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000005', 'a1000000-0009-0000-0000-000000000003', NOW()),
  ('a1000000-0017-0000-0000-000000000006', 'Préparation référé Epee', NOW() - interval '1 day', NOW() - interval '1 day', 10800, true, 50000, 150000, 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0009-0000-0000-000000000006', NOW()),
  ('a1000000-0017-0000-0000-000000000007', 'Préparation référé Epee', NOW() - interval '1 day', NOW() - interval '1 day', 7200, true, 50000, 100000, 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000004', 'a1000000-0009-0000-0000-000000000006', NOW()),
  ('a1000000-0017-0000-0000-000000000008', 'Entretien client Nkoulou', NOW() - interval '3 days', NOW() - interval '3 days', 3600, true, 25000, 25000, 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', 'a1000000-0009-0000-0000-000000000007', NOW()),
  ('a1000000-0017-0000-0000-000000000009', 'Réunion interne - stratégie Epee', NOW() - interval '2 days', NOW() - interval '2 days', 3600, false, 0, 0, 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', NULL, NOW());

-- Section 24: Document Templates
INSERT INTO document_templates (id, name, category, description, content, variables, is_active, tenant_id, created_at, updated_at)
VALUES
  ('a1000000-0018-0000-0000-000000000001', 'Assignation en justice', 'procedure', 'Modèle d''assignation au fond', '<p>COUR D''APPEL DE DOUALA</p><p>À l''attention de Monsieur le Président</p><p>{{client_name}} demeurant à {{client_address}}...</p>', 'client_name,client_address,adversary_name,tribunal,date', true, 'a1000000-0005-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-0018-0000-0000-000000000002', 'Mise en demeure', 'correspondance', 'Modèle de lettre de mise en demeure', '<p>Lettre recommandée avec AR</p><p>Objet : Mise en demeure</p><p>{{client_name}} informe {{adversary_name}} que...</p>', 'client_name,client_address,adversary_name,amount,date', true, 'a1000000-0005-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-0018-0000-0000-000000000003', 'Conclusions récapitulatives', 'procedure', 'Modèle de conclusions', '<p>CONCLUSIONS</p><p>Pour {{client_name}}</p><p>CONTRE {{adversary_name}}</p><p>...</p>', 'client_name,adversary_name,case_reference,tribunal', true, 'a1000000-0005-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-0018-0000-0000-000000000004', 'Statuts SARL', 'societe', 'Modèle de statuts de SARL', '<p>STATUTS DE LA SOCIÉTÉ À RESPONSABILITÉ LIMITÉE</p><p>Dénomination sociale : {{company_name}}</p>...', 'company_name,capital,siege,gerant,associes', true, 'a1000000-0005-0000-0000-000000000001', NOW(), NOW());

-- Section 25: Communications
INSERT INTO communications (id, type, subject, content, status, recipient_email, recipient_phone, sent_at, tenant_id, case_id, client_id, sent_by_id, created_at)
VALUES
  ('a1000000-0019-0000-0000-000000000001', 'email', 'Dossier Kamga - Pièces complémentaires', 'Bonjour Maître, voici les pièces complémentaires demandées par le tribunal...', 'sent', 'j.kamga@email.com', NULL, NOW() - interval '3 days', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0008-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000003', NOW()),
  ('a1000000-0019-0000-0000-000000000002', 'email', 'Rappel facture FAC-2025-003', 'Madame, Monsieur, nous vous rappelons que la facture FAC-2025-003 d''un montant de 750 000 FCFA reste impayée...', 'sent', 'i.hadj@email.com', NULL, NOW() - interval '10 days', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000003', 'a1000000-0008-0000-0000-000000000003', 'a1000000-0007-0000-0000-000000000007', NOW()),
  ('a1000000-0019-0000-0000-000000000003', 'sms', NULL, 'Rappel: votre audience est prévue demain à 8h30 au TGI Douala.', 'sent', NULL, '+237 6 99 11 22', NOW() - interval '1 day', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000001', 'a1000000-0008-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000006', NOW()),
  ('a1000000-0019-0000-0000-000000000004', 'email', 'Convocation - Réunion de préparation', 'Nous vous convions à une réunion de préparation du dossier le... à notre cabinet.', 'pending', 'f.diallo@email.com', NULL, NULL, 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000002', 'a1000000-0008-0000-0000-000000000002', 'a1000000-0007-0000-0000-000000000003', NOW()),
  ('a1000000-0019-0000-0000-000000000005', 'email', 'Mise en demeure - Dossier Hadj', 'Par la présente, nous mettons en demeure la société XYZ Trading de...', 'sent', 'contact@xyztrading.com', NULL, NOW() - interval '7 days', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0009-0000-0000-000000000003', 'a1000000-0008-0000-0000-000000000003', 'a1000000-0007-0000-0000-000000000004', NOW()),
  ('a1000000-0019-0000-0000-000000000006', 'email', 'Bienvenue sur JurisLink', 'Votre espace client est maintenant disponible. Vous pouvez suivre l''avancement de votre dossier...', 'sent', 'p.ondo@email.com', NULL, NOW() - interval '15 days', 'a1000000-0005-0000-0000-000000000002', 'a1000000-0009-0000-0000-000000000010', 'a1000000-0008-0000-0000-000000000009', 'a1000000-0007-0000-0000-000000000008', NOW());

-- Section 26: Reminder Logs (colonne 'sent_at' au lieu de 'created_at')
INSERT INTO reminder_logs (id, level, method, subject, content, status, days_overdue, amount_due, invoice_id, tenant_id, sent_by_id, sent_at)
VALUES
  ('a1000000-001a-0000-0000-000000000001', 1, 'email', '1re relance - Facture FAC-2025-002', 'Nous vous rappelons que la facture FAC-2025-002 d''un montant de 300 000 FCFA...', 'sent', 10, 150000, 'a1000000-000d-0000-0000-000000000002', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000007', NOW()),
  ('a1000000-001a-0000-0000-000000000002', 2, 'email', '2e relance - Facture FAC-2025-003', 'Malgré notre précédente relance, la facture FAC-2025-003 d''un montant de 750 000 FCFA...', 'sent', 15, 750000, 'a1000000-000d-0000-0000-000000000003', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000007', NOW()),
  ('a1000000-001a-0000-0000-000000000003', 3, 'email', '3e relance - Mise en demeure FAC-2025-005', 'En l''absence de règlement, nous sommes contraints de vous adresser une mise en demeure...', 'sent', 5, 1200000, 'a1000000-000d-0000-0000-000000000006', 'a1000000-0005-0000-0000-000000000001', 'a1000000-0007-0000-0000-000000000007', NOW());

-- Section 27: Client Portals
INSERT INTO client_portals (id, email, password_hash, is_active, last_login_at, client_id, tenant_id, created_at, updated_at)
VALUES
  ('a1000000-001b-0000-0000-000000000001', 'j.kamga@email.com', '$2b$10$yVtnobDoQ2v2rTbi7Wx75..myX/Z86LuArkfeCdnKOIPTx/GTa5JW', true, NOW() - interval '2 days', 'a1000000-0008-0000-0000-000000000001', 'a1000000-0005-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-001b-0000-0000-000000000002', 'f.diallo@email.com', '$2b$10$yVtnobDoQ2v2rTbi7Wx75..myX/Z86LuArkfeCdnKOIPTx/GTa5JW', true, NULL, 'a1000000-0008-0000-0000-000000000002', 'a1000000-0005-0000-0000-000000000001', NOW(), NOW()),
  ('a1000000-001b-0000-0000-000000000003', 'p.ondo@email.com', '$2b$10$yVtnobDoQ2v2rTbi7Wx75..myX/Z86LuArkfeCdnKOIPTx/GTa5JW', true, NOW() - interval '5 days', 'a1000000-0008-0000-0000-000000000009', 'a1000000-0005-0000-0000-000000000002', NOW(), NOW());

SET session_replication_role = 'origin';
