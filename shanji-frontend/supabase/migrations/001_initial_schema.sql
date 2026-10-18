-- Shanji DNA Database Schema
-- Generated according to product specification

-- ============================================
-- AUTH & ORGANIZATION
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'team_member',
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- PROJECTS
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  project_code TEXT UNIQUE,
  client_name TEXT,
  client_contact TEXT,
  client_email TEXT,
  client_phone TEXT,
  description TEXT,
  scope TEXT,
  pm_user_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'initiation' CHECK (status IN ('initiation','planning','approval','active','on_hold','at_risk','closure','closed')),
  health TEXT DEFAULT 'green' CHECK (health IN ('green','amber','red')),
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completion_readiness INT DEFAULT 0 CHECK (completion_readiness >= 0 AND completion_readiness <= 100),
  start_date DATE,
  end_date DATE,
  budget NUMERIC(15,2),
  currency TEXT DEFAULT 'KES',
  location TEXT,
  tags TEXT[],
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_pm ON projects(pm_user_id);
CREATE INDEX idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('project_manager','project_assistant','site_supervisor','finance','procurement','ohs','me','hr_admin','member')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WBS & WORKPLANS
-- ============================================

CREATE TABLE IF NOT EXISTS wbs_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES wbs_items(id) ON DELETE CASCADE,
  wbs_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workplans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','approved','rejected','archived')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  change_summary TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, version)
);

