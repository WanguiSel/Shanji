import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import type { WorkplanItem } from "../../types";
import { Card, StatCard } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Loading, EmptyState } from "../../components/Loading";
import { getTaskTransitionMatrix, formatDate, calculateProgress } from "../../lib/utils";
import { useToast } from "../../hooks/useToast";

function TasksPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<WorkplanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    if (!id) return;
    const { data: wpData } = await supabase.from("workplans").select("id").eq("project_id", id);
    if (!wpData?.length) {
      setTasks([]);
      setLoading(false);
      return;
    }
    const wpIds = wpData.map((w) => w.id);
    const { data } = await supabase.from("workplan_items").select("*").in("workplan_id", wpIds).order("sort_order");
    setTasks((data || []) as WorkplanItem[]);
    setLoading(false);
  }

  async function updateTaskStatus(taskId: string, newStatus: string) {
    if (!id) return;
    const { error } = await supabase.from("workplan_items").update({ status: newStatus }).eq("id", taskId);
    if (!error) {
      showToast("success", "Task status updated");
      loadTasks();
    } else {
      showToast("error", "Failed to update task");
    }
  }

  async function createTask() {
    if (!id || !newTitle.trim()) return;
    const { data: wpData } = await supabase.from("workplans").select("id").eq("project_id", id);
    if (!wpData?.length) return;
    const { error } = await supabase.from("workplan_items").insert({
      workplan_id: wpData[0].id,
      task_title: newTitle.trim(),
      created_by: user?.id,
    });
    if (!error) {
      setNewTitle("");
      setShowModal(false);
      showToast("success", "Task created");
      loadTasks();
    }
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Tasks</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Workplan execution and tracking</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Task</button>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <EmptyState title="No tasks yet" message="Create your first task to start tracking work." />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tasks.map((task) => (
            <Card key={task.id}>
              <div style={styles.taskRow}>
                <div style={styles.taskInfo}>
                  <div style={styles.taskTitle}>{task.task_title}</div>
                  <div style={styles.taskMeta}>
                    {task.responsible_user_id && <span>Owner: {task.responsible_user_id.slice(0, 8)}</span>}
                    <span>·</span>
                    <span>Due: {formatDate(task.end_date)}</span>
                    <span>·</span>
                    <span>Priority: {task.priority}</span>
                  </div>
                </div>
                <div style={styles.taskActions}>
                  <StatusBadge status={task.status} />
                  <div style={styles.progressMini}>
                    <div style={{ ...styles.progressMiniFill, width: `${task.progress || 0}%` }} />
                  </div>
                </div>
              </div>
              {getTaskTransitionMatrix(task.status).length > 0 && (
                <div style={styles.transitions}>
                  {getTaskTransitionMatrix(task.status).map((status) => (
                    <button
                      key={status}
                      className="btn btn-sm btn-secondary"
                      onClick={() => updateTaskStatus(task.id, status)}
                      style={{ marginRight: '8px' }}
                    >
                      → {status.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '16px' }}>Create New Task</h2>
            <label style={styles.label}>Task Title</label>
            <input
              className="input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter task title"
              style={{ marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createTask}>Create</button>
            </div>
          </div>
        </div>
      )}

      {toasts.map((t) => (
        <div key={t.id} style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          background: t.type === 'error' ? '#FEF2F2' : t.type === 'warning' ? '#FFFBEB' : t.type === 'info' ? '#EFF6FF' : '#ECFDF5',
          border: `1px solid ${t.type === 'error' ? '#FECACA' : t.type === 'warning' ? '#FDE68A' : t.type === 'info' ? '#BFDBFE' : '#A7F3D0'}`,
          borderRadius: '8px',
          fontSize: '14px',
          zIndex: 1100,
          color: t.type === 'error' ? '#DC2626' : t.type === 'warning' ? '#D97706' : t.type === 'info' ? '#2563EB' : '#059669',
        }} onClick={() => removeToast(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  taskRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '4px' },
  taskMeta: { display: 'flex', gap: '8px', fontSize: '13px', color: '#6B7280', flexWrap: 'wrap' },
  taskActions: { display: 'flex', alignItems: 'center', gap: '16px' },
  progressMini: { width: '100px', height: '4px', background: '#E5E7EB', borderRadius: '2px' },
  progressMiniFill: { height: '100%', background: '#0D6B4E', borderRadius: '2px' },
  transitions: { marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F3F4F6' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '32px', borderRadius: '12px', width: '440px' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block' },
};

export default TasksPage;
