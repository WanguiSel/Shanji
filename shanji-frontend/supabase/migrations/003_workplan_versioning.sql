<<<<<<< ours
=======
-- ============================================
-- WORKPLAN VERSIONING - INITIAL CREATION
-- ============================================

-- ============================================
-- WORKPLAN VERSIONING - DEPLOYABLE FINAL VERSION
-- ============================================

-- 1. Create workplan_history table for versioning/audit storage
>>>>>>> theirs
CREATE TABLE IF NOT EXISTS workplan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workplan_id UUID NOT NULL REFERENCES workplans(id) ON DELETE CASCADE,
  version_sequence INTEGER NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  change_summary TEXT,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES profiles(id),
  UNIQUE(project_id, version_sequence),
  UNIQUE(project_id, version)
);

<<<<<<< ours
-- ===========================================
-- RLS
=======
-- ============================================
-- RLS - Replace existing broad policies
>>>>>>> theirs
-- ============================================

-- Enable RLS on workplan_history
ALTER TABLE workplan_history ENABLE ROW LEVEL SECURITY;

<<<<<<< ours
-- Only project managers can view history
=======
-- Remove existing problematic policy if exists
DROP POLICY IF EXISTS "PM can manage workplans" ON workplans;
DROP POLICY IF EXISTS "Project members can view workplans" ON workplans;

-- Workplan viewing: all project members can view current workplan
CREATE POLICY "Project members can view workplans" ON workplans
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Workplan history: PMs only (read-only)
>>>>>>> theirs
CREATE POLICY "Project managers can view workplan history" ON workplan_history
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
      AND role IN ('project_manager')
    )
  );

<<<<<<< ours
-- PM can create versions
CREATE POLICY "Project managers can create history" ON workplan_history
=======
-- Assistants can create draft history
CREATE POLICY "Assistants can create draft history" ON workplan_history
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
      AND role IN ('project_assistant')
    )
    AND status = 'draft'
  );

-- PMs can create versions
CREATE POLICY "Project managers can create versions" ON workplan_history
>>>>>>> theirs
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
      AND role IN ('project_manager')
    )
  );

<<<<<<< ours
-- Only system/service can archive versions
CREATE POLICY "System can archive workplan history" ON workplan_history
=======
-- PMs can edit their versions
CREATE POLICY "Project managers can edit versions" ON workplan_history
  FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
      AND role IN ('project_manager')
    )
  );

-- Only PMs can archive versions
CREATE POLICY "Project managers can archive versions" ON workplan_history
>>>>>>> theirs
  FOR UPDATE
  USING (false);

<<<<<<< ours
-- ===========================================
-- TRIGGERS
=======
-- ============================================
-- CONSTRAINTS - Approved workplan uniqueness
-- ============================================

-- Prevent multiple approved workplans per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_approved_workplan_per_project
  ON workplans(project_id)
  WHERE status = 'approved';

-- ============================================
-- SECURE IMMUTABILITY - Approved workplans cannot be updated
-- ============================================

-- Use a BEFORE UPDATE trigger for secure immutability
CREATE OR REPLACE FUNCTION workplan_approved_immutability_check()
RETURNS TRIGGER AS $
BEGIN
  -- Check if updating an approved workplan
  IF NEW.id IS DISTINCT FROM OLD.id AND (
    SELECT status FROM workplans WHERE id = NEW.id
  ) = 'approved' THEN
    RAISE EXCEPTION 'Approved workplans cannot be updated';
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workplan_approved_immutability_check
  BEFORE UPDATE ON workplans
  FOR EACH ROW EXECUTE FUNCTION workplan_approved_immutability_check();

-- ============================================
-- SECURE TRIGGER - History archival (SECURITY DEFINER)
>>>>>>> theirs
-- ============================================

CREATE OR REPLACE FUNCTION archive_previous_versions()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workplan_history
  SET is_archived = true,
      archived_at = NOW(),
      archived_by = auth.uid()
  WHERE project_id = NEW.project_id
    AND version_sequence < NEW.version_sequence
    AND is_archived = false
<<<<<<< ours
    AND status = 'approved';
=======
    AND status = 'approved'
    AND (NEW.project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
      AND role IN ('project_manager')
    ));
>>>>>>> theirs
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_archive_previous_versions
  AFTER INSERT ON workplan_history
  FOR EACH ROW
<<<<<<< ours
  EXECUTE FUNCTION archive_previous_versions();
=======
  EXECUTE FUNCTION archive_previous_versions_secure();

-- ============================================
-- WORKFLOW POLICIES - Intended workflow permissions
-- ============================================

-- Assistants can edit draft workplans only
CREATE POLICY "Assistants can edit draft workplans" ON workplans
  FOR UPDATE
  USING (
    status = 'draft'
    AND EXISTS (
      SELECT 1 
      FROM project_members pm
      WHERE pm.project_id = workplans.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'project_assistant'
    )
  );

-- PMs can create new versions
CREATE POLICY "Project managers can create new workplan versions" ON workplans
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM project_members pm
      WHERE pm.project_id = NEW.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'project_manager'
    )
    AND (
      SELECT COUNT(*) FROM workplans WHERE project_id = NEW.project_id AND status = 'approved'
    ) <= 1
  );

-- PMs can submit drafts for review
CREATE POLICY "Project managers can submit workplans" ON workplans
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM project_members pm
      WHERE pm.project_id = workplans.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'project_manager'
    )
    AND status = 'draft'
  )
  WITH CHECK (
    status = 'submitted'
  );

-- PMs can approve submitted/under_review workplans
CREATE POLICY "Project managers can approve workplans" ON workplans
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM project_members pm
      WHERE pm.project_id = workplans.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'project_manager'
    )
    AND status = 'under_review'
  )
  WITH CHECK (
    status = 'approved'
    AND (
      SELECT COUNT(*) FROM workplans w
      WHERE w.project_id = workplans.project_id
      AND w.status = 'approved'
    ) <= 1
  );

-- PMs can reject submitted/under_review workplans
CREATE POLICY "Project managers can reject workplans" ON workplans
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM project_members pm
      WHERE pm.project_id = workplans.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'project_manager'
    )
    AND status = 'under_review'
  )
  WITH CHECK (
    status = 'rejected'
  );
>>>>>>> theirs

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_workplan_history_project ON workplan_history(project_id);
CREATE INDEX idx_workplan_history_sequence ON workplan_history(project_id, version_sequence DESC);
CREATE INDEX idx_workplan_history_status ON workplan_history(status);
<<<<<<< ours
=======

CREATE INDEX idx_workplans_project_status ON workplans(project_id, status);
CREATE INDEX idx_workplans_version ON workplans(version);

>>>>>>> theirs
