import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { useToast } from "../../hooks/useToast";
import type { EvidenceRecord } from "../../types";

function EvidencePage() {
  const { id } = useParams<{ id: string }>();
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const { toasts, showToast } = useToast();

  useEffect(() => { loadEvidence(); }, []);

  async function loadEvidence() {
    if (!id) return;
    const { data } = await supabase.from("evidence_records").select("*").eq("project_id", id).order("created_at", { ascending: false });
    setEvidence((data || []) as EvidenceRecord[]);
    setLoading(false);
  }

  async function uploadEvidence() {
    if (!id || !uploadTitle.trim()) return;
    const { data } = await supabase.from("evidence_records").insert({
      project_id: id,
      title: uploadTitle.trim(),
      description: uploadDesc || null,
      uploader_id: 'user-id',
      evidence_type: 'photo',
      verification_status: 'pending',
    }).select().single();
    if (!data.error) {
      setShowUpload(false);
      setUploadTitle("");
      setUploadDesc("");
      showToast("success", "Evidence uploaded");
      loadEvidence();
    }
  }

  async function verifyEvidence(evId: string, status: string) {
    const { error } = await supabase.from("evidence_records").update({ verification_status: status }).eq("id", evId);
    if (!error) {
      showToast("success", `Evidence ${status}`);
      loadEvidence();
    }
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Evidence</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Photos, documents, and verification records</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>+ Upload Evidence</button>
      </div>

      {evidence.length === 0 ? (
        <Card>
          <EmptyState title="No evidence" message="Upload evidence to support task completion." />
        </Card>
      ) : (
        <div style={styles.grid}>
          {evidence.map((ev) => (
            <Card key={ev.id}>
              <div style={styles.evHeader}>
                <div style={{ fontWeight: 600 }}>{ev.title}</div>
                <span style={{
                  padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                  background: ev.verification_status === 'verified' ? '#ECFDF5' : ev.verification_status === 'rejected' ? '#FEF2F2' : '#F3F4F6',
                  color: ev.verification_status === 'verified' ? '#059669' : ev.verification_status === 'rejected' ? '#DC2626' : '#6B7280',
                }}>
                  {ev.verification_status}
                </span>
              </div>
              {ev.description && <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>{ev.description}</p>}
              <div style={styles.evMeta}>
                <span>Type: {ev.evidence_type}</span>
                <span>By: {ev.uploader_id?.slice(0, 8)}</span>
                <span>{new Date(ev.created_at).toLocaleDateString()}</span>
              </div>
              {ev.verification_status === 'pending' && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button className="btn btn-sm btn-primary" onClick={() => verifyEvidence(ev.id, 'verified')}>Verify</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => verifyEvidence(ev.id, 'rejected')}>Reject</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Evidence">
        <label style={styles.label}>Title *</label>
        <input className="input" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} style={{ marginBottom: '12px' }} />
        <label style={styles.label}>Description</label>
        <textarea className="input" rows={3} value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} style={{ marginBottom: '16px' }} />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={uploadEvidence}>Upload</button>
        </div>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  evHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  evMeta: { display: 'flex', gap: '12px', fontSize: '12px', color: '#6B7280', marginTop: '8px', flexWrap: 'wrap' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' },
};

export default EvidencePage;
