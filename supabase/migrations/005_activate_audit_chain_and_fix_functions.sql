-- ============================================================
-- Migration 005 — Activer la chaine d'audit + corriger les fonctions
-- 3 parties :
--   A. Configurer le secret Vault pour la chaine d'audit
--   B. Corriger les references de colonnes dans les fonctions
--   C. Backfill les hashes d'audit existants
-- ============================================================

BEGIN;

-- ==================== PARTIE A : Vault Secret ====================
-- ⚠️ GENERER UNE CLE SECURE AVANT D'EXECUTER
-- Exemple : SELECT encode(gen_random_bytes(32), 'hex');
-- Puis remplacer 'REPLACE_WITH_GENERATED_KEY' ci-dessous

-- Uncomment la ligne suivante apres avoir genere la cle :
-- SELECT vault.create_secret('REPLACE_WITH_GENERATED_KEY', 'AUDIT_CHAIN_SECRET');

-- ==================== PARTIE B : Corriger les fonctions ====================

-- B1. Corriger export_user_data
-- Problèmes identifiés :
--   - clients.assigned_lawyer_id n'existait pas (ajouté en Migration 003)
--   - documents.uploaded_by n'existe pas (colonne = uploader_id)
--   - documents.deleted_at n'existait pas (ajouté en Migration 003)

CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result    JSONB;
  v_user      JSONB;
  v_profile   JSONB;
  v_clients   JSONB;
  v_cases     JSONB;
  v_messages  JSONB;
  v_documents JSONB;
  v_invoices  JSONB;
  v_audit     JSONB;
  v_sessions  JSONB;
BEGIN
  -- (a) Données auth.users
  SELECT row_to_json(u) INTO v_user
  FROM (
    SELECT id, email, created_at, last_sign_in_at, phone,
           raw_user_meta_data, raw_app_meta_data
    FROM auth.users
    WHERE id = p_user_id
  ) u;

  -- (b) Données public.users (profil)
  SELECT row_to_json(p) INTO v_profile
  FROM (
    SELECT id, tenant_id, role, full_name, email, phone, preferred_language,
           created_at, last_login_at, last_session_id
    FROM public.users
    WHERE id = p_user_id
  ) p;

  -- (c) Clients associés (responsable_lawyer_id ajouté en M003)
  SELECT COALESCE(jsonb_agg(c), '[]'::jsonb) INTO v_clients
  FROM (
    SELECT * FROM public.clients
    WHERE responsible_lawyer_id = p_user_id
  ) c;

  -- (d) Cases associés (assigned_lawyer_id ajouté en M003)
  SELECT COALESCE(jsonb_agg(ca), '[]'::jsonb) INTO v_cases
  FROM (
    SELECT * FROM public.cases
    WHERE assigned_lawyer_id = p_user_id
  ) ca;

  -- (e) Messages envoyés/reçus par le user
  SELECT COALESCE(jsonb_agg(m), '[]'::jsonb) INTO v_messages
  FROM (
    SELECT * FROM public.messages
    WHERE sender_id = p_user_id OR receiver_id = p_user_id
  ) m;

  -- (f) Documents uploadés (uploader_id, pas uploaded_by)
  SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) INTO v_documents
  FROM (
    SELECT * FROM public.documents
    WHERE uploader_id = p_user_id
  ) d;

  -- (g) Factures liées au user
  SELECT COALESCE(jsonb_agg(i), '[]'::jsonb) INTO v_invoices
  FROM (
    SELECT * FROM public.invoices
    WHERE created_by = p_user_id OR client_id = p_user_id
  ) i;

  -- (h) Audit logs
  SELECT COALESCE(jsonb_agg(al), '[]'::jsonb) INTO v_audit
  FROM (
    SELECT * FROM public.audit_logs
    WHERE user_id = p_user_id
    ORDER BY timestamp DESC
    LIMIT 1000
  ) al;

  -- (i) Sessions log
  SELECT COALESCE(jsonb_agg(sl), '[]'::jsonb) INTO v_sessions
  FROM (
    SELECT * FROM public.sessions_log
    WHERE user_id = p_user_id
    ORDER BY started_at DESC
  ) sl;

  -- Assemble
  v_result := jsonb_build_object(
    'exported_at', now(),
    'user_id', p_user_id,
    'auth_user', v_user,
    'profile', v_profile,
    'clients', v_clients,
    'cases', v_cases,
    'messages', v_messages,
    'documents', v_documents,
    'invoices', v_invoices,
    'audit_logs', v_audit,
    'sessions_log', v_sessions,
    'gdpr_legal_basis', 'GDPR Article 15 — right of access',
    'gdpr_portability_format', 'JSON (Article 20)'
  );

  -- Audit de l'export
  INSERT INTO public.audit_logs (
    user_id, tenant_id, action, entity, entity_id, metadata
  )
  SELECT
    auth.uid(),
    u.tenant_id,
    'GDPR_EXPORT',
    'user',
    p_user_id::TEXT,
    jsonb_build_object(
      'requested_by', auth.uid(),
      'gdpr_article', '15',
      'exported_at', now()
    )
  FROM public.users u
  WHERE u.id = p_user_id;

  RETURN v_result;
END;
$$;


