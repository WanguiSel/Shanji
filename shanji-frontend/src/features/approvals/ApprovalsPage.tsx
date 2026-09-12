import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import type { Approval } from "../../types";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Loading, EmptyState } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../lib/utils";

function ApprovalsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, showToast } = useToast();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [decision, setDecision] = useState("");
  const [comment, setComment] = useState("");
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({});

  const loadApprovals = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("approvals")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });
    setApprovals((data || []) as Approval[]);
    setLoading(false);

    if (data?.length) {
      const statusUpdates: Record<string, string> = {};
      for (const approval of data) {
        if (approval.item_type === "workplan_item" && approval.item_id) {
          const { data: taskData } = await supabase
            .from("workplan_items")
            .select("status")
            .eq("id", approval.item_id)
            .single();
          if (taskData?.status) {
            statusUpdates[approval.item_id] = taskData.status;
          }
        }
      }
      if (Object.keys(statusUpdates).length > 0) {
        setTaskStatuses(statusUpdates);
      }
    }
  };

  const submitDecision = async () => {
    if (!selectedApproval || !decision) return;

    const updates: Partial<Approval> = {
      status: decision,
      comments: comment || null,
      decided_at: new Date().toISOString(),
    };

    if (decision === "approved") {
      updates.decision_type = "approved";
      updates.decision_reason = "task_approved";
    } else if (decision === "rejected") {
      updates.decision_type = "rejected";
      updates.decision_reason = "task_rejected";
    } else if (decision === "returned_for_correction") {
      updates.decision_type = "returned";
      updates.decision_reason = "requires_correction";
    }

    const { data, error } = await supabase
      .from("approvals")
      .update(updates)
      .eq("id", selectedApproval.id)
      .select()
      .single();

    if (!error && data) {
      if (decision === "approved" && selectedApproval.item_type === "workplan_item" && selectedApproval.item_id) {
        await supabase
          .from("workplan_items")
          .update({ status: "approved", progress: 100 })
          .eq("id", selectedApproval.item_id);

        if (selectedApproval.project_id) {
          const { data: projectTasks } = await supabase
            .from("workplan_items")
            .select("id, responsible_user_id")
            .eq("project_id", selectedApproval.project_id);

          for (const task of projectTasks || []) {
            if (task.id !== selectedApproval.item_id) {
              await supabase
                .from("approvals")
                .insert({
                  project_id: selectedApproval.project_id,
                  item_type: "workplan_item",
                  item_id: task.id,
                  requested_by: selectedApproval.requested_by,
                  requested_at: new Date().toISOString(),
                  status: "pending",
                  title: `Dependency check for task ${task.id}`,
                  description: `Task ${task.id} may be released after approval of its dependencies`,
                });
            }
          }
        }
      }

      setSelectedApproval(null);
      setDecision("");
      setComment("");
      showToast("success", `Approval ${decision}`);
      loadApprovals();
    } else {
      showToast("error", "Failed to submit decision");
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '24px' }}>← Back</button>
      <div style={styles.header}>
        <div>
          <h1>Approvals</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Pending and completed approvals</p>
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
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{approval.item_type} #{approval.item_id?.slice(0, 8)}</div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>
                    Requested: {formatDateTime(approval.requested_at)}
                  </div>
                  {approval.status === 'pending' && taskStatuses[approval.item_id || ''] && (
                    <div style={{ fontSize: '12px', color: '#F59E0B', marginTop: '4px' }}>
                      Related task status: {taskStatuses[approval.item_id]}
                    </div>
                  )}
                </div>
                <StatusBadge status={approval.status} />
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => { setSelectedApproval(approval); setDecision("approved"); }}
                  disabled={approval.status !== 'pending' || !canApprove(approval)}
                >
                  Approve
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => { setSelectedApproval(approval); setDecision("rejected"); }}
                  disabled={approval.status !== 'pending' || !canReject(approval)}
                >
                  Reject
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => { setSelectedApproval(approval); setDecision("returned_for_correction"); }}
                  disabled={approval.status !== 'pending' || !canReturn(approval)}
                >
                  Return
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={!!selectedApproval} onClose={() => setSelectedApproval(null)} title={`Decision — ${selectedApproval?.item_type || ''}`}>
        {selectedApproval && (
          <div>
            <label style={styles.label}>Comments</label>
            <textarea
              className="input"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your decision comments..."
              style={{ marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
  header: { marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' },
};

function canApprove(approval: Approval): boolean {
  if (!approval) return false;
  if (approval.status !== 'pending') return false;
  return true;
}

function canReject(approval: Approval): boolean {
  if (!approval) return false;
  if (approval.status !== 'pending') return false;
  return true;
}

function canReturn(approval: Approval): boolean {
  if (!approval) return false;
  if (approval.status !== 'pending') return false;
  return true;
}

export default ApprovalsPage;
