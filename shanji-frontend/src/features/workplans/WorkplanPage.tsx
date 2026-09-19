import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../hooks/useToast";

function WorkplanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, showToast } = useToast();
  const [workplan, setWorkplan] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateVersionModal, setShowCreateVersionModal] = useState(false);
  const [newVersionTitle, setNewVersionTitle] = useState("");
  const [newVersionDescription, setNewVersionDescription] = useState("");
  const [showEditDraftModal, setShowEditDraftModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approveReason, setApproveReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [selectedHistory, setSelectedHistory] = useState<any>(null);

  const getCurrentVersionSequence = () => {
    if (!workplan?.version) return 1;
    const match = workplan.version.match(/^(\d+)(?:\.\d+)?$/);
    return match ? parseInt(match[1]) : 1;
  };

  const isProjectManager = () => {
    if (!user?.project_roles || !id) return false;
    return user.project_roles[id] === 'project_manager';
  };

  const isAssistant = () => {
    if (!user?.project_roles || !id) return false;
    return user.project_roles[id] === 'project_assistant';
  };

  const canEditWorkplan = (wp: any) => {
    if (!user) return false;
    if (isProjectManager()) return true;
    if (isAssistant() && wp.status === 'draft') return true;
    return false;
  };

  const canSubmitWorkplan = (wp: any) => {
    if (!user) return false;
    if (isAssistant() && wp.status === 'draft') return true;
    return false;
  };

  const canReviewWorkplan = (wp: any) => {
    if (!user) return false;
    if (isProjectManager() && wp.status === 'submitted') return true;
    return false;
  };

  const canApproveWorkplan = (wp: any) => {
    if (!user) return false;
    if (isProjectManager() && wp.status === 'under_review') return true;
    return false;
  };

  const canRejectWorkplan = (wp: any) => {
    if (!user) return false;
    if (isProjectManager() && wp.status === 'under_review') return true;
    return false;
  };

  const loadWorkplan = async () => {
    if (!id) return;
    setError(null);
    try {
      const { data: wpData, error: wpError } = await supabase
        .from("workplans")
        .select("*, projects(project_name)")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (wpError) throw wpError;
      if (wpData) {
        setWorkplan(wpData as any);
        loadHistory(wpData.id);
        loadTasks(wpData.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workplan");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (workplanId: string) => {
    try {
      const { data } = await supabase
        .from("workplan_history")
        .select("*")
        .eq("project_id", id)
        .order("version_sequence", { ascending: false });
      setHistory(data || []);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const loadTasks = async (workplanId: string) => {
    try {
      const { data } = await supabase
        .from("workplan_items")
        .select("*")
        .eq("workplan_id", workplanId)
        .order("sort_order");
      setTasks((data || []) as any[]);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  };

  const createNewVersion = async () => {
    if (!id || !newVersionTitle.trim()) return;

    if (!canEditWorkplan(workplan)) {
      showToast("error", "You don't have permission to create a new version");
      return;
    }

    const currentSequence = getCurrentVersionSequence();
    const nextSequence = currentSequence + 1;
    const version = `${nextSequence}.0`;

    const workplanData = {
      project_id: id,
      version: version,
      title: newVersionTitle.trim(),
      description: newVersionDescription.trim() || null,
      status: 'draft',
      created_by: user?.id,
    };

    const { data: newWorkplan, error } = await supabase
      .from("workplans")
      .insert(workplanData)
      .select()
      .single();

    if (!error && newWorkplan) {
      await supabase
        .from("workplan_history")
        .insert({
          project_id: id,
          workplan_id: newWorkplan.id,
          version_sequence: nextSequence,
          version: version,
          title: workplanData.title,
          description: workplanData.description,
          status: 'draft',
          created_by: user?.id,
          change_summary: 'Created new workplan version',
        });

      showToast("success", `New workplan version ${version} created`);
      setShowCreateVersionModal(false);
      setNewVersionTitle("");
      setNewVersionDescription("");
      loadWorkplan();
    } else {
      showToast("error", "Failed to create new version");
    }
  };

  const submitForReview = async (workplan: any) => {
    if (!canSubmitWorkplan(workplan)) {
      showToast("error", "You don't have permission to submit for review");
      return;
    }

    const { error } = await supabase
      .from("workplans")
      .update({
        status: 'submitted',
        updated_at: new Date().toISOString(),
      })
      .eq("id", workplan.id);

    if (!error) {
      await supabase
        .from("activity_logs")
        .insert({
          project_id: id,
          actor_id: user?.id,
          action: "workplan_submitted",
          entity_type: "workplan",
          entity_id: workplan.id,
          description: `Workplan ${workplan.version} submitted for PM review`,
          metadata: {},
          created_at: new Date().toISOString(),
        });

      showToast("success", "Workplan submitted for review");
      setShowSubmitModal(false);
      loadWorkplan();
    } else {
      showToast("error", "Failed to submit workplan");
    }
  };

  const approveWorkplan = async (workplan: any) => {
    if (!canApproveWorkplan(workplan)) {
      showToast("error", "You don't have permission to approve workplan");
      return;
    }

    const { error } = await supabase
      .from("workplans")
      .update({
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", workplan.id);

    if (!error) {
      await supabase
        .from("workplan_history")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          archived_by: user?.id,
        })
        .eq("project_id", id)
        .eq("is_archived", false)
        .eq("status", 'approved')
        .neq("workplan_id", workplan.id);

      await supabase
        .from("activity_logs")
        .insert({
          project_id: id,
          actor_id: user?.id,
          action: "workplan_approved",
          entity_type: "workplan",
          entity_id: workplan.id,
          description: `Workplan ${workplan.version} approved by PM. Reason: ${approveReason}`,
          metadata: {},
          created_at: new Date().toISOString(),
        });

      showToast("success", "Workplan approved");
      setShowApproveModal(false);
      setApproveReason("");
      loadWorkplan();
    } else {
      showToast("error", "Failed to approve workplan");
    }
  };

  const rejectWorkplan = async (workplan: any) => {
    if (!canRejectWorkplan(workplan)) {
      showToast("error", "You don't have permission to reject workplan");
      return;
    }

    const { error } = await supabase
      .from("workplans")
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq("id", workplan.id);

    if (!error) {
      await supabase
        .from("activity_logs")
        .insert({
          project_id: id,
          actor_id: user?.id,
          action: "workplan_rejected",
          entity_type: "workplan",
          entity_id: workplan.id,
          description: `Workplan ${workplan.version} rejected by PM. Reason: ${rejectReason}`,
          metadata: {},
          created_at: new Date().toISOString(),
        });

      showToast("success", "Workplan rejected");
      setShowRejectModal(false);
      setRejectReason("");
      loadWorkplan();
    } else {
      showToast("error", "Failed to reject workplan");
    }
  };
  useEffect(() => {
    setError(null);
    loadWorkplan();
  }, [id]);


  if (loading) return <Loading />;
  if (error) return (
    <Card>
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ fontSize: '16px', fontWeight: 500, color: '#DC2626', marginBottom: '12px' }}>Error loading workplan</p>
        <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>{error}</p>
        <button className="btn btn-primary" onClick={loadWorkplan}>Retry</button>
      </div>
    </Card>
  );





  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: "24px" }}>← Back</button>

      {workplan ? (
        <div>
          <div style={{ marginBottom: "32px" }}>
            <h1>{workplan?.projects?.project_name || 'Workplan'}</h1>
            <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>{workplan?.title}</p>
            <div style={{ marginTop: "16px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <div><span style={{ fontSize: "13px", color: "#6B7280" }}>Version:</span> <span style={{ fontWeight: 600 }}>{workplan?.version}</span></div>
              <div><span style={{ fontSize: "13px", color: "#6B7280" }}>Status:</span> <span style={{ fontWeight: 600 }}>{workplan?.status}</span></div>
              <div><span style={{ fontSize: "13px", color: "#6B7280" }}>Approved by:</span> <span style={{ fontWeight: 600 }}>{workplan?.approved_by ? workplan.approved_by.slice(0, 8) : 'Not approved'}</span></div>
            </div>

          {canEditWorkplan(workplan) && (
            <div style={{ marginBottom: "24px", display: "flex", gap: "8px" }}>
              {workplan?.status === 'draft' && canSubmitWorkplan(workplan) && (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowSubmitModal(true)}
                >
                  Submit for Review
                </button>
              )}
              {canReviewWorkplan(workplan) && <>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowApproveModal(true)}
                >
                  Approve
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowRejectModal(true)}
                >
                  Reject
                </button>
              </>}
            </div>
          )}

          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Version History</h2>
            {history.length === 0 ? (
              <Card>
                <EmptyState title="No version history" message="No workplan versions found" />
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {history.map((hist: any) => (
                  <Card key={hist.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>{hist?.version} - {hist?.title}</h3>
                        <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "4px" }}>
                          <span>Status: {hist?.status}</span>
                          <span style={{ margin: "0 8px" }}>•</span>
                          <span>Created: {new Date(hist?.created_at).toLocaleString()}</span>
                          {hist?.approved_at && (
                             <>
                              <span style={{ margin: "0 8px" }}>•</span>
                              <span>Approved: {new Date(hist?.approved_at).toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {hist?.is_archived && (
                          <div style={{ fontSize: "12px", color: "#9CA3AF", fontStyle: "italic" }}>Archived</div>
                        )}
                        {canEditWorkplan(workplan) && !hist?.is_archived && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => { setSelectedHistory(hist); setShowEditDraftModal(true); setEditTitle(hist?.title); setEditDescription(hist?.description || ""); }}
                          >
                            Edit
                </button>
              )}
                    </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Tasks</h2>
            <button className="btn btn-primary" onClick={() => navigate(`/projects/${workplan?.project_id}/tasks`)}>+ New Task</button>
          </div>

          {tasks.length === 0 ? (
            <Card>
              <EmptyState title="No tasks yet" message="Create your first task to start tracking work." />
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {tasks.map((task: any) => (
                <Card key={task.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>{task?.task_title}</h3>
                      <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "4px" }}>
                        <span>Priority: {task?.priority}</span>
                        <span style={{ margin: "0 8px" }}>•</span>
                        <span>Due: {task?.end_date ? new Date(task?.end_date).toLocaleDateString() : 'Not set'}</span>
                        <span style={{ margin: "0 8px" }}>•</span>
                        <span>Status: {task?.status}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: task?.progress === 100 ? "#059669" : "#6B7280" }}>
                        {task?.progress || 0}% complete
                      </div>
                      <div style={{ marginTop: "8px" }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => navigate(`/projects/${workplan?.project_id}/tasks/${task?.id}/edit`)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
         </div>
        </div>
      ) : (
        <Card>
          <EmptyState title="No workplan found" message="Workplan doesn't exist for this project" />
        </Card>
      )}

      {showCreateVersionModal && (
        <div style={{ position: "fixed", inset: "0", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowCreateVersionModal(false)}>
          <div style={{ background: "white", padding: "32px", borderRadius: "12px", width: "560px", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: "16px" }}>Create New Workplan Version</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" }}>Version Title *</label>
                <input
                  type="text"
                  className="input"
                  value={newVersionTitle}
                  onChange={(e) => setNewVersionTitle(e.target.value)}
                  placeholder="Enter version title"
                  style={{ marginBottom: "8px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" }}>Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={newVersionDescription}
                  onChange={(e) => setNewVersionDescription(e.target.value)}
                  placeholder="Enter version description..."
                  style={{ marginBottom: "16px" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateVersionModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createNewVersion}>Create Version</button>
            </div>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div style={{ position: "fixed", inset: "0", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowSubmitModal(false)}>
          <div style={{ background: "white", padding: "32px", borderRadius: "12px", width: "560px", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: "16px" }}>Submit Workplan for Review</h2>
            <p style={{ marginBottom: "16px", color: "#6B7280", fontSize: "14px" }}>Are you sure you want to submit this workplan for PM review?</p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => submitForReview(workplan)}>Submit</button>
            </div>
          </div>
        </div>
      )}

      {showApproveModal && (
        <div style={{ position: "fixed", inset: "0", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowApproveModal(false)}>
          <div style={{ background: "white", padding: "32px", borderRadius: "12px", width: "560px", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: "16px" }}>Approve Workplan</h2>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" }}>Approval Reason</label>
              <textarea
                className="input"
                rows={3}
                value={approveReason}
                onChange={(e) => setApproveReason(e.target.value)}
                placeholder="Explain why you approve this workplan..."
                style={{ marginBottom: "16px" }}
              />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setShowApproveModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => approveWorkplan(workplan)}>Approve</button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div style={{ position: "fixed", inset: "0", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowRejectModal(false)}>
          <div style={{ background: "white", padding: "32px", borderRadius: "12px", width: "560px", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: "16px" }}>Reject Workplan</h2>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" }}>Rejection Reason</label>
              <textarea
                className="input"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why you reject this workplan..."
                style={{ marginBottom: "16px" }}
              />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn btn-secondary" style={{ color: "#DC2626", borderColor: "#FECACA" }} onClick={() => rejectWorkplan(workplan)}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {showEditDraftModal && (
        <div style={{ position: "fixed", inset: "0", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowEditDraftModal(false)}>
          <div style={{ background: "white", padding: "32px", borderRadius: "12px", width: "560px", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: "16px" }}>Edit Workplan Draft</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" }}>Title</label>
                  <input
                    type="text"
                    className="input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{ marginBottom: "8px" }}
                  />
              </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" }}>Description</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Enter description..."
                      style={{ marginBottom: "16px" }}
                    />
                </div>
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setShowEditDraftModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { /* TODO: implement edit functionality */ }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: "24px" },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' },
};

export default WorkplanPage;