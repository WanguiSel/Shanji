import { supabase } from "./supabase";

// The application's original model is `workplan_items`; the live database also
// exposes a `tasks` table with a different column set. This adapter keeps both
// models usable without silently replacing either one.
export type TaskModel = "tasks" | "workplan_items";

export interface NormalizedTask {
  id: string;
  project_id: string;
  task_title: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  responsible_user_id: string | null;
  responsible_role: string | null;
  created_by: string | null;
  _model: TaskModel;
  _raw: Record<string, unknown>;
}

function normalize(row: Record<string, any>, model: TaskModel): NormalizedTask {
  return {
    id: row.id,
    project_id: row.project_id,
    task_title: row.task_title ?? row.description ?? row.title ?? row.name ?? `Task ${String(row.id).slice(0, 8)}`,
    description: row.description ?? null,
    status: row.status ?? "not_started",
    priority: row.priority ?? "medium",
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? row.due_date ?? null,
    progress: row.progress ?? 0,
    responsible_user_id: row.responsible_user_id ?? row.assigned_to ?? null,
    responsible_role: row.responsible_role ?? null,
    created_by: row.created_by ?? null,
    _model: model,
    _raw: row,
  };
}

export async function fetchProjectTasks(projectId: string): Promise<NormalizedTask[]> {
  const primary = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (!primary.error) {
    return ((primary.data || []) as Record<string, any>[]).map((row) => normalize(row, "tasks"));
  }

  const { data: workplans } = await supabase
    .from("workplans")
    .select("id")
    .eq("project_id", projectId);

  if (!workplans?.length) return [];

  const { data, error } = await supabase
    .from("workplan_items")
    .select("*")
    .in("workplan_id", workplans.map((w) => w.id))
    .order("sort_order");

  if (error) throw error;
  return ((data || []) as Record<string, any>[]).map((row) => normalize(row, "workplan_items"));
}

export async function createProjectTask(
  projectId: string,
  input: {
    task_title: string;
    priority?: string;
    start_date?: string | null;
    end_date?: string | null;
    responsible_user_id?: string | null;
    responsible_role?: string | null;
    created_by?: string | null;
  },
): Promise<NormalizedTask> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: projectId,
      description: input.task_title,
      priority: input.priority || "medium",
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      status: "not_started",
      progress: 0,
      ...(input.responsible_user_id ? { assigned_to: input.responsible_user_id } : {}),
    })
    .select()
    .single();

  if (!error && data) return normalize(data as Record<string, any>, "tasks");

  // Fall back to the original workplan-items model.
  let { data: workplan } = await supabase
    .from("workplans")
    .select("id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!workplan?.id) {
    const created = await supabase
      .from("workplans")
      .insert({
        project_id: projectId,
        version: "1.0",
        name: "Project Workplan",
        status: "draft",
        created_by: input.created_by || null,
      })
      .select("id")
      .single();
    workplan = created.data;
    if (created.error) throw created.error;
  }

  const inserted = await supabase
    .from("workplan_items")
    .insert({
      workplan_id: workplan!.id,
      task_title: input.task_title,
      priority: input.priority || "medium",
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      status: "not_started",
      progress: 0,
      responsible_user_id: input.responsible_user_id || null,
      responsible_role: input.responsible_role || null,
      created_by: input.created_by || null,
    })
    .select()
    .single();

  if (inserted.error) throw inserted.error;
  return normalize(inserted.data as Record<string, any>, "workplan_items");
}

export async function updateProjectTask(task: NormalizedTask, updates: Record<string, any>): Promise<void> {
  if (task._model === "tasks") {
    const allowed: Record<string, any> = {};
    if (updates.task_title !== undefined) allowed.description = updates.task_title;
    if (updates.description !== undefined) allowed.description = updates.description;
    for (const key of ["status", "priority", "start_date", "end_date", "progress"]) {
      if (updates[key] !== undefined) allowed[key] = updates[key];
    }
    if (updates.responsible_user_id !== undefined) allowed.assigned_to = updates.responsible_user_id || null;

    const { error } = await supabase.from("tasks").update(allowed).eq("id", task.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("workplan_items").update(updates).eq("id", task.id);
  if (error) throw error;
}

export async function deleteProjectTask(task: NormalizedTask): Promise<void> {
  const table = task._model === "tasks" ? "tasks" : "workplan_items";
  const { error } = await supabase.from(table).delete().eq("id", task.id);
  if (error) throw error;
}

export async function logTaskActivity(
  projectId: string,
  userId: string | undefined,
  action: string,
  description: string,
): Promise<void> {
  if (!projectId || !userId) return;
  const rich = await supabase.from("activity_logs").insert({
    project_id: projectId,
    actor_id: userId,
    action,
    entity_type: "task",
    entity_id: "",
    description,
    metadata: {},
    created_at: new Date().toISOString(),
  });
  if (!rich.error) return;

  // Live activity_logs uses user_id and a reduced column set.
  await supabase.from("activity_logs").insert({
    project_id: projectId,
    user_id: userId,
    action,
    created_at: new Date().toISOString(),
  });
}