CREATE TABLE IF NOT EXISTS workplan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workplan_id UUID NOT NULL REFERENCES workplans(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES workplan_items(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  description TEXT,
  responsible_user_id UUID REFERENCES profiles(id),
  supporting_role TEXT,
  start_date DATE,
  end_date DATE,
  duration_days INT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','planned','in_progress','blocked','submitted_for_verification','needs_correction','verified','approved','completed')),
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  sort_order INT DEFAULT 0,
  requires_evidence BOOLEAN DEFAULT false,
  evidence_requirements TEXT,
  milestone_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES workplan_items(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES workplan_items(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'finish_to_start',
  lag_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  description TEXT,
  milestone_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','achieved','missed','deferred')),
  workplan_id UUID REFERENCES workplans(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workplan_item_id UUID REFERENCES workplan_items(id),
  deliverable_name TEXT NOT NULL,
  description TEXT,
  required BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','submitted','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TASK ASSIGNMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES workplan_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'responsible',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- ============================================
-- EVIDENCE
-- ============================================

CREATE TABLE IF NOT EXISTS evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES workplan_items(id) ON DELETE SET NULL,
  uploader_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  mime_type TEXT,
  evidence_type TEXT DEFAULT 'photo' CHECK (evidence_type IN ('photo','document','report','checklist','signed_document','site_record','inspection_report','other')),
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected','correction_requested')),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  verification_comment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- APPROVALS
-- ============================================

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id UUID NOT NULL,
  requester_id UUID NOT NULL REFERENCES profiles(id),
  approver_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','returned_for_correction','cancelled')),
  comments TEXT,
  previous_state JSONB,
  new_state JSONB,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approvals_item ON approvals(item_type, item_id);
CREATE INDEX idx_approvals_approver ON approvals(approver_id, status);

-- ============================================
-- RISKS
-- ============================================

CREATE TABLE IF NOT EXISTS risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  risk_title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  probability INT DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  impact INT DEFAULT 50 CHECK (impact >= 0 AND impact <= 100),
  risk_score INT DEFAULT 2500,
  owner_id UUID REFERENCES profiles(id),
  mitigation TEXT,
  contingency TEXT,
  due_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','monitoring','mitigated','materialized','closed')),
  related_task_id UUID REFERENCES workplan_items(id),
  related_area TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risks_project ON risks(project_id);
CREATE INDEX idx_risks_status ON risks(status);

-- ============================================
-- ISSUES
-- ============================================

CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  issue_title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  owner_id UUID REFERENCES profiles(id),
  date_raised TIMESTAMPTZ DEFAULT NOW(),
  due_date DATE,
  related_task_id UUID REFERENCES workplan_items(id),
  resolution TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','escalated','closed')),
  escalation_level INT DEFAULT 0,
  evidence TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_issues_project ON issues(project_id);

-- ============================================
-- PROCUREMENT
-- ============================================

CREATE TABLE IF NOT EXISTS procurement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES workplan_items(id),
  requester_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  budget_amount NUMERIC(15,2),
  currency TEXT DEFAULT 'KES',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','review','quotations','comparison','approved','purchase_order','supplier','delivery','verification','financial_record','closed')),
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  delay_days INT DEFAULT 0,
  supplier_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  rating INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_request_id UUID NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  quotation_number TEXT,
  title TEXT,
  description TEXT,
  amount NUMERIC(15,2),
  currency TEXT DEFAULT 'KES',
  valid_until DATE,
  terms TEXT,
  file_path TEXT,
  status TEXT DEFAULT 'received' CHECK (status IN ('received','compared','selected','rejected','expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_request_id UUID NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  po_number TEXT UNIQUE,
  title TEXT,
  amount NUMERIC(15,2),
  currency TEXT DEFAULT 'KES',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','partially_delivered','delivered','cancelled')),
  issue_date DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  procurement_request_id UUID REFERENCES procurement_requests(id),
  description TEXT,
  quantity NUMERIC(15,4),
  unit TEXT,
  delivery_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_transit','received','verified','rejected')),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FINANCE
-- ============================================

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  allocated_date DATE DEFAULT CURRENT_DATE,
  spent_amount NUMERIC(15,2) DEFAULT 0,
  committed_amount NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, category)
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES workplan_items(id),
  expense_category TEXT,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  expense_date DATE NOT NULL,
  submitted_by UUID NOT NULL REFERENCES profiles(id),
  description TEXT,
  receipt_path TEXT,
  receipt_filename TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected','flagged')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES expenses(id),
  supplier_id UUID REFERENCES suppliers(id),
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  payment_method TEXT,
  payment_date DATE,
  reference_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processed','completed','failed','refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SITE MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS site_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES workplan_items(id),
  report_date DATE NOT NULL,
  location TEXT,
  weather TEXT,
  personnel TEXT,
  work_completed TEXT,
  materials_used TEXT,
  equipment TEXT,
  problems TEXT,
  photos TEXT[],
  safety_observations TEXT,
  next_steps TEXT,
  reported_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inspection_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  inspector_id UUID NOT NULL REFERENCES profiles(id),
  inspection_date TIMESTAMPTZ DEFAULT NOW(),
  location TEXT,
  findings TEXT,
  compliance_status TEXT DEFAULT 'compliant' CHECK (compliance_status IN ('compliant','non_compliant','conditional')),
  evidence_path TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','closed','follow_up')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  incident_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  reported_by UUID NOT NULL REFERENCES profiles(id),
  date_occurred TIMESTAMPTZ DEFAULT NOW(),
  location TEXT,
  people_involved TEXT,
  immediate_actions TEXT,
  investigation TEXT,
  corrective_actions TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  inspection_id UUID REFERENCES inspections(id),
  risk_id UUID REFERENCES risks(id),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id),
  due_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','verified')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MONITORING & EVALUATION
-- ============================================

CREATE TABLE IF NOT EXISTS indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  indicator_name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  target_value NUMERIC,
  current_value NUMERIC,
  source TEXT,
  frequency TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('contracts','workplans','reports','procurement','finance','hse','site','me','handover','administrative')),
  module TEXT,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  version TEXT DEFAULT '1.0',
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'current',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  change_description TEXT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHANGE MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_change TEXT NOT NULL,
  reason TEXT,
  requester_id UUID NOT NULL REFERENCES profiles(id),
  impact_scope TEXT,
  impact_timeline TEXT,
  impact_budget TEXT,
  risks TEXT,
  supporting_documents TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','approved','rejected','implemented')),
  reviewed_by UUID REFERENCES profiles(id),
  review_comments TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS change_request_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HANDOVER & CLOSURE
-- ============================================

CREATE TABLE IF NOT EXISTS handover_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'preparation' CHECK (status IN ('preparation','internal_review','corrections','submitted','approved','completed')),
  prepared_by UUID NOT NULL REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  review_comments TEXT,
  client_acceptance BOOLEAN DEFAULT false,
  client_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS closure_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  required BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','complete','not_applicable','blocked')),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  related_object_type TEXT,
  related_object_id UUID,
  action_url TEXT,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read);

-- ============================================
-- COMMENTS / COMMUNICATION
-- ============================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  mentions TEXT[],
  related_object_type TEXT,
  related_object_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  previous_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE wbs_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE workplans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workplan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_request_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE closure_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Organization access: users can see their org
CREATE POLICY "Users can view own org" ON organizations FOR SELECT
  USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own org" ON organizations FOR UPDATE
  USING (id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'owner'));

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can view org profiles" ON profiles FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Organization members
CREATE POLICY "Org members can view org members" ON organization_members FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own org member" ON organization_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Projects
CREATE POLICY "Project members can view projects" ON projects FOR SELECT
  USING (id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "PM can create projects" ON projects FOR INSERT
  WITH CHECK (auth.uid() = pm_user_id OR EXISTS (
    SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner','admin') AND organization_id = projects.organization_id
  ));

CREATE POLICY "Project members can update projects" ON projects FOR UPDATE
  USING (id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) AND (
    EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid() AND role IN ('project_manager','owner','admin'))
  ));

-- Project members
CREATE POLICY "Project members can view" ON project_members FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "PM can manage project members" ON project_members FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role IN ('project_manager')));

