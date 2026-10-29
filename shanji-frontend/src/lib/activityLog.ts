import { supabase } from "./supabase";

// Writes the richer activity payload first, then falls back to the reduced
// live column set (project_id, user_id, action, created_at).
export async function logProjectActivity(
  projectId: string,
  userId: string | undefined,
  action: string,
  description: string,
  entityType = "project",
  entityId = "",
): Promise<void> {
  if (!projectId || !userId) return;
  const rich = await supabase.from("activity_logs").insert({
    project_id: projectId,
    actor_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    description,
    metadata: {},
    created_at: new Date().toISOString(),
  });
  if (!rich.error) return;

  await supabase.from("activity_logs").insert({
    project_id: projectId,
    user_id: userId,
    action,
    created_at: new Date().toISOString(),
  });
}
