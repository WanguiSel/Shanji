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
  risks: {
    Row: {
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
  activity_logs: {
    Row: {
      id: string;
      project_id: string;
      actor_id: string;
      action: string;
      entity_type: string | null;
      entity_id: string | null;
      description: string;
      metadata: Record<string, unknown> | null;
      created_at: string;
    };
  };
  procurement_requests: {
    Row: {
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
    };
  };
  suppliers: {
    Row: {
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
    };
  };
  quotations: {
    Row: {
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
    };
  };
  purchase_orders: {
    Row: {
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
    };
  };
  deliveries: {
    Row: {
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
    };
  };
};
