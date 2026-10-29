-- RLS policies for HSEQ/OHS modules

CREATE POLICY "Project members can view inspections" ON inspections FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "OHS/PM can manage inspections" ON inspections FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) AND EXISTS (
    SELECT 1 FROM project_members WHERE project_id = inspections.project_id AND user_id = auth.uid() AND role IN ('project_manager','ohs')
  ));

CREATE POLICY "Project members can view incidents" ON incidents FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "OHS/PM can manage incidents" ON incidents FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) AND EXISTS (
    SELECT 1 FROM project_members WHERE project_id = incidents.project_id AND user_id = auth.uid() AND role IN ('project_manager','ohs')
  ));

CREATE POLICY "Project members can view corrective actions" ON corrective_actions FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())) OR (project_id IN (SELECT project_id FROM inspections WHERE id = corrective_actions.inspection_id AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()))) OR (project_id IN (SELECT project_id FROM incidents WHERE id = corrective_actions.incident_id AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())));

CREATE POLICY "OHS/PM can manage corrective actions" ON corrective_actions FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) AND EXISTS (
    SELECT 1 FROM project_members WHERE project_id = corrective_actions.project_id AND user_id = auth.uid() AND role IN ('project_manager','ohs')
  ));

CREATE POLICY "Project members can view payments" ON payments FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Finance/PM can manage payments" ON payments FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) AND EXISTS (
    SELECT 1 FROM project_members WHERE project_id = payments.project_id AND user_id = auth.uid() AND role IN ('finance','project_manager')
  ));
