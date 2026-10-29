import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Loading, EmptyState } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { useToast } from "../../hooks/useToast";
import type { ChangeRequest } from "../../types";

function ChangeRequestsPage() {
  const { id } = useParams<{ id: string }>();
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ requested_change: '', reason: '', impact_scope: '', impact_timeline: '', impact_budget: '', risks: '' });
  const { toasts, showToast } = useToast();

  useEffect(() => { loadRequests(); }, []);

  async function loadRequests() {
    if (!id) return;
    const { data } = await supabase.from("change_requests").select("*").eq("project_id", id).order("created_at", { ascending: false });
    setRequests((data || []) as ChangeRequest[]);
    setLoading(false);
  }

  async function createRequest() {
    if (!id || !form.requested_change.trim()) return;
    const { data } = await supabase.from("change_requests").insert({
      project_id: id,
      requested_change: form.requested_change.trim(),
      reason: form.reason || null,
      requester_id: 'user-id',
      impact_scope: form.impact_scope || null,
      impact_timeline: form.impact_timeline || null,
      impact_budget: form.impact_budget || null,
      risks: form.risks || null,
    }).select().single();
    if (!data.error) {
      setShowModal(false);
      setForm({ requested_change: '', reason: '', impact_scope: '', impact_timeline: '', impact_budget: '', risks: '' });
      showToast("success", "Change request submitted");
      loadRequests();
    }
  }

  async function updateStatus(crId: string, status: string) {
    const { error } = await supabase.from("change_requests").update({ status, reviewed_by: 'user-id', reviewed_at: new Date().toISOString() }).eq("id", crId);
    if (!error) {
      showToast("success", `Change request ${status}`);
      loadRequests();
    }
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Change Requests</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Track changes to scope, schedule, and budget</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Request Change</button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <EmptyState title="No change requests" />
        </Card>
      ) : (
        <div style={styles.grid}>
          {requests.map((cr) => (
            <Card key={cr.id}>
              <div style={styles.crHeader}>
                <div style={{ fontWeight: 600 }}>{cr.requested_change}</div>
                <StatusBadge status={cr.status} />
              </div>
              {cr.reason && <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>Reason: {cr.reason}</p>}
              <div style={styles.impact}>
                {cr.impact_scope && <div>Scope: {cr.impact_scope}</div>}
                {cr.impact_timeline && <div>Timeline: {cr.impact_timeline}</div>}
                {cr.impact_budget && <div>Budget: {cr.impact_budget}</div>}
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                {cr.status === 'submitted' && (
                  <>
                    <button className="btn btn-sm btn-primary" onClick={() => updateStatus(cr.id, 'approved')}>Approve</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => updateStatus(cr.id, 'rejected')}>Reject</button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Change Request">
        <label style={styles.label}>Requested Change *</label>
        <textarea className="input" rows={3} value={form.requested_change} onChange={(e) => setForm({ ...form, requested_change: e.target.value })} style={{ marginBottom: '12px' }} />
        <label style={styles.label}>Reason</label>
        <textarea className="input" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={{ marginBottom: '12px' }} />
        <label style={styles.label}>Impact on Scope</label>
        <input className="input" value={form.impact_scope} onChange={(e) => setForm({ ...form, impact_scope: e.target.value })} style={{ marginBottom: '12px' }} />
        <label style={styles.label}>Impact on Timeline</label>
        <input className="input" value={form.impact_timeline} onChange={(e) => setForm({ ...form, impact_timeline: e.target.value })} style={{ marginBottom: '12px' }} />
        <label style={styles.label}>Impact on Budget</label>
        <input className="input" value={form.impact_budget} onChange={(e) => setForm({ ...form, impact_budget: e.target.value })} style={{ marginBottom: '12px' }} />
        <label style={styles.label}>Risks</label>
        <textarea className="input" rows={2} value={form.risks} onChange={(e) => setForm({ ...form, risks: e.target.value })} style={{ marginBottom: '16px' }} />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={createRequest}>Submit</button>
        </div>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' },
  crHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  impact: { fontSize: '13px', color: '#6B7280', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' },
};

export default ChangeRequestsPage;
