-- ============================================================
-- Migration 002 — Etendre les types ENUM
-- Ajoute les valeurs manquantes identifiees dans l'audit
-- Non-destructif : ALTER TYPE ADD VALUE ne casse rien
-- ============================================================

BEGIN;

-- user_role : ajouter collaborator, accountant, trainee
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'collaborator') THEN
        ALTER TYPE user_role ADD VALUE 'collaborator';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'accountant') THEN
        ALTER TYPE user_role ADD VALUE 'accountant';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'trainee') THEN
        ALTER TYPE user_role ADD VALUE 'trainee';
    END IF;
END $$;

-- case_status : ajouter new, in_progress
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'case_status'::regtype AND enumlabel = 'new') THEN
        ALTER TYPE case_status ADD VALUE 'new';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'case_status'::regtype AND enumlabel = 'in_progress') THEN
        ALTER TYPE case_status ADD VALUE 'in_progress';
    END IF;
END $$;

COMMIT;
