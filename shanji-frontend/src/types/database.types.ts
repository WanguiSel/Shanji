export type Tables = {
  organizations: {
    Row: {
      id: string;
      org_name: string;
      slug: string;
      logo_url: string | null;
      settings: Record<string, unknown> | null;
      created_at: string;
      updated_at: string;
    };
  };
  profiles: {
    Row: {
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
    };
  };
  projects: {
    Row: {
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
      status: string;
      health: string;
      progress: number;
      completion_readiness: number;
      start_date: string | null;
      end_date: string | null;
      budget: number | null;
      currency: string;
      location: string | null;
      tags: string[] | null;
      settings: Record<string, unknown> | null;
      created_by: string | null;
      created_at: string;
      updated_at: string;
    };
  };
  project_members: {
    Row: {
      id: string;
      project_id: string;
      user_id: string;
      role: string;
      assigned_at: string;
    };
  };
  workplan_items: {
    Row: {
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
      priority: string;
      status: string;
      progress: number;
      sort_order: number;
      requires_evidence: boolean;
      evidence_requirements: string | null;
      milestone_id: string | null;
      created_at: string;
      updated_at: string;
    };
  };
  evidence_records: {
    Row: {
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
      evidence_type: string;
      verification_status: string;
      verified_by: string | null;
      verified_at: string | null;
      verification_comment: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
      updated_at: string;
    };
  };
  approvals: {
    Row: {
      id: string;
      project_id: string;
      item_type: string;
      item_id: string;
      requester_id: string;
      approver_id: string;
      status: string;
      comments: string | null;
      previous_state: Record<string, unknown> | null;
      new_state: Record<string, unknown> | null;
      requested_at: string;
      decided_at: string | null;
      created_at: string;
    };
  };
};
