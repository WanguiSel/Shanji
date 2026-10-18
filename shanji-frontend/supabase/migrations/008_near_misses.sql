-- NEAR MISSES / SAFETY INCIDENTS
CREATE TABLE IF NOT EXISTS near_misses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_date TIMESTAMPTZ DEFAULT NOW(),
  location TEXT,
  description TEXT NOT NULL,
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  category TEXT,
  responsible_person UUID REFERENCES profiles(id),
  mitigation TEXT,
  due_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'mitigated', 'closed')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_near_misses_project ON near_misses(project_id);
CREATE INDEX idx_near_misses_status ON near_misses(status);
CREATE INDEX idx_near_misses_risk ON near_misses(risk_level);
