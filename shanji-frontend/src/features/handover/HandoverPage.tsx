import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Loading, EmptyState } from "../../components/Loading";
import { useToast } from "../../hooks/useToast";
import type { HandoverRecord } from "../../types";

function HandoverPage() {
  const { id } = useParams<{ id: string }>();
  const [handover, setHandover] = useState<HandoverRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const { toasts, showToast } = useToast();

  useEffect(() => { loadHandover(); }, []);

  async function loadHandover() {
    if (!id) return;
    const { data } = await supabase.from("handover_records").select("*").eq("project_id", id).single();
    setHandover((data as HandoverRecord) || null);
    setLoading(false);
  }

  async function createHandover() {
    if (!id) return;
    const { data } = await supabase.from("handover_records").upsert({
      project_id: id,
      status: 'preparation',
      prepared_by: 'user-id',
    }).select().single();
    if (!data.error) {
      setHandover(data as HandoverRecord);
      showToast("success", "Handover started");
    }
  }

  async function advanceHandover() {
    if (!handover || checking) return;
    const statusFlow: Record<string, string> = {
      preparation: 'internal_review',
      internal_review: 'corrections',
      corrections: 'submitted',
      submitted: 'approved',
      approved: 'completed',
    };
    const next = statusFlow[handover.status];
    if (!next) return;
    setChecking(true);
    const { data } = await supabase.from("handover_records").update({ status: next, submitted_at: new Date().toISOString() }).eq("project_id", id).select().single();
    setHandover(data as HandoverRecord);
    setChecking(false);
    showToast("success", `Handover advanced to ${next}`);
  }

  async function runChecks() {
    setChecking(true);
    // Check closure items
    const { data: items } = await supabase.from("closure_checklist").select("*").eq("project_id", id).eq("required", true).eq("status", "pending");
    const incomplete = (items || []).filter((i) => i.status === 'pending');
    if (incomplete.length > 0) {
      showToast("warning", `${incomplete.length} closure items still pending`);
    } else {
      showToast("success", "All closure requirements met!");
    }
    setChecking(false);
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Handover</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Formal handover workflow</p>
        </div>
        {!handover && <button className="btn btn-primary" onClick={createHandover}>Start Handover</button>}
      </div>

      {!handover ? (
        <Card>
          <EmptyState title="Handover not started" message="Complete all project requirements before starting handover." />
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: '24px' }}>
            <div style={styles.handoverHeader}>
              <div>
                <h2 style={{ fontSize: '18px' }}>Handover Status</h2>
                <StatusBadge status={handover.status.replace(/_/g, ' ')} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={runChecks} disabled={checking}>Run Checks</button>
                <button className="btn btn-primary" onClick={advanceHandover} disabled={checking}>
                  {checking ? 'Processing...' : 'Advance →'}
                </button>
              </div>
            </div>
            <div style={styles.infoGrid}>
              <InfoItem label="Prepared By" value={handover.prepared_by?.slice(0, 8) || '—'} />
              <InfoItem label="Submitted" value={handover.submitted_at ? new Date(handover.submitted_at).toLocaleDateString() : '—'} />
              <InfoItem label="Reviewed By" value={handover.reviewed_by?.slice(0, 8) || '—'} />
              <InfoItem label="Client Acceptance" value={handover.client_acceptance ? 'Yes' : 'Pending'} />
            </div>
            {handover.review_comments && (
              <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '12px' }}>Review Comments: {handover.review_comments}</p>
            )}
          </Card>

          <Card>
            <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Handover Checklist</h2>
            <p style={{ color: '#6B7280', fontSize: '14px' }}>Complete all items before final submission.</p>
          </Card>
        </>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  handoverHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px' },
};

export default HandoverPage;
