SHANJI DNA Database Schema

## Overview
Shanji DNA is a professional project-operations and project-accountability platform designed for organizations managing complex projects involving multiple departments, field teams, contractors, procurement, finance, compliance, and management.

This document describes the database schema, Row Level Security (RLS) policies, and core business logic for the Shanji DNA platform.

## Key Design Principles

1. **Single Source of Truth**: All project data, tasks, evidence, approvals, and communications are stored in a unified PostgreSQL database with strict RLS enforcement.

2. **Role-Based Access Control**: Access is controlled through database RLS policies using the `profiles` table role field. The Supabase `auth` system provides authentication while the application permissions layer ensures business logic compliance.

3. **Soft Delete / Historical Integrity**: Completed projects, archived records, and historical evidence are preserved with audit trails rather than being deleted.

4. **Normalization**: The schema uses normalized tables where appropriate to maintain data integrity and avoid redundancy.

5. **Evidence-Centric**: All evidence, comments, approvals, and deliverables are linked to specific tasks and projects with immutable audit trails.

## Database Schema

The database contains 42 core tables organized around five main domains:

### Organizations & Access

- `organizations`: Company/organizational data
- `profiles`: User profiles with role and organization assignments
- `organization_members`: Membership relationships between users and organizations

### Projects & Work Management

- `projects`: Project master data with status, health, and progress
- `project_members`: Project participation (users + roles)
- `project_phases`: High-level project phases and milestones
- `wbs_items`: Work Breakdown Structure (hierarchical)
- `workplans`: Workplan versions with statuses
- `workplan_items`: Task/WBS items with dependencies and progress tracking
- `task_assignments`: Task responsibility assignments

### Accountability & Compliance

- `evidence_records`: All project evidence (photos, documents, videos)
- `approvals`: Centralized approval workflow
- `risks`: Risk register with calculated scores
- `issues`: Issue tracking
- `site_reports`: Daily/weekly progress reports
- `inspections`: Inspection records
- `incidents`: Incident reports and corrective actions
- `indicators`: M&E indicators for monitoring

### Operations & Procurement

- `procurement_requests`: Purchase requisitions and RFQs
- `suppliers`: Vendor master data
- `quotations`: Supplier quotes
- `purchase_orders`: Issued POs
- `deliveries`: Delivery tracking
- `budgets`: Project budget categories
- `expenses`: Financial expenditures
- `payments`: Payment processing

### Documentation & Communication

- `documents`: Document repository
- `document_versions`: Version control for documents
- `change_requests`: Scope change management
- `change_request_impacts`: Impact analysis for changes
- `handover_records`: Project closeout data
- `closure_checklist`: Project closure verification items

### System & Administration

- `notifications`: User notification center
- `comments`: Project communication
- `audit_logs`: Immutable audit trail for all changes

## Row Level Security (RLS)

### Core Principle

All tables have RLS enabled. Access is granted through policies based on:

1. **Project membership**: User must be a project member to access project data
2. **Organization membership**: User must belong to an organization for organization-level data
3. **Role-based permissions**: Project managers, finance, procurement, HSE, etc. have elevated access

### Key Policy Patterns

**For most tables:**
- `SELECT`: Users can access data where they are project members
- `INSERT`: Users can create records where they have appropriate permissions
- `UPDATE`: Users can modify records where they have ownership/edit rights
- `DELETE`: Generally not permitted for historical data

**Special tables:**
- `audit_logs`: Service role only (append-only)
- `profiles`: Users can only access their own profile

### RLS Implementation Details

#### Projects
```sql
-- Project members can view
CREATE POLICY "Project members can view projects" ON projects FOR SELECT
  USING (id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- PM can create projects
CREATE POLICY "PM can create projects" ON projects FOR INSERT
  WITH CHECK (auth.uid() = pm_user_id OR EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner','admin') 
    AND organization_id = projects.organization_id
  ));
```

#### Workplan Items (Tasks)
```sql
-- Project members can view workplan items
CREATE POLICY "Project members can view workplan items" ON workplan_items FOR SELECT
  USING (workplan_id IN (SELECT id FROM workplans 
                        WHERE project_id IN (SELECT project_id FROM project_members 
                                           WHERE user_id = auth.uid())));

-- Team can update assigned workplan items
CREATE POLICY "Team can update assigned workplan items" ON workplan_items FOR UPDATE
  USING (workplan_id IN (SELECT id FROM workplans 
                        WHERE project_id IN (SELECT project_id FROM project_members 
                                           WHERE user_id = auth.uid())) 
         AND (
           EXISTS (SELECT 1 FROM task_assignments 
                   WHERE task_id = workplan_items.id AND user_id = auth.uid())
           OR EXISTS (SELECT 1 FROM workplans 
                      WHERE id = workplan_id 
                      AND project_id IN (SELECT project_id FROM project_members 
                                       WHERE user_id = auth.uid()) 
                      AND role IN ('project_manager'))
         ));
```