-- WBS Items
CREATE POLICY "Project members can view WBS" ON wbs_items FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "PM can manage WBS" ON wbs_items FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role IN ('project_manager')));

-- Workplans
CREATE POLICY "Project members can view workplans" ON workplans FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "PM can manage workplans" ON workplans FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role IN ('project_manager')));

-- Workplan items
CREATE POLICY "Project members can view workplan items" ON workplan_items FOR SELECT
  USING (workplan_id IN (SELECT id FROM workplans WHERE project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())));

CREATE POLICY "Team can update assigned workplan items" ON workplan_items FOR UPDATE
  USING (workplan_id IN (SELECT id FROM workplans WHERE project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())) AND (
    EXISTS (SELECT 1 FROM task_assignments WHERE task_id = workplan_items.id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM workplans WHERE id = workplan_id AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) AND role IN ('project_manager'))
  ));

-- Evidence
CREATE POLICY "Project members can view evidence" ON evidence_records FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can upload evidence" ON evidence_records FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own evidence" ON evidence_records FOR UPDATE
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) AND uploader_id = auth.uid());

-- Approvals
CREATE POLICY "Project members can view approvals" ON approvals FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create approvals" ON approvals FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Approvers can decide" ON approvals FOR UPDATE
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) AND approver_id = auth.uid());

-- Risks and Issues
CREATE POLICY "Project members can view risks" ON risks FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Project members can manage risks" ON risks FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Project members can view issues" ON issues FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Project members can manage issues" ON issues FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- Procurement
CREATE POLICY "Project members can view procurement" ON procurement_requests FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Project members can manage procurement" ON procurement_requests FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- Finance
CREATE POLICY "Project members can view expenses" ON expenses FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Finance team can manage expenses" ON expenses FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) AND EXISTS (
    SELECT 1 FROM project_members WHERE project_id = expenses.project_id AND user_id = auth.uid() AND role IN ('finance','project_manager')
  ));

CREATE POLICY "Project members can view budgets" ON budgets FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Finance team can manage budgets" ON budgets FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) AND EXISTS (
    SELECT 1 FROM project_members WHERE project_id = budgets.project_id AND user_id = auth.uid() AND role IN ('finance','project_manager')
  ));

-- Documents
CREATE POLICY "Project members can view documents" ON documents FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can upload documents" ON documents FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- Site reports
CREATE POLICY "Project members can view site reports" ON site_reports FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Site supervisors can create site reports" ON site_reports FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) AND EXISTS (
    SELECT 1 FROM project_members WHERE project_id = site_reports.project_id AND user_id = auth.uid() AND role IN ('site_supervisor','project_manager')
  ));

-- Notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Comments
CREATE POLICY "Project members can view comments" ON comments FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Project members can create comments" ON comments FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- Audit logs (append only)
CREATE POLICY "Service role can insert audit logs" ON audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "No one can delete audit logs" ON audit_logs FOR DELETE
  USING (false);

CREATE POLICY "No one can update audit logs" ON audit_logs FOR UPDATE
  USING (false);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_risk_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.risk_score = NEW.probability * NEW.impact;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_project_health()
RETURNS TRIGGER AS $$
DECLARE
  v_overdue INT;
  v_critical_risks INT;
  v_critical_issues INT;
BEGIN
  SELECT COUNT(*) INTO v_overdue
  FROM workplan_items
  WHERE workplan_id IN (SELECT id FROM workplans WHERE project_id = NEW.id)
  AND status NOT IN ('completed','closed')
  AND end_date < CURRENT_DATE;

  SELECT COUNT(*) INTO v_critical_risks
  FROM risks
  WHERE project_id = NEW.id
  AND risk_score >= 3600
  AND status NOT IN ('closed','mitigated');

  SELECT COUNT(*) INTO v_critical_issues
  FROM issues
  WHERE project_id = NEW.id
  AND severity = 'critical'
  AND status NOT IN ('closed','resolved');

  IF v_overdue > 5 OR v_critical_risks > 2 OR v_critical_issues > 0 THEN
    NEW.health = 'red';
  ELSIF v_overdue > 0 OR v_critical_risks > 0 THEN
    NEW.health = 'amber';
  ELSE
    NEW.health = 'green';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_timestamp
  BEFORE UPDATE ON ANY TABLE
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_calculate_risk_score
  BEFORE INSERT OR UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION calculate_risk_score();

CREATE TRIGGER trg_calculate_health
  AFTER INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION calculate_project_health();
