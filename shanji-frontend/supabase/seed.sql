-- Shanji DNA Seed Data
-- Realistic example: Loreto Solarization Project

-- 1. Organization
INSERT INTO organizations (org_name, slug)
VALUES ('S&N Advisory', 'sn-advisory')
ON CONFLICT DO NOTHING;

-- 2. Profile (admin user)
INSERT INTO profiles (id, email, full_name, role, organization_id, department, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@shanji.example',
  'Admin User',
  'project_manager',
  (SELECT id FROM organizations WHERE slug = 'sn-advisory'),
  'Management',
  true
)
ON CONFLICT DO NOTHING;

-- 3. Project: Loreto Solarization
INSERT INTO projects (
  id, organization_id, project_name, project_code, client_name,
  client_contact, client_email, pm_user_id, status, health,
  progress, completion_readiness, start_date, end_date, budget,
  currency, location, description, scope, created_by
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  (SELECT id FROM organizations WHERE slug = 'sn-advisory'),
  'Loreto Solarization',
  'LOR-SOL-2024',
  'Loreto County Council',
  'Jane Mwangi',
  'jane@loreto.go.ke',
  '00000000-0000-0000-0000-000000000001',
  'active',
  'amber',
  62,
  72,
  '2024-06-01',
  '2024-12-31',
  2500000,
  'KES',
  'Loreto County',
  'Installation of solar panel systems across Loreto County facilities',
  'Solar panel procurement, installation, testing, and handover',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT DO NOTHING;

-- 4. Project Members
INSERT INTO project_members (project_id, user_id, role)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'project_manager'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'site_supervisor'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'procurement'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'finance'),
ON CONFLICT DO NOTHING;

-- 5. Workplan
INSERT INTO workplans (id, project_id, version, title, status, approved_by, created_by)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '1.0',
  'Loreto Solarization Workplan v1.0',
  'approved',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT DO NOTHING;

-- 6. Tasks (Workplan Items)
INSERT INTO workplan_items (id, workplan_id, task_title, description, responsible_user_id, priority, status, progress, sort_order, start_date, end_date)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Site Assessment', 'Assess all County facilities for solar suitability', '00000000-0000-0000-0000-000000000002', 'high', 'completed', 100, 1, '2024-06-01', '2024-06-15'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Procurement of Equipment', 'Source solar panels, inverters, and mounting systems', '00000000-0000-0000-0000-000000000003', 'high', 'in_progress', 65, 2, '2024-06-10', '2024-08-15'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Equipment Delivery', 'Receive and verify all delivered equipment', '00000000-0000-0000-0000-000000000002', 'high', 'pending', 0, 3, '2024-08-15', '2024-08-25'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'Panel Installation', 'Install solar panels at all identified sites', '00000000-0000-0000-0000-000000000002', 'high', 'in_progress', 40, 4, '2024-08-20', '2024-10-30'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'Testing & Commissioning', 'Test all installed systems and commission', '00000000-0000-0000-0000-000000000002', 'high', 'not_started', 0, 5, '2024-10-25', '2024-11-30'),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 'Handover & Closure', 'Formal handover to client and project closure', '00000000-0000-0000-0000-000000000001', 'medium', 'not_started', 0, 6, '2024-11-25', '2024-12-31'),
ON CONFLICT DO NOTHING;

-- 7. Milestones
INSERT INTO milestones (id, project_id, milestone_name, milestone_date, status, workplan_id)
VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Site Assessment Complete', '2024-06-15', 'achieved', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Equipment Delivered', '2024-08-25', 'pending', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Installation Complete', '2024-10-30', 'pending', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Project Handover', '2024-12-31', 'pending', '20000000-0000-0000-0000-000000000001'),
ON CONFLICT DO NOTHING;

-- 8. Risks
INSERT INTO risks (id, project_id, risk_title, description, category, probability, impact, owner_id, mitigation, status, related_area)
VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Equipment delivery delay', 'Shipment from supplier may be delayed due to port congestion', 'procurement', 60, 80, '00000000-0000-0000-0000-000000000003', 'Pre-order with buffer time; identify alternate suppliers', 'open', 'Procurement'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Budget overrun', 'Material costs may exceed estimates during installation', 'finance', 40, 70, '00000000-0000-0000-0000-000000000004', 'Fixed-price procurement; monthly budget reviews', 'monitoring', 'Finance'),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Safety incident during installation', 'Risk of falls or electrical hazards during roof work', 'hse', 25, 90, '00000000-0000-0000-0000-000000000002', 'Safety training; PPE requirements; daily safety briefings', 'open', 'HSE'),
ON CONFLICT DO NOTHING;

-- 9. Issues
INSERT INTO issues (id, project_id, issue_title, description, severity, owner_id, due_date, status, escalation_level)
VALUES
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Partial power outage at County Hall', 'Main grid outage affecting Site Assessment operations', 'medium', '00000000-0000-0000-0000-000000000002', '2024-07-15', 'resolved', 1),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Vendor quotation pending', 'Main supplier has not submitted final quotation', 'high', '00000000-0000-0000-0000-000000000003', '2024-07-30', 'open', 2),
ON CONFLICT DO NOTHING;

-- 10. Procurement Requests
INSERT INTO procurement_requests (id, project_id, task_id, requester_id, title, category, priority, budget_amount, currency, status, expected_delivery_date)
VALUES
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Solar Panels (300kW)', 'equipment', 'critical', 1200000, 'KES', 'quotations', '2024-08-15'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Inverters (50 units)', 'equipment', 'high', 450000, 'KES', 'comparison', '2024-08-15'),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Mounting Structures', 'equipment', 'medium', 350000, 'KES', 'approved', '2024-08-15'),
ON CONFLICT DO NOTHING;

-- 11. Suppliers
INSERT INTO suppliers (supplier_name, contact_name, contact_email, rating, status)
VALUES
  ('SolarTech East Africa', 'Peter Odhiambo', 'peter@solartech.co.ke', 85, 'active'),
  ('GreenEnergy Solutions', 'Sarah Kariuki', 'sarah@greenenergy.co.ke', 78, 'active'),
  ('SunPower Africa Ltd', 'James Muthui', 'james@sunpower.co.ke', 90, 'active'),
ON CONFLICT DO NOTHING;

-- 12. Budget Categories
INSERT INTO budgets (project_id, category, amount, currency, allocated_date, spent_amount, committed_amount)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'equipment', 1800000, 'KES', '2024-06-01', 540000, 1200000),
  ('10000000-0000-0000-0000-000000000001', 'installation_labor', 400000, 'KES', '2024-06-01', 120000, 200000),
  ('10000000-0000-0000-0000-000000000001', 'transportation', 100000, 'KES', '2024-06-01', 30000, 50000),
  ('10000000-0000-0000-0000-000000000001', 'contingency', 200000, 'KES', '2024-06-01', 0, 0),
ON CONFLICT DO NOTHING;

-- 13. Expenses
INSERT INTO expenses (project_id, task_id, expense_category, amount, currency, expense_date, submitted_by, description, approval_status)
VALUES
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'equipment', 540000, 'KES', '2024-07-15', '00000000-0000-0000-0000-000000000003', 'Solar panels partial delivery', 'approved'),
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'transportation', 30000, 'KES', '2024-07-10', '00000000-0000-0000-0000-000000000003', 'Equipment transport to site', 'pending'),
  ('10000000-0000-0000-0000-000000000001', NULL, 'labor', 120000, 'KES', '2024-07-01', '00000000-0000-0000-0000-000000000004', 'Site assessment team labor', 'approved'),
ON CONFLICT DO NOTHING;

-- 14. Evidence Records
INSERT INTO evidence_records (id, project_id, task_id, uploader_id, title, description, evidence_type, verification_status)
VALUES
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Site Assessment Photos', 'Photos from facility assessments', 'photo', 'verified'),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Procurement Receipt', 'Receipt for first equipment delivery', 'document', 'pending'),
ON CONFLICT DO NOTHING;

-- 15. Notifications
INSERT INTO notifications (id, user_id, type, title, message, read)
VALUES
  ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'approval', 'Procurement Approval Required', 'Solar Panels quotation requires your approval', false),
  ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'task', 'Task Update', 'Panel Installation is now In Progress', false),
  ('90000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'procurement', 'Quotation Received', 'New quotation received for Inverters', true),
ON CONFLICT DO NOTHING;

-- 16. Documents
INSERT INTO documents (id, project_id, category, module, title, uploaded_by, version)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'workplans', NULL, 'Loreto Solarization Workplan v1.0', '00000000-0000-0000-0000-000000000001', '1.0'),
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'contracts', NULL, 'Contractor Agreement', '00000000-0000-0000-0000-000000000001', '1.0'),
  ('a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'hse', NULL, 'Safety Plan', '00000000-0000-0000-0000-000000000002', '1.0'),
ON CONFLICT DO NOTHING;

-- 17. Site Reports
INSERT INTO site_reports (id, project_id, task_id, report_date, location, work_completed, reported_by)
VALUES
  ('b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', '2024-09-01', 'County Hall', 'Installation of 15 panels on main roof', '00000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', '2024-09-02', 'Library Annex', 'Foundation work completed', '00000000-0000-0000-0000-000000000002'),
ON CONFLICT DO NOTHING;

-- 18. Closure Checklist
INSERT INTO closure_checklist (id, project_id, item_name, category, required, status, notes)
VALUES
  ('c0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'All tasks completed', 'tasks', true, 'pending', '5 of 6 tasks done'),
  ('c0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Financial reconciliation', 'finance', true, 'pending', ''),
  ('c0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'HSE compliance sign-off', 'hse', true, 'in_progress', 'Safety audit scheduled'),
  ('c0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Handover document approved', 'handover', true, 'pending', ''),
  ('c0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'All procurement closed', 'procurement', true, 'pending', ''),
ON CONFLICT DO NOTHING;

-- 19. Comments
INSERT INTO comments (id, project_id, author_id, content, related_object_type, related_object_id)
VALUES
  ('d0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Site work progressing well at County Hall.', 'task', '30000000-0000-0000-0000-000000000004'),
  ('d0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Need to expedite inverter delivery. Follow up with supplier.', 'procurement', '70000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- 20. Incidents
INSERT INTO incidents (id, project_id, incident_type, title, description, severity, reported_by, date_occurred, location, people_involved, immediate_actions, investigation, corrective_actions, status, created_at, updated_at)
VALUES
  ('e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'safety', 'Minor fall at County Hall site', 'Worker slipped on wet surface during roof assessment', 'medium', '00000000-0000-0000-0000-000000000002', '2024-09-10', 'County Hall', '2 workers', 'First aid applied; incident reported', 'Investigation ongoing', 'Improve site drainage and add anti-slip mats', 'investigating', NOW(), NOW()),
  ('e0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'safety', 'Electrical hazard during installation', 'Exposed wiring found at Library Annex installation point', 'high', '00000000-0000-0000-0000-000000000002', '2024-09-15', 'Library Annex', '1 electrician', 'Area cordoned off; qualified electrician notified', 'Root cause analysis in progress', 'Install proper cable conduits before next phase', 'open', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 21. Inspections
INSERT INTO inspections (id, project_id, inspection_type, title, description, inspector_id, inspection_date, location, findings, compliance_status, evidence_path, status, created_at)
VALUES
  ('f0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'safety', 'Site Safety Inspection - County Hall', 'Quarterly safety compliance check', '00000000-0000-0000-0000-000000000001', '2024-09-01', 'County Hall', 'PPE compliance good; emergency exits clear', 'compliant', NULL, 'open', NOW()),
  ('f0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'electrical', 'Electrical Installation Inspection - Library', 'Electrical wiring and grounding verification', '00000000-0000-0000-0000-000000000002', '2024-09-18', 'Library Annex', 'Cable routing non-compliant; missing grounding on inverter 3', 'non_compliant', NULL, 'open', NOW())
ON CONFLICT DO NOTHING;

-- 22. Corrective Actions
INSERT INTO corrective_actions (id, project_id, incident_id, inspection_id, risk_id, title, description, assigned_to, due_date, status, created_at, updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', NULL, NULL, 'Improve site drainage', 'Install proper drainage system at County Hall roof work area to prevent future slips', '00000000-0000-0000-0000-000000000002', '2024-09-25', 'in_progress', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', NULL, 'f0000000-0000-0000-0000-000000000002', NULL, 'Fix electrical grounding', 'Install proper cable conduits and grounding on inverter 3 at Library Annex', '00000000-0000-0000-0000-000000000002', '2024-09-20', 'open', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 23. Near Misses
INSERT INTO near_misses (id, project_id, report_date, location, description, risk_level, category, responsible_person, mitigation, due_date, status, created_by, created_at, updated_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2024-09-12', 'County Hall', 'Inverter almost dropped during crane lift — operator stopped operation in time', 'high', 'hse', '00000000-0000-0000-0000-000000000002', 'Re-certify crane operator; add tag line; revised lift plan', '2024-10-01', 'open', '00000000-0000-0000-0000-000000000002', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 24. Payments
INSERT INTO payments (id, project_id, expense_id, supplier_id, amount, currency, payment_method, payment_date, reference_number, status, created_at)
VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', NULL, '30000000-0000-0000-0000-000000000002', 540000, 'KES', 'bank_transfer', '2024-07-20', 'PAY-2024-0715-001', 'completed', NOW())
ON CONFLICT DO NOTHING;

-- 25. Funds
INSERT INTO funds (id, project_id, source, funding_type, amount, currency, date_received, reference, document_path, status, description, created_by, created_at, updated_at)
VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'County Council Treasury', 'grant', 1500000, 'KES', '2024-06-15', 'FND-2024-001', NULL, 'received', 'Initial project funding allocation', '00000000-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 26. Finance Approvals
INSERT INTO finance_approvals (id, project_id, expense_id, requester_id, approver_id, type, status, reason, comment, amount, submitted_at, decided_at, created_at)
VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', NULL, '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'expense', 'pending', 'Equipment procurement approval', NULL, 1200000, NOW(), NULL, NOW())
ON CONFLICT DO NOTHING;