-- B2. Corriger soft_delete_user_data
-- Problèmes :
--   - clients.assigned_lawyer_id → responsible_lawyer_id (ajouté en M003)
--   - documents.name, documents.description → file_name (pas name/description)
--   - documents.deleted_at (ajouté en M003)

CREATE OR REPLACE FUNCTION public.soft_delete_user_data(
  p_user_id uuid,
  p_deleted_by uuid DEFAULT NULL,
  p_reason text DEFAULT 'gdpr_article_17'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_anon_email  TEXT;
  v_anon_name   TEXT := '[deleted]';
  v_username    TEXT;
BEGIN
  IF p_deleted_by IS NULL THEN
    p_deleted_by := auth.uid();
  END IF;

  -- 1. Email anonymisé
  v_anon_email := 'deleted+' || gen_random_uuid()::TEXT || '@jurislink.local';

  -- 2. Capturer le nom avant anonymisation
  SELECT full_name INTO v_username FROM public.users WHERE id = p_user_id;

  -- 3. Anonymiser public.users
  UPDATE public.users
  SET
    full_name = v_anon_name,
    email = v_anon_email,
    phone = NULL,
    preferred_language = 'fr',
    last_login_at = NULL,
    last_session_id = NULL,
    session_count_today = 0
  WHERE id = p_user_id;

  -- 4. Anonymiser les messages
  UPDATE public.messages
  SET content = '[anonymized_per_gdpr_article_17]',
      subject = '[anonymized]'
  WHERE sender_id = p_user_id OR receiver_id = p_user_id;

  -- 5. Marquer les documents (file_name, pas name/description)
  UPDATE public.documents
  SET file_name = '[anonymized]',
      deleted_at = now()
  WHERE uploader_id = p_user_id;

  -- 6. Reassigner clients (responsable_lawyer_id, pas assigned_lawyer_id)
  UPDATE public.clients
  SET responsible_lawyer_id = NULL
  WHERE responsible_lawyer_id = p_user_id;

  -- 7. Reassigner cases
  UPDATE public.cases
  SET assigned_lawyer_id = NULL
  WHERE assigned_lawyer_id = p_user_id;

  -- 8. Terminer les sessions actives
  UPDATE public.sessions_log
  SET ended_at = now(),
      last_seen_at = now(),
      end_reason = 'disabled'
  WHERE user_id = p_user_id AND ended_at IS NULL;

  -- 9. Révoquer les sessions auth
  DELETE FROM auth.sessions WHERE user_id = p_user_id;

  -- 10. Désactiver l'utilisateur
  UPDATE auth.users
  SET
    banned_until = '2999-01-01'::TIMESTAMPTZ,
    raw_user_meta_data = jsonb_build_object(
      'status', 'gdpr_anonymized', 
      'anonymized_at', now()::TEXT
    )
  WHERE id = p_user_id;

  -- 11. Audit log
  INSERT INTO public.audit_logs (
    user_id, tenant_id, action, entity, entity_id, metadata
  )
  SELECT
    p_deleted_by,
    u.tenant_id,
    'GDPR_DELETE',
    'user',
    p_user_id::TEXT,
    jsonb_build_object(
      'deleted_user_id', p_user_id,
      'original_full_name', v_username,
      'anonymized_email', v_anon_email,
      'reason', p_reason,
      'gdpr_article', '17',
      'executed_by', p_deleted_by,
      'executed_at', now()
    )
  FROM public.users u
  WHERE u.id = p_user_id;

  -- 12. Retourner le recap
  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'original_full_name', v_username,
    'anonymized_email', v_anon_email,
    'executed_by', p_deleted_by,
    'reason', p_reason,
    'executed_at', now(),
    'note', 'User data anonymized. auth.users kept for audit trail (banned_until=2999). Storage cleanup must be run separately.'
  );
END;
$$;


-- ==================== PARTIE C : Backfill hashes d'audit ====================
-- Cette procédure re-numérote les entrées existantes avec des hashes.
-- A executer SEULEMENT apres avoir configuré le Vault secret (Partie A).
-- Décommentez les lignes ci-dessous une fois le secret configuré :

/*
-- Marquer toutes les entrées sans hash pour re-calcul
-- (le trigger fn_audit_chain_before_insert les ignorait car Vault n'etait pas configuré)
DO $$
DECLARE
  v_row RECORD;
  v_prev_hash TEXT := 'GENESIS';
  v_new_hash TEXT;
BEGIN
  FOR v_row IN
    SELECT id, action, entity, entity_id, timestamp, metadata, user_id
    FROM public.audit_logs
    WHERE curr_hash IS NULL
    ORDER BY id ASC
  LOOP
    v_new_hash := public.compute_audit_hash(
      v_prev_hash,
      v_row.action,
      v_row.entity,
      v_row.entity_id,
      v_row.timestamp,
      v_row.metadata,
      v_row.user_id
    );

    UPDATE public.audit_logs
    SET prev_hash = v_prev_hash,
        curr_hash = v_new_hash
    WHERE id = v_row.id;

    v_prev_hash := v_new_hash;
  END LOOP;

  RAISE NOTICE 'Backfill terminé. Dernier hash: %', v_prev_hash;
END $$;
*/

COMMIT;