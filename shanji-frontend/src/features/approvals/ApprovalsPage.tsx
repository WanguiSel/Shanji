import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { Approval } from "../../types";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Loading, EmptyState } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../lib/utils";

function ApprovalsPage() {
  const { id } = useParams<{ id: string }>();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [decision, setDecision] = useState("");
  const [comment, setComment] = useState("");
  const { toasts, showToast } = useToast();

  useEffect(() => {
    loadApprovals();
  }, []);

  async function loadApprovals() {
    if (!id) return;
    const { data } = await supabase.from("approvals").select("*").eq("project_id", id).order("created_at", { ascending: false });
    setApprovals((data || []) as Approval[]);
    setLoading(false);
  }

  async function submitDecision() {
    if (!selectedApproval || !decision) return;
    const { data } = await supabase.from("approvals").update({
      status: decision,
      comments: comment || null,
      decided_at: new Date().toISOString(),
    }).eq("id", selectedApproval.id).select().single();

    if (!data.error) {
      setSelectedApproval(null);
      setDecision("");
      setComment("");
      showToast("success", `Approval ${decision}`);
      loadApprovals();
    }
  }

  if (loading) return <Loading />;

  return (
    <div>
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
                </div>
                <StatusBadge status={approval.status} />
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                <button className="btn btn-sm btn-primary" onClick={() => { setSelectedApproval(approval); setDecision("approved"); }} disabled={approval.status !== 'pending'}>
                  Approve
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => { setSelectedApproval(approval); setDecision("rejected"); }} disabled={approval.status !== 'pending'}>
                  Reject
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => { setSelectedApproval(approval); setDecision("returned_for_correction"); }} disabled={approval.status !== 'pending'}>
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

export default ApprovalsPage;
