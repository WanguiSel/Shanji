import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { Risk } from "../../types";
import { Card } from "../../components/Card";
import { StatCard } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { useToast } from "../../hooks/useToast";

function RisksPage() {
  const { id } = useParams<{ id: string }>();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: '', probability: 50, impact: 50, owner_id: '', mitigation: '', contingency: '' });
  const { toasts, showToast } = useToast();

  useEffect(() => { loadRisks(); }, []);

  async function loadRisks() {
    if (!id) return;
    const { data } = await supabase.from("risks").select("*").eq("project_id", id).order("created_at", { ascending: false });
    setRisks((data || []) as Risk[]);
    setLoading(false);
  }

  async function createRisk() {
    if (!id || !form.title.trim()) return;
    const { data } = await supabase.from("risks").insert({
      project_id: id,
      risk_title: form.title.trim(),
      description: form.description || null,
      category: form.category || null,
      probability: form.probability,
      impact: form.impact,
      owner_id: form.owner_id || null,
      mitigation: form.mitigation || null,
      contingency: form.contingency || null,
    }).select().single();
    if (!data.error) {
      setShowModal(false);
      setForm({ title: '', description: '', category: '', probability: 50, impact: 50, owner_id: '', mitigation: '', contingency: '' });
      showToast("success", "Risk created");
      loadRisks();
    }
  }

  const openRisks = risks.filter((r) => r.status === 'open');
  const mitigatedRisks = risks.filter((r) => r.status === 'mitigated');
  const closedRisks = risks.filter((r) => r.status === 'closed');

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Risks</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Risk register and monitoring</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Risk</button>
      </div>

      <div style={styles.statsRow}>
        <StatCard title="Open Risks" value={openRisks.length} color="#DC2626" />
        <StatCard title="Mitigated" value={mitigatedRisks.length} color="#059669" />
        <StatCard title="Closed" value={closedRisks.length} color="#6B7280" />
      </div>

      {risks.length === 0 ? (
        <Card>
          <EmptyState title="No risks identified" message="Add your first risk to start tracking." />
        </Card>
      ) : (
        <div style={styles.grid}>
          {risks.map((risk) => (
            <Card key={risk.id}>
              <div style={styles.riskHeader}>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{risk.risk_title}</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={styles.score}>{risk.risk_score}</span>
                </div>
              </div>
              {risk.description && <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>{risk.description}</p>}
              <div style={styles.riskMeta}>
                <span>P: {risk.probability}%</span>
                <span>I: {risk.impact}%</span>
                <span>Category: {risk.category || '—'}</span>
                <span>Owner: {risk.owner_id?.slice(0, 8) || '—'}</span>
              </div>
              {risk.mitigation && <p style={{ fontSize: '12px', color: '#0D6B4E', marginTop: '8px' }}>Mitigation: {risk.mitigation}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Risk">
        <label style={styles.label}>Risk Title *</label>
        <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ marginBottom: '12px' }} />
        <label style={styles.label}>Description</label>
        <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: '12px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={styles.label}>Probability (%)</label>
            <input className="input" type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })} />
          </div>
          <div>
            <label style={styles.label}>Impact (%)</label>
            <input className="input" type="number" min="0" max="100" value={form.impact} onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })} />
          </div>
        </div>
        <label style={{ ...styles.label, marginTop: '12px' }}>Category</label>
        <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ marginBottom: '12px' }} />
        <label style={styles.label}>Mitigation</label>
        <textarea className="input" rows={2} value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} style={{ marginBottom: '12px' }} />
        <label style={styles.label}>Contingency</label>
        <textarea className="input" rows={2} value={form.contingency} onChange={(e) => setForm({ ...form, contingency: e.target.value })} style={{ marginBottom: '16px' }} />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={createRisk}>Add Risk</button>
        </div>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  riskHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
  score: { background: '#FEF2F2', color: '#DC2626', padding: '4px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '13px' },
  riskMeta: { display: 'flex', gap: '16px', fontSize: '12px', color: '#6B7280', marginTop: '8px', flexWrap: 'wrap' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' },
};

export default RisksPage;
