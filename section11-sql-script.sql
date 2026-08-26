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