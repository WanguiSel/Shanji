import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/Card";
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
  const [selectedDependency, setSelectedDependency] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const loadDependencies = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("task_dependencies")
      .select("*, workplan_items(*)")
      .eq("project_id", id)
      .order("created_at", { ascending: false });
    setDependencies((data || []) as any[]);
    setLoading(false);
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

    const { data: dependencies } = await supabase
      .from("task_dependencies")
      .select("id, task_id, dependent_task_id, mandatory")
      .eq("project_id", id);

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
            message: `Task ${successorTask.id} is now available for work.",
            data: { task_id: successorTask.id, project_id: id },
            created_at: new Date().toISOString(),
          });

        await supabase
          .from("activity_logs")
          .insert({
            project_id: id,
            user_id: user?.id || "unknown",
            action: "dependency_released",
            entity_type: "task_dependency",
            entity_id: dep.id,
            details: `Task ${successorTask.id} released after dependency ${dep.task_id} was approved`,
            created_at: new Date().toISOString(),
          });
      }
    }
  };

  useEffect(() => {
    loadDependencies();
    evaluateDependencies();
  }, [id]);

  if (loading) return <Loading />;

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
