-- ============================================
-- ACTIVITY LOGS (for Activity Feed)
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Project members can view activities for their projects
CREATE POLICY "Project members can view activities" ON activity_logs
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert activities for projects they're members of
CREATE POLICY "Project members can insert activities" ON activity_logs
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
    )
    AND actor_id = (
      SELECT id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- No one can update activity records
CREATE POLICY "No updates allowed on activities" ON activity_logs
  FOR UPDATE
  USING (false);

-- No one can delete activity records
CREATE POLICY "No deletes allowed on activities" ON activity_logs
  FOR DELETE
  USING (false);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX idx_activity_logs_project_created ON activity_logs(project_id, created_at DESC);