#### Evidence
```sql
-- Project members can view evidence
CREATE POLICY "Project members can view evidence" ON evidence_records FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- Users can upload evidence
CREATE POLICY "Users can upload evidence" ON evidence_records FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- Users can update own evidence
CREATE POLICY "Users can update own evidence" ON evidence_records FOR UPDATE
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) 
         AND uploader_id = auth.uid());
```

#### Approvals
```sql
-- Project members can view approvals
CREATE POLICY "Project members can view approvals" ON approvals FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- Users can create approvals
CREATE POLICY "Users can create approvals" ON approvals FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- Approvers can decide
CREATE POLICY "Approvers can decide" ON approvals FOR UPDATE
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) 
         AND approver_id = auth.uid());
```

#### Finance (Expenses & Budgets)
```sql
-- Project members can view expenses
CREATE POLICY "Project members can view expenses" ON expenses FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- Finance team can manage expenses
CREATE POLICY "Finance team can manage expenses" ON expenses FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) 
         AND EXISTS (SELECT 1 FROM project_members 
                     WHERE project_id = expenses.project_id 
                     AND user_id = auth.uid() 
                     AND role IN ('finance','project_manager')));
```

## Triggers & Business Logic

### update_timestamp()
Ensures all tables with `updated_at` fields are updated on modification.

### calculate_risk_score()
Calculates risk scores as `probability * impact` for the `risks` table.

### calculate_project_health()
Calculates project health based on:
- Overdue tasks > 5 → RED
- Overdue tasks 1-5 OR critical risks > 2 → AMBER
- Critical issues present → RED
- Otherwise → GREEN

## Seed Data

Seed data is located at `supabase/seed.sql` and creates:

- A sample organization (Acme Construction)
- An administrative user (admin@acme.com)
- A demo project (Loreto Solarization)
- Complete project data including workplans, tasks, evidence, risks, issues, procurement, finance, and site activities

## Tables

| Table | Description |
|-------|-------------|
| organizations | Company/organizational data |
| profiles | User profiles with roles and organization assignments |
| organization_members | Membership relationships |
| projects | Project master data |
| project_members | Project participation |
| project_phases | Project phases and milestones |
| wbs_items | Work Breakdown Structure |
| workplans | Workplan versions |
| workplan_items | Tasks/WBS items |
| task_dependencies | Task predecessor/successor relationships |
| milestones | Project milestones |
| deliverables | Project deliverables |
| task_assignments | Task responsibility assignments |
| evidence_records | All project evidence |
| approvals | Centralized approval workflow |
| risks | Risk register |
| issues | Issue tracking |
| procurement_requests | Purchase requisitions |
| suppliers | Vendor master data |
| quotations | Supplier quotes |
| purchase_orders | Issued POs |
| deliveries | Delivery tracking |
| budgets | Project budget categories |
| expenses | Financial expenditures |
| payments | Payment processing |
| site_reports | Daily/weekly progress reports |
| inspections | Inspection records |
| incidents | Incident reports |
| corrective_actions | Corrective action tracking |
| indicators | M&E indicators |
| documents | Document repository |
| document_versions | Document version control |
| change_requests | Scope change management |
| change_request_impacts | Impact analysis |
| handover_records | Project closeout data |
| closure_checklist | Project closure verification |
| notifications | User notification center |
| comments | Project communication |
| audit_logs | Immutable audit trail |

## Testing & Development

### Local Development
To set up a local development environment:

1. Install PostgreSQL locally
2. Create database and restore schema:
   ```sql
   CREATE DATABASE shanji_dev;
   \c shanji_dev
   \i /path/to/shanji-frontend/supabase/migrations/001_initial_schema.sql
   \i /path/to/shanji-frontend/supabase/seed.sql
   ```

3. Set environment variables:
   ```env
   VITE_SUPABASE_URL=postgresql://postgres:postgres@localhost:5432/shanji_dev
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Database Migration
Use `supabase db push` to deploy schema changes to a Supabase project.

### Application Testing
Run the application:
```bash
npm run dev
```

The application connects to Supabase using the configuration in `src/lib/supabase.ts`.

## Important Notes

1. **Security**: All access is controlled via RLS. Application-level checks should serve as a UX layer only.

2. **Historical Data**: Once created, records are immutable. Historical project data is preserved for audit and reporting.

3. **Dependencies**: The application uses TanStack React Query for data fetching and caching.

4. **Role-Based UI**: Frontend components conditionally render based on user permissions from the `usePermissions` hook.

5. **Offline Considerations**: Architecture supports offline-ready behavior with local task state and queued uploads.

## Configuration

The application uses environment variables:

- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key

If not set, defaults are used (see `src/lib/supabase.ts`).

---

*Generated according to Shanji DNA product specifications*