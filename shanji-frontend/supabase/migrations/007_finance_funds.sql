-- FUNDING / FUNDS RECEIVED
CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  funding_type TEXT DEFAULT 'capital' CHECK (funding_type IN ('capital', 'grant', 'loan', 'revenue', 'other')),
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  date_received DATE NOT NULL,
  reference TEXT,
  document_path TEXT,
  status TEXT DEFAULT 'received' CHECK (status IN ('pending', 'received', 'reconciled', 'flagged')),
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_funds_project ON funds(project_id);
CREATE INDEX idx_funds_status ON funds(status);

-- FINANCE APPROVALS (finance-specific tracking)
CREATE TABLE IF NOT EXISTS finance_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES expenses(id),
  payment_id UUID REFERENCES payments(id),
  requester_id UUID NOT NULL REFERENCES profiles(id),
  approver_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('expense', 'payment', 'budget_change', 'fund_allocation')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'returned')),
  reason TEXT,
  comment TEXT,
  amount NUMERIC(15,2),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_finance_approvals_project ON finance_approvals(project_id);
CREATE INDEX idx_finance_approvals_status ON finance_approvals(status);
