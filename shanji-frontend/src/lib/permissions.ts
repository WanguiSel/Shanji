export type PermissionAction =
  | 'view_project'
  | 'create_project'
  | 'edit_project'
  | 'delete_project'
  | 'assign_project'
  | 'view_tasks'
  | 'create_task'
  | 'edit_task'
  | 'delete_task'
  | 'complete_task'
  | 'view_evidence'
  | 'upload_evidence'
  | 'verify_evidence'
  | 'view_approvals'
  | 'create_approval'
  | 'approve_item'
  | 'reject_item'
  | 'view_risks'
  | 'create_risk'
  | 'edit_risk'
  | 'view_issues'
  | 'create_issue'
  | 'edit_issue'
  | 'view_procurement'
  | 'create_procurement'
  | 'edit_procurement'
  | 'approve_procurement'
  | 'view_finance'
  | 'create_expense'
  | 'approve_expense'
  | 'view_site'
  | 'create_site_report'
  | 'view_documents'
  | 'upload_document'
  | 'view_dashboard'
  | 'manage_users'
  | 'approve_closure'
  | 'close_project';

export interface RolePermission {
  role: string;
  permissions: PermissionAction[];
}

export const ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'project_manager',
    permissions: [
      'view_project','create_project','edit_project','delete_project','assign_project',
      'view_tasks','create_task','edit_task','delete_task','complete_task',
      'view_evidence','upload_evidence','verify_evidence',
      'view_approvals','create_approval','approve_item','reject_item',
      'view_risks','create_risk','edit_risk',
      'view_issues','create_issue','edit_issue',
      'view_procurement','create_procurement','edit_procurement','approve_procurement',
      'view_finance','create_expense','approve_expense',
      'view_site','create_site_report',
      'view_documents','upload_document',
      'view_dashboard','manage_users',
      'approve_closure','close_project',
    ],
  },
  {
    role: 'project_assistant',
    permissions: [
      'view_project','view_tasks','create_task','edit_task',
      'view_evidence','upload_evidence',
      'view_approvals','create_approval',
      'view_risks','view_issues',
      'view_procurement','create_procurement',
      'view_finance','create_expense',
      'view_site','create_site_report',
      'view_documents','upload_document',
      'view_dashboard',
    ],
  },
  {
    role: 'site_supervisor',
    permissions: [
      'view_project','view_tasks',
      'view_evidence','upload_evidence',
      'view_site','create_site_report',
      'view_documents',
      'view_dashboard',
      'create_expense',
    ],
  },
  {
    role: 'finance',
    permissions: [
      'view_project','view_finance','create_expense','approve_expense',
      'view_documents','upload_document',
      'view_dashboard',
      'view_risks','view_issues',
      'view_approvals',
    ],
  },
  {
    role: 'procurement',
    permissions: [
      'view_project','view_procurement','create_procurement','approve_procurement',
      'view_risks','view_issues',
      'view_documents',
      'view_dashboard',
    ],
  },
  {
    role: 'ohs',
    permissions: [
      'view_project','view_risks','create_risk','edit_risk',
      'view_issues','create_issue','edit_issue',
      'view_site','create_site_report',
      'view_documents',
      'view_dashboard',
    ],
  },
  {
    role: 'me',
    permissions: [
      'view_project','view_tasks',
      'view_evidence','upload_evidence',
      'view_documents',
      'view_dashboard',
    ],
  },
  {
    role: 'member',
    permissions: [
      'view_project','view_tasks',
      'view_evidence','upload_evidence',
      'view_documents',
      'view_dashboard',
    ],
  },
];

export function hasPermission(role: string, permission: PermissionAction): boolean {
  const rolePerms = ROLE_PERMISSIONS.find((r) => r.role === role);
  if (!rolePerms) return false;
  return rolePerms.permissions.includes(permission);
}

export function canAccessProject(role: string, projectId: string, userProjectIds: string[]): boolean {
  return userProjectIds.includes(projectId);
}