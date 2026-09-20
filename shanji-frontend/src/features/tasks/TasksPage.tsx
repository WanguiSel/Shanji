import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { getTaskTransitionMatrix } from "../../lib/utils";

function TasksPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
  const { toasts, showToast, removeToast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
=======
  const { toasts, showToast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
>>>>>>> theirs
=======
  const { toasts, showToast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
>>>>>>> theirs
=======
  const { toasts, showToast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
>>>>>>> theirs
=======
  const { toasts, showToast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
>>>>>>> theirs
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskResponsibleRole, setNewTaskResponsibleRole] = useState("");
  const [newTaskResponsibleUser, setNewTaskResponsibleUser] = useState("");
  const [editingTask, setEditingTask] = useState<any>(null);

  const loadTasks = async () => {
    if (!id) return;
    setError(null);
    try {
      const { data: wpData } = await supabase.from("workplans").select("id").eq("project_id", id);
      if (!wpData?.length) {
        setTasks([]);
        setLoading(false);
        return;
      }
      const wpIds = wpData.map((w) => w.id);
      const { data, error: qError } = await supabase
        .from("workplan_items")
        .select("*")
        .in("workplan_id", wpIds)
        .order("sort_order");
      if (qError) throw qError;
      setTasks((data || []) as any[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
<<<<<<< ours
  };

  const logActivity = async (action: string, description: string) => {
    if (!id || !user?.id) return;
    await supabase.from("activity_logs").insert({
      project_id: id,
      actor_id: user.id,
      action,
      entity_type: "workplan_item",
      entity_id: "",
      description,
      metadata: {},
      created_at: new Date().toISOString(),
    }).then(({ error }) => { if (error) console.error("Activity log failed:", error); });
  };

=======
    const wpIds = wpData.map((w) => w.id);
    const { data } = await supabase
      .from("workplan_items")
      .select("*")
      .in("workplan_id", wpIds)
      .order("sort_order");
    setTasks((data || []) as any[]);
    setLoading(false);
  };

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
  const createTask = async () => {
    if (!id || !newTaskTitle.trim()) return;
    const { data: wpData } = await supabase
      .from("workplans")
      .select("id")
      .eq("project_id", id)
      .single();
    if (!wpData?.id) return;

    const taskData = {
      workplan_id: wpData.id,
      task_title: newTaskTitle.trim(),
      description: null,
      responsible_role: newTaskResponsibleRole || null,
      responsible_user_id: newTaskResponsibleUser || null,
      priority: newTaskPriority,
      start_date: newTaskStartDate || null,
      end_date: newTaskDueDate || null,
      status: "not_started",
      progress: 0,
      sort_order: tasks.length + 1,
      created_by: user?.id,
    };

    const { error } = await supabase.from("workplan_items").insert(taskData);

    if (!error) {
      setShowCreateModal(false);
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setNewTaskStartDate("");
      setNewTaskDueDate("");
      setNewTaskResponsibleRole("");
      setNewTaskResponsibleUser("");
      showToast("success", "Task created");
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
      await logActivity("task_created", `Task "${newTaskTitle.trim()}" created`);
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
      loadTasks();
    } else {
      showToast("error", "Failed to create task");
    }
  };

  const updateTask = async (taskId: string, updates: Partial<any>) => {
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    const { data: taskData, error } = await supabase
=======
    const { error } = await supabase
>>>>>>> theirs
=======
    const { error } = await supabase
>>>>>>> theirs
=======
    const { error } = await supabase
>>>>>>> theirs
=======
    const { error } = await supabase
>>>>>>> theirs
      .from("workplan_items")
      .update(updates)
      .eq("id", taskId)
      .select()
      .single();

    if (!error) {
      showToast("success", "Task updated");
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
      await logActivity("task_updated", `Task "${taskData?.task_title || taskId}" updated`);
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
      loadTasks();
      return true;
    } else {
      showToast("error", "Failed to update task");
      return false;
    }
  };

  const deleteTask = async (taskId: string) => {
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    const { data: taskData, error } = await supabase
      .from("workplan_items")
      .delete()
      .eq("id", taskId)
      .select()
      .single();

    if (!error) {
      showToast("success", "Task deleted");
      await logActivity("task_deleted", `Task "${taskData?.task_title || taskId}" deleted`);
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
    const { error } = await supabase
      .from("workplan_items")
      .delete()
      .eq("id", taskId);

    if (!error) {
      showToast("success", "Task deleted");
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
      loadTasks();
      return true;
    } else {
      showToast("error", "Failed to delete task");
      return false;
    }
  };

  const canEditTask = (task: any) => {
    if (!user) return false;
    if (task.created_by === user.id) return true;
    if (task.responsible_user_id === user.id) return true;
    const projectRoles = user.project_roles || {};
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    if (!id) return false;
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
    if (projectRoles[id] && (projectRoles[id] === "project_manager" || projectRoles[id] === "site_supervisor")) return true;
    if (task.responsible_role === "assistant" && user.role === "assistant") return true;
    return false;
  };

  const getProtectedFields = () => {
    return ["task_title", "description", "priority", "start_date", "end_date", "responsible_role", "responsible_user_id", "status", "progress"];
  };

  useEffect(() => {
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
    setError(null);
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
    loadTasks();
  }, [id]);

  if (loading) return <Loading />;
  if (error) return (
    <Card>
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ fontSize: '16px', fontWeight: 500, color: '#DC2626', marginBottom: '12px' }}>Error loading tasks</p>
        <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>{error}</p>
        <button className="btn btn-primary" onClick={loadTasks}>Retry</button>
      </div>
    </Card>
  );

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Tasks</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Workplan execution and tracking</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ New Task</button>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <EmptyState title="No tasks yet" message="Create your first task to start tracking work." />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tasks.map((task: any) => (
            <Card key={task.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                    {canEditTask(task) ? (
                      <input
                        type="text"
                        defaultValue={task.task_title}
                        onBlur={(e) => updateTask(task.id, { task_title: e.target.value })}
                        style={{ fontSize: '16px', fontWeight: 600, border: '1px solid #D1D5DB', padding: '2px 8px', borderRadius: '4px' }}
                      />
                    ) : (
                      task.task_title
                    )}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <span>Priority: {task.priority}</span>
                    <span>•</span>
                    <span>Due: {task.end_date ? new Date(task.end_date).toLocaleDateString() : 'Not set'}</span>
                    <span>•</span>
                    <span>Status: <StatusBadge status={task.status} /></span>
                    {task.responsible_user_id && (
                      <>
                        <span>•</span>
                        <span>Owner: {task.responsible_user_id.slice(0, 8)}</span>
                      </>
                    )}
                  </div>
                  {canEditTask(task) && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <select
                        value={task.priority}
                        onChange={(e) => updateTask(task.id, { priority: e.target.value })}
                        style={{ fontSize: '12px', padding: '4px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                      <input
                        type="date"
                        value={task.end_date ? task.end_date.split('T')[0] : ''}
                        onChange={(e) => updateTask(task.id, { end_date: e.target.value })}
                        style={{ fontSize: '12px', padding: '4px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                      />
                      <button
                        onClick={() => setEditingTask(task)}
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '11px' }}
                      >
                        Edit Details
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '11px', color: '#DC2626', borderColor: '#FECACA' }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: task.progress === 100 ? '#059669' : '#6B7280' }}>
                    {task.progress || 0}% complete
                  </div>
                  {getTaskTransitionMatrix(task.status).length > 0 && canEditTask(task) && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      {getTaskTransitionMatrix(task.status).map((status) => (
                        <button
                          key={status}
                          className="btn btn-sm btn-secondary"
                          onClick={() => updateTask(task.id, { status })}
                          style={{ fontSize: '11px' }}
                        >
                          → {status.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {editingTask?.id === task.id && (
                <div style={styles.editModal}>
                  <h4 style={{ marginBottom: '12px' }}>Edit Task Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={styles.label}>Description</label>
                      <textarea
                        value={editingTask.description || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB', minHeight: '60px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Start Date</label>
                        <input
                          type="date"
                          value={editingTask.start_date ? editingTask.start_date.split('T')[0] : ''}
                          onChange={(e) => setEditingTask({ ...editingTask, start_date: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Due Date</label>
                        <input
                          type="date"
                          value={editingTask.end_date ? editingTask.end_date.split('T')[0] : ''}
                          onChange={(e) => setEditingTask({ ...editingTask, end_date: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Responsible Role</label>
                        <select
                          value={editingTask.responsible_role || ''}
                          onChange={(e) => setEditingTask({ ...editingTask, responsible_role: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                        >
                          <option value="">Not assigned</option>
                          <option value="procurement">Procurement</option>
                          <option value="site_supervisor">Site Supervisor</option>
                          <option value="finance">Finance</option>
                          <option value="hse">HSE</option>
                          <option value="assistant">Assistant</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>Responsible User</label>
                        <input
                          type="text"
                          value={editingTask.responsible_user_id || ''}
                          onChange={(e) => setEditingTask({ ...editingTask, responsible_user_id: e.target.value })}
                          placeholder="User ID"
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setEditingTask(null)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          const success = await updateTask(editingTask.id, {
                            description: editingTask.description,
                            start_date: editingTask.start_date,
                            end_date: editingTask.end_date,
                            responsible_role: editingTask.responsible_role,
                            responsible_user_id: editingTask.responsible_user_id,
                          });
                          if (success) setEditingTask(null);
                        }}
                        className="btn btn-primary"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '16px' }}>Create New Task</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={styles.label}>Task Title *</label>
                <input
                  type="text"
                  className="input"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                  style={{ marginBottom: '8px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Priority</label>
                  <select
                    className="input"
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Start Date</label>
                  <input
                    type="date"
                    className="input"
                    value={newTaskStartDate}
                    onChange={(e) => setNewTaskStartDate(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Due Date</label>
                  <input
                    type="date"
                    className="input"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Responsible Role</label>
                  <select
                    className="input"
                    value={newTaskResponsibleRole}
                    onChange={(e) => setNewTaskResponsibleRole(e.target.value)}
                  >
                    <option value="">Not assigned</option>
                    <option value="procurement">Procurement</option>
                    <option value="site_supervisor">Site Supervisor</option>
                    <option value="finance">Finance</option>
                    <option value="hse">HSE</option>
                    <option value="assistant">Assistant</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Responsible User</label>
                  <input
                    type="text"
                    className="input"
                    value={newTaskResponsibleUser}
                    onChange={(e) => setNewTaskResponsibleUser(e.target.value)}
                    placeholder="User ID"
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
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
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: 'white', padding: '32px', borderRadius: '12px', width: '560px', maxHeight: '90vh', overflow: 'auto' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' },
  editModal: { marginTop: '12px', padding: '16px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' },
};

export default TasksPage;