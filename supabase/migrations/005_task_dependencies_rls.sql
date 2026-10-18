-- RLS policies for task_dependencies

CREATE POLICY "Project members can view task dependencies" ON task_dependencies FOR SELECT
  USING (task_id IN (SELECT id FROM workplan_items WHERE workplan_id IN (SELECT id FROM workplans WHERE project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()))));

CREATE POLICY "PM can manage task dependencies" ON task_dependencies FOR ALL
  USING (task_id IN (SELECT id FROM workplan_items WHERE workplan_id IN (SELECT id FROM workplans WHERE project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) AND role IN ('project_manager'))));
