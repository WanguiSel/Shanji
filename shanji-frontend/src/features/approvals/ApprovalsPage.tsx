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

function ApprovalsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, showToast } = useToast();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newApprovalTitle, setNewApprovalTitle] = useState("");
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | "returned_for_correction" | "">("");
  const [comment, setComment] = useState("");
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({});

  const loadApprovals = async () => {
    if (!id) return;

    const { data } = await supabase
      .from("approvals")
      .select("*")
      .eq("project_id", id)
      .order("requested_at", { ascending: false });

    if (data?.length) {
      const itemIds = data.map((a) => a.item_id).filter(Boolean);
      const { data: tasks } = await supabase
        .from("workplan_items")
        .select("id, status")
        .in("id", itemIds);

      const statusMap: Record<string, string> = {};
      tasks?.forEach((t) => {
        statusMap[t.id] = t.status;
      });
      setTaskStatuses(statusMap);
    }

    setApprovals(data || []);
    setLoading(false);
  };

  const createApproval = async () => {
    if (!id || !newApprovalTitle.trim()) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user?.id)
      .single();

    if (!profile?.id) {
      showToast("error", "User profile not found");
      return;
    }

    const approvalData = {
      project_id: id,
      item_type: "workplan_item",
      item_id: null,
      requester_id: profile.id,
      approver_id: null,
      status: "pending",
      comments: null,
      previous_state: null,
      new_state: null,
      requested_at: new Date().toISOString(),
      decided_at: null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("approvals").insert(approvalData);

    if (!error) {
      showToast("success", "Approval request created");
      setShowCreateModal(false);
      setNewApprovalTitle("");
      loadApprovals();
    } else {
      showToast("error", "Failed to create approval");
    }
  };

  const submitDecision = async () => {
    if (!selectedApproval || !decision) return;

    const { error: updateError } = await supabase
      .from("approvals")
      .update({
        status: decision,
        decided_at: new Date().toISOString(),
        approver_id: user?.id,
        comments: comment,
      })
      .eq("id", selectedApproval.id);

    if (!updateError) {
      showToast("success", "Decision submitted");
      setSelectedApproval(null);
      setDecision("");
      setComment("");
      loadApprovals();

      if (decision === "approved") {
        await supabase
          .from("workplan_items")
          .update({ status: "approved" })
          .eq("id", selectedApproval.item_id);
      }
    } else {
      showToast("error", "Failed to submit decision");
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [id]);

  if (loading) return <Loading />;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: "24px" }}>← Back</button>
      <div style={styles.header}>
        <div>
          <h1>Approvals</h1>
          <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>Pending and completed approvals</p>
        </div>
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
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>{approval.item_type} #{approval.item_id?.slice(0, 8)}</div>
                  <div style={{ fontSize: "13px", color: "#6B7280" }}>
                    Requested: {new Date(approval.requested_at).toLocaleString()}
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
                  disabled={approval.status !== "pending" || !canApprove(approval)}
                >
                  Approve
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => { setSelectedApproval(approval); setDecision("rejected"); }}
                  disabled={approval.status !== "pending" || !canReject(approval)}
                >
                  Reject
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => { setSelectedApproval(approval); setDecision("returned_for_correction"); }}
                  disabled={approval.status !== "pending" || !canReturn(approval)}
                >
                  Return
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={!!selectedApproval} onClose={() => setSelectedApproval(null)} title={`Decision — ${selectedApproval?.item_type || ""}`}>
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

function canApprove(approval: any): boolean {
  if (!approval) return false;
  if (approval.status !== "pending") return false;
  return true;
}

function canReject(approval: any): boolean {
  if (!approval) return false;
  if (approval.status !== "pending") return false;
  return true;
}

function canReturn(approval: any): boolean {
  if (!approval) return false;
  if (approval.status !== "pending") return false;
  return true;
}

export default ApprovalsPage;
