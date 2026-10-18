import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { Loading, EmptyState } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { getTaskTransitionMatrix } from "../../lib/utils";
import { logProjectActivity } from "../../lib/activityLog";

function ApprovalsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toasts, showToast } = useToast();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newApprovalTitle, setNewApprovalTitle] = useState("");
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | "returned_for_correction" | "">("");
  const [comment, setComment] = useState("");
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({});

  const loadApprovals = async () => {
    if (!id) return;
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("approvals")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;

      if (data?.length) {
        const itemIds = data.map((a: any) => a.item_id).filter(Boolean);
        if (itemIds.length) {
          const { data: tasks } = await supabase
            .from("workplan_items")
            .select("id, status")
            .in("id", itemIds);

          const statusMap: Record<string, string> = {};
          tasks?.forEach((t: any) => {
            statusMap[t.id] = t.status;
          });
          setTaskStatuses(statusMap);
        }
      }

      setApprovals(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  };

  const createApproval = async () => {
    if (!id || !newApprovalTitle.trim() || !user?.id) return;

    const rich = await supabase.from("approvals").insert({
      project_id: id,
      item_type: "workplan_item",
      item_id: null,
      requester_id: user.id,
      approver_id: null,
      status: "pending",
      comments: newApprovalTitle.trim(),
      requested_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    let insertError = rich.error;
    if (insertError) {
      // Live schema: approvals stores the requester in requested_by.
      const fallback = await supabase.from("approvals").insert({
        project_id: id,
        status: "pending",
        requested_by: user.id,
        created_at: new Date().toISOString(),
      });
      insertError = fallback.error;
    }

    if (!insertError) {
      await logProjectActivity(id, user?.id, "approval_requested", newApprovalTitle.trim(), "approval", "");
      showToast("success", "Approval request created");
      setShowCreateModal(false);
      setNewApprovalTitle("");
      loadApprovals();
    } else {
      showToast("error", insertError.message || "Failed to create approval");
    }
  };

  const submitDecision = async () => {
    if (!selectedApproval || !decision) return;

    const richUpdate = await supabase
      .from("approvals")
      .update({
        status: decision,
        decided_at: new Date().toISOString(),
        approver_id: user?.id,
        comments: comment,
      })
      .eq("id", selectedApproval.id);

    let updateError = richUpdate.error;
    if (updateError) {
      const liveUpdate = await supabase
        .from("approvals")
        .update({
          status: decision,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", selectedApproval.id);
      updateError = liveUpdate.error;
    }

    if (!updateError) {
      await logProjectActivity(
        id || "",
        user?.id,
        decision === "approved" ? "approval_approved" : decision === "rejected" ? "approval_rejected" : "approval_returned",
        `Approval ${decision}${comment ? `: ${comment}` : ""}`,
        "approval",
        selectedApproval.id,
      );

      showToast("success", "Decision submitted");
      setSelectedApproval(null);
      setDecision("");
      setComment("");
      loadApprovals();

      if (decision === "approved" && selectedApproval.item_id) {
        await supabase
          .from("workplan_items")
          .update({ status: "approved" })
          .eq("id", selectedApproval.item_id);
      }
    } else {
      showToast("error", updateError.message || "Failed to submit decision");
    }
  };

  useEffect(() => {
    setError(null);
    loadApprovals();
  }, [id]);

  if (loading) return <Loading />;
  if (error) return (
    <Card>
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ fontSize: '16px', fontWeight: 500, color: '#DC2626', marginBottom: '12px' }}>Error loading approvals</p>
        <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>{error}</p>
        <button className="btn btn-primary" onClick={loadApprovals}>Retry</button>
      </div>
    </Card>
  );

  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: "24px" }}>← Back</button>
      <div style={styles.header}>
        <div>
          <h1>Approvals</h1>
          <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>Pending and completed approvals</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ New Approval Request</button>
      </div>

      {approvals.length === 0 ? (
        <Card>
          <EmptyState title="No approvals" message="No approval requests found." />
        </Card>
      ) : (
        <div style={styles.grid}>
          {approvals.map((approval) => (
            <Card key={approval.id}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>{approval.item_type || approval.type || "Approval"} {approval.item_id ? `#${String(approval.item_id).slice(0, 8)}` : ""}</div>
                  <div style={{ fontSize: "13px", color: "#6B7280" }}>
                    Requested: {approval.requested_at || approval.created_at ? new Date(approval.requested_at || approval.created_at).toLocaleString() : "—"}
                  </div>
                  {approval.status === "pending" && taskStatuses[approval.item_id || ""] && (
                    <div style={{ fontSize: "12px", color: "#F59E0B", marginTop: "4px" }}>
                      Related task status: {taskStatuses[approval.item_id]}
                    </div>
                  )}
                </div>
                <StatusBadge status={approval.status} />
              </div>
              <div style={{ marginTop: "12px", display: "flex", gap: "12px" }}>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => { setSelectedApproval(approval); setDecision("approved"); }}
                  disabled={approval.status !== "pending" || !canApprove(approval, user?.role)}
                >
                  Approve
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => { setSelectedApproval(approval); setDecision("rejected"); }}
                  disabled={approval.status !== "pending" || !canReject(approval, user?.role)}
                >
                  Reject
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => { setSelectedApproval(approval); setDecision("returned_for_correction"); }}
                  disabled={approval.status !== "pending" || !canReturn(approval, user?.role)}
                >
                  Return
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Approval Request">
        <label style={styles.label}>Approval subject</label>
        <input
          className="input"
          value={newApprovalTitle}
          onChange={(e) => setNewApprovalTitle(e.target.value)}
          placeholder="What needs approval?"
          style={{ marginBottom: "16px" }}
        />
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={createApproval}>Create Request</button>
        </div>
      </Modal>

      <Modal isOpen={!!selectedApproval} onClose={() => setSelectedApproval(null)} title={`Decision — ${selectedApproval?.item_type || "Approval"}`}>
        {selectedApproval && (
          <div>
            <label style={styles.label}>Comments</label>
            <textarea
              className="input"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your decision comments..."
              style={{ marginBottom: "16px" }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setSelectedApproval(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitDecision}>Submit Decision</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: "24px" },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' },
};

function canApprove(approval: any, userRole?: string): boolean {
  if (!approval) return false;
  if (approval.status !== "pending") return false;
  return userRole === "project_manager" || userRole === "admin";
}

function canReject(approval: any, userRole?: string): boolean {
  if (!approval) return false;
  if (approval.status !== "pending") return false;
  return userRole === "project_manager" || userRole === "admin";
}

function canReturn(approval: any, userRole?: string): boolean {
  if (!approval) return false;
  if (approval.status !== "pending") return false;
  return userRole === "project_manager" || userRole === "admin";
}

export default ApprovalsPage;
