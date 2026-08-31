-- ════════════════════════════════════════════════════════════════
-- Phase 14 (Rapports) + Phase 15 (Facturation Avancée)
-- ════════════════════════════════════════════════════════════════

-- 1. TimeEntry: add billing tracking fields
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS billed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_billed ON time_entries(tenant_id, billed);
CREATE INDEX IF NOT EXISTS idx_time_entries_invoice_id ON time_entries(invoice_id);

-- 2. Invoice: add tax, discount, terms fields
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_rate DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS terms TEXT;

-- 3. Invoice: add paid_at timestamp (when invoice fully paid)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
