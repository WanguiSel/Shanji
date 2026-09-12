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

-- ============================================
-- RLS
-- ============================================

ALTER TABLE workplan_history ENABLE ROW LEVEL SECURITY;

-- Only project managers can view history
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

-- PM can create versions
CREATE POLICY "Project managers can create history" ON workplan_history
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
      AND role IN ('project_manager')
    )
  );

-- Only system/service can archive versions
CREATE POLICY "System can archive workplan history" ON workplan_history
  FOR UPDATE
  USING (false);

-- ============================================
-- TRIGGERS
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
    AND status = 'approved';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_archive_previous_versions
  AFTER INSERT ON workplan_history
  FOR EACH ROW
  EXECUTE FUNCTION archive_previous_versions();

CREATE OR REPLACE FUNCTION update_workplan_updated_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_workplan_timestamp
  BEFORE UPDATE ON workplans
  FOR EACH ROW EXECUTE FUNCTION update_workplan_updated_timestamp();

-- ============================================
-- CONSTRAINTS & POLICIES
-- ============================================

-- Prevent multiple approved workplans per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_approved_workplan_per_project
  ON workplans(project_id)
  WHERE status = 'approved';

-- Immutable approved workplans: prevent updates to approved versions
CREATE POLICY "Approved workplans cannot be updated" ON workplans
  FOR UPDATE
  USING (
    NOT (
      project_id IN (
        SELECT project_id 
        FROM workplans 
        WHERE id = workplans.id 
        AND status = 'approved'
      )
    )
    OR 
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
      AND role IN ('project_manager')
    )
  );

-- Allow PMs to create new versions even when one is approved
CREATE POLICY "PM can create new workplan versions" ON workplans
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
      AND role IN ('project_manager')
    )
    AND (
      SELECT COUNT(*) FROM workplans WHERE project_id = NEW.project_id AND status = 'approved'
    ) <= 1
  );

-- Assistants can edit drafts
CREATE POLICY "Assistants can edit drafts" ON workplans
  FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
      AND role IN ('project_assistant')
    )
    AND status = 'draft'
  );

-- Allow approval workflow for submitted/under_review workplans
CREATE POLICY "Allow PM approval workflow" ON workplans
  FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
      AND role IN ('project_manager')
    )
    AND status IN ('submitted', 'under_review')
  );

-- Allow archiving previous approved version when approving new version
CREATE POLICY "PM can archive previous approved version" ON workplans
  FOR UPDATE
  WITH CHECK (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid() 
      AND role IN ('project_manager')
    )
    AND (
      SELECT COUNT(*) FROM workplans WHERE project_id = workplans.project_id AND status = 'approved'
    ) <= 1
  );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_workplan_history_project ON workplan_history(project_id);
CREATE INDEX idx_workplan_history_sequence ON workplan_history(project_id, version_sequence DESC);
CREATE INDEX idx_workplan_history_status ON workplan_history(status);

-- ============================================
-- MISC INDEXES
-- ============================================

CREATE INDEX idx_workplans_project_status ON workplans(project_id, status);
CREATE INDEX idx_workplans_version ON workplans(version);
