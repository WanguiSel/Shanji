export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  organization_id: string | null;
  department: string | null;
}

export interface Organization {
  id: string;
  org_name: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  project_name: string;
  project_code: string | null;
  client_name: string | null;
  client_contact: string | null;
  client_email: string | null;
  client_phone: string | null;
  description: string | null;
  scope: string | null;
  pm_user_id: string | null;
  status: ProjectStatus;
  health: ProjectHealth;
  progress: number;
  completion_readiness: number;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  currency: string;
  location: string | null;
  tags: string[] | null;
  settings: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 'initiation' | 'planning' | 'approval' | 'active' | 'on_hold' | 'at_risk' | 'closure' | 'closed';
export type ProjectHealth = 'green' | 'amber' | 'red';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  assigned_at: string;
}

export type ProjectRole = 'project_manager' | 'project_assistant' | 'site_supervisor' | 'finance' | 'procurement' | 'ohs' | 'me' | 'hr_admin' | 'member';

export interface ProjectPhase {
  id: string;
  project_id: string;
  phase_name: string;
  description: string | null;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WBSItem {
  id: string;
  project_id: string;
  parent_id: string | null;
  wbs_code: string;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface Workplan {
  id: string;
  project_id: string;
  version: string;
  title: string;
  description: string | null;
  status: WorkplanStatus;
  approved_by: string | null;
  approved_at: string | null;
  change_summary: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type WorkplanStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived';

export interface WorkplanItem {
  id: string;
  workplan_id: string;
  parent_id: string | null;
  task_title: string;
  description: string | null;
  responsible_user_id: string | null;
  supporting_role: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  sort_order: number;
  requires_evidence: boolean;
  evidence_requirements: string | null;
  milestone_id: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'not_started' | 'planned' | 'in_progress' | 'blocked' | 'submitted_for_verification' | 'needs_correction' | 'verified' | 'approved' | 'completed';

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: string;
  lag_days: number;
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  milestone_name: string;
  description: string | null;
  milestone_date: string;
  status: string;
  workplan_id: string | null;
  created_at: string;
}

export interface Deliverable {
  id: string;
  project_id: string;
  workplan_item_id: string | null;
  deliverable_name: string;
  description: string | null;
  required: boolean;
  status: string;
  created_at: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  role: string;
  assigned_at: string;
}

export interface EvidenceRecord {
  id: string;
  project_id: string;
  task_id: string | null;
  uploader_id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  mime_type: string | null;
  evidence_type: EvidenceType;
  verification_status: string;
  verified_by: string | null;
  verified_at: string | null;
  verification_comment: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type EvidenceType = 'photo' | 'document' | 'report' | 'checklist' | 'signed_document' | 'site_record' | 'inspection_report' | 'other';

export interface Approval {
  id: string;
  project_id: string;
  item_type: string;
  item_id: string;
  requester_id: string;
  approver_id: string;
  status: ApprovalStatus;
  comments: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  requested_at: string;
  decided_at: string | null;
  created_at: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'returned_for_correction' | 'cancelled';

export interface Risk {
  id: string;
  project_id: string;
  risk_title: string;
  description: string | null;
  category: string | null;
  probability: number;
  impact: number;
  risk_score: number;
  owner_id: string | null;
  mitigation: string | null;
  contingency: string | null;
  due_date: string | null;
  status: string;
  related_task_id: string | null;
  related_area: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function getRiskLevel(score: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (score <= 4) return 'Low';
  if (score <= 9) return 'Medium';
  if (score <= 16) return 'High';
  return 'Critical';
}

export interface ActivityLog {
  id: string;
  project_id: string;
  actor_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Quotation {
  id: string;
  procurement_request_id: string;
  supplier_id: string | null;
  quotation_number: string | null;
  title: string | null;
  description: string | null;
  amount: number | null;
  currency: string;
  valid_until: string | null;
  terms: string | null;
  file_path: string | null;
  status: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  procurement_request_id: string;
  supplier_id: string | null;
  po_number: string | null;
  title: string | null;
  amount: number | null;
  currency: string;
  status: string;
  issue_date: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  created_at: string;
}

export interface Delivery {
  id: string;
  purchase_order_id: string;
  procurement_request_id: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  delivery_date: string | null;
  status: string;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  organization_id: string | null;
  supplier_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  rating: number;
  status: string;
  created_at: string;
}

export interface Issue {
  id: string;
  project_id: string;
  issue_title: string;
  description: string | null;
  severity: string;
  owner_id: string | null;
  date_raised: string;
  due_date: string | null;
  related_task_id: string | null;
  resolution: string | null;
  status: string;
  escalation_level: number;
  evidence: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcurementRequest {
  id: string;
  project_id: string;
  task_id: string | null;
  requester_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  budget_amount: number | null;
  currency: string;
  status: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  delay_days: number;
  supplier_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  project_id: string;
  category: string;
  amount: number;
  currency: string;
  allocated_date: string;
  spent_amount: number;
  committed_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  project_id: string;
  task_id: string | null;
  expense_category: string | null;
  amount: number;
  currency: string;
  expense_date: string;
  submitted_by: string;
  description: string | null;
  receipt_path: string | null;
  receipt_filename: string | null;
  approval_status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  project_id: string;
  expense_id: string | null;
  supplier_id: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_date: string | null;
  reference_number: string | null;
  status: string;
  created_at: string;
}

export interface SiteReport {
  id: string;
  project_id: string;
  task_id: string | null;
  report_date: string;
  location: string | null;
  weather: string | null;
  personnel: string | null;
  work_completed: string | null;
  materials_used: string | null;
  equipment: string | null;
  problems: string | null;
  photos: string[] | null;
  safety_observations: string | null;
  next_steps: string | null;
  reported_by: string;
  created_at: string;
}

export interface Inspection {
  id: string;
  project_id: string;
  inspection_type: string | null;
  title: string;
  description: string | null;
  inspector_id: string;
  inspection_date: string;
  location: string | null;
  findings: string | null;
  compliance_status: string;
  evidence_path: string | null;
  status: string;
  created_at: string;
}

export interface Incident {
  id: string;
  project_id: string;
  incident_type: string | null;
  title: string;
  description: string | null;
  severity: string;
  reported_by: string;
  date_occurred: string;
  location: string | null;
  people_involved: string | null;
  immediate_actions: string | null;
  investigation: string | null;
  corrective_actions: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CorrectiveAction {
  id: string;
  incident_id: string | null;
  inspection_id: string | null;
  risk_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Indicator {
  id: string;
  project_id: string;
  indicator_name: string;
  description: string | null;
  unit: string | null;
  target_value: number | null;
  current_value: number | null;
  source: string | null;
  frequency: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  category: DocumentCategory;
  module: string | null;
  title: string;
  description: string | null;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  version: string;
  uploaded_by: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export type DocumentCategory = 'contracts' | 'workplans' | 'reports' | 'procurement' | 'finance' | 'hse' | 'site' | 'me' | 'handover' | 'administrative';

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: string;
  file_path: string;
  file_name: string;
  change_description: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface ChangeRequest {
  id: string;
  project_id: string;
  requested_change: string;
  reason: string | null;
  requester_id: string;
  impact_scope: string | null;
  impact_timeline: string | null;
  impact_budget: string | null;
  risks: string | null;
  supporting_documents: string | null;
  status: string;
  reviewed_by: string | null;
  review_comments: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChangeRequestImpact {
  id: string;
  change_request_id: string;
  entity_type: string;
  entity_id: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface HandoverRecord {
  id: string;
  project_id: string;
  status: string;
  prepared_by: string;
  submitted_at: string | null;
  reviewed_by: string | null;
  review_comments: string | null;
  client_acceptance: boolean;
  client_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClosureChecklist {
  id: string;
  project_id: string;
  item_name: string;
  category: string;
  required: boolean;
  status: string;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  related_object_type: string | null;
  related_object_id: string | null;
  action_url: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  mentions: string[] | null;
  related_object_type: string | null;
  related_object_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  organization_id: string | null;
  department: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}