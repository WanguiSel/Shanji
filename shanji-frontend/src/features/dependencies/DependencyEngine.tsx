import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { Loading, EmptyState } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../lib/utils";

function DependencyEngine() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, showToast } = useToast();
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDependency, setSelectedDependency] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const loadDependencies = async () => {
    if (!id) return;
    setError(null);
    try {
      const { data: depData } = await supabase
        .from("task_dependencies")
        .select("*, workplan_items(*)")
        .order("created_at", { ascending: false });
      const filtered = (depData || []).filter((d: any) =>
        d.workplan_items?.[0]?.project_id === id
      );
      setDependencies(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dependencies");
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!id) return;
    try {
      const { data: wpData, error: wpError } = await supabase.from("workplans").select("id").eq("project_id", id);
      if (wpError || !wpData?.length) return;
      const wpIds = wpData.map((w) => w.id);
      const { data } = await supabase.from("workplan_items").select("*").in("workplan_id", wpIds).order("sort_order");
      setDependencies((data || []) as any[]);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  };

  const createDependency = async (dependencyData: any) => {
    const { error } = await supabase
      .from("task_dependencies")
      .insert(dependencyData)
      .select()
      .single();

    if (!error) {
      showToast("success", "Dependency created");
      loadDependencies();
      return true;
    } else {
      showToast("error", "Failed to create dependency");
      return false;
    }
  };

  const updateDependency = async (dependencyId: string, updates: Partial<any>) => {
    const { error } = await supabase
      .from("task_dependencies")
      .update(updates)
      .eq("id", dependencyId)
      .select()
      .single();

    if (!error) {
      showToast("success", "Dependency updated");
      loadDependencies();
      return true;
    } else {
      showToast("error", "Failed to update dependency");
      return false;
    }
  };

  const deleteDependency = async (dependencyId: string) => {
    const { error } = await supabase
      .from("task_dependencies")
      .delete()
      .eq("id", dependencyId);

    if (!error) {
      showToast("success", "Dependency deleted");
      loadDependencies();
      return true;
    } else {
      showToast("error", "Failed to delete dependency");
      return false;
    }
  };

  const evaluateDependencies = async () => {
    if (!id) return;
    const { data: tasks } = await supabase
      .from("workplan_items")
      .select("id, status, responsible_user_id, priority")
      .eq("project_id", id);

    const { data: allDeps } = await supabase
      .from("task_dependencies")
      .select("id, task_id, dependent_task_id, mandatory")
      .order("created_at", { ascending: false });
    const dependencyIds = tasks?.map((t: any) => t.id) || [];
    const dependencies = (allDeps || []).filter((d: any) => dependencyIds.includes(d.task_id));

    for (const dep of dependencies || []) {
      const predecessorTask = tasks?.find((t) => t.id === dep.task_id);
      const successorTask = tasks?.find((t) => t.id === dep.dependent_task_id);

      if (!predecessorTask || !successorTask) continue;

      const canRelease = predecessorTask.status === "approved";

      if (canRelease && successorTask.status !== "released") {
        await supabase
          .from("workplan_items")
          .update({ status: "released" })
          .eq("id", successorTask.id);

    await supabase
      .from("notifications")
      .insert({
        user_id: successorTask.responsible_user_id,
        type: "dependency_released",
        title: "Task Released",
        message: `Task ${successorTask.id} is now available for work`,
        related_object_type: "workplan_item",
        related_object_id: successorTask.id,
        created_at: new Date().toISOString(),
      });

        await supabase
          .from("activity_logs")
          .insert({
            project_id: id,
            actor_id: user?.id || "unknown",
            action: "dependency_released",
            entity_type: "task_dependency",
            entity_id: dep.id,
            description: `Task ${successorTask.id} released after dependency ${dep.task_id} was approved`,
            metadata: {},
            created_at: new Date().toISOString(),
          });
      }
    }
  };

  const pmOverrideDependency = async (taskId: string, reason: string) => {
    if (!user) {
      showToast("error", "You must be logged in to perform this action");
      return false;
    }

    const isPM = user.project_roles && !!id && user.project_roles[id] === 'project_manager';
    if (!isPM) {
      showToast("error", "Only project managers can override dependency blocks");
      return false;
    }

    if (!reason.trim()) {
      showToast("error", "Please provide an override reason");
      return false;
    }

    const { data: task } = await supabase
      .from("workplan_items")
      .select("id, status")
      .eq("id", taskId)
      .single();

    if (!task) {
      showToast("error", "Task not found");
      return false;
    }

    if (task.status !== "blocked") {
      showToast("error", "Only blocked tasks can be overridden");
      return false;
    }

    const { error: updateError } = await supabase
      .from("workplan_items")
      .update({ status: "released" })
      .eq("id", taskId);

    if (updateError) {
      showToast("error", "Failed to override dependency block");
      return false;
    }

    await supabase
      .from("activity_logs")
      .insert({
        project_id: id,
        actor_id: user?.id,
        action: "dependency_override",
        entity_type: "workplan_item",
        entity_id: taskId,
        description: `PM override: Blocked task ${taskId} released due to dependency block. Reason: ${reason}`,
        metadata: {},
        created_at: new Date().toISOString(),
      });

    showToast("success", "Dependency block overridden. Task is now released.");
    loadDependencies();
    loadTasks();
    evaluateDependencies();
    return true;
  };

  const styles: Record<string, React.CSSProperties> = {
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' },
  };

  useEffect(() => {
    setError(null);
    loadDependencies();
    evaluateDependencies();
  }, [id]);

  if (loading) return <Loading />;
  if (error) return (
    <Card>
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ fontSize: '16px', fontWeight: 500, color: '#DC2626', marginBottom: '12px' }}>Error loading dependencies</p>
        <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>{error}</p>
        <button className="btn btn-primary" onClick={loadDependencies}>Retry</button>
      </div>
    </Card>
  );

  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '24px' }}>← Back</button>
      <div style={styles.header}>
        <div>
          <h1>Task Dependencies</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Manage task dependency relationships and release workflow</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Dependency</button>
      </div>

      {dependencies.length === 0 ? (
        <Card>
          <EmptyState title="No dependencies" message="Create dependency relationships between tasks." />
        </Card>
      ) : (
        <div style={styles.grid}>
          {dependencies.map((dep: any) => (
            <Card key={dep.id}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {dep.task_id?.slice(0, 8)} → {dep.dependent_task_id?.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>
                    Mandatory: {dep.mandatory ? "Yes" : "No"}
                  </div>
                </div>
                <StatusBadge status={dep.status || "pending"} />
              </div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                  Predecessor: {dep.workplan_items?.[0]?.task_title || dep.task_id?.slice(0, 8)}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                  Successor: {dep.workplan_items?.[1]?.task_title || dep.dependent_task_id?.slice(0, 8)}
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setSelectedDependency(dep)}
                >
                  Edit Details
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ marginLeft: '8px', color: '#DC2626', borderColor: '#FECACA' }}
                  onClick={() => deleteDependency(dep.id)}
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Task Dependency">
        {selectedDependency ? (
          <div>
            <label style={styles.label}>Dependency Reason</label>
            <textarea
              className="input"
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain why this dependency is needed..."
              style={{ marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  await updateDependency(selectedDependency.id, { reason: overrideReason });
                  setShowModal(false);
                  setOverrideReason("");
                }}
              >
                Save Reason
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label style={styles.label}>Dependency Type</label>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>
                <input type="radio" name="depType" value="predecessor" defaultChecked /> Predecessor
              </label>
              <label style={{ display: 'block', marginBottom: '8px' }}>
                <input type="radio" name="depType" value="successor" /> Successor
              </label>
            </div>
            <label style={styles.label}>Task ID</label>
            <input className="input" placeholder="Enter predecessor task ID" style={{ marginBottom: '12px' }} />
            <label style={styles.label}>Dependent Task ID</label>
            <input className="input" placeholder="Enter dependent task ID" style={{ marginBottom: '16px' }} />
            <label style={styles.label}>Mandatory</label>
            <select className="input" style={{ marginBottom: '16px' }}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary">Create Dependency</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' },
};

export default DependencyEngine;
