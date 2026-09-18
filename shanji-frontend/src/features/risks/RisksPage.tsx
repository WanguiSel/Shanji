import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import type { Risk, ActivityLog } from "../../types";
import { Card } from "../../components/Card";
import { StatCard } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { useToast } from "../../hooks/useToast";
import { getRiskLevel } from "../../types";

function RisksPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    probability: 3,
    impact: 3,
    owner_id: "",
    mitigation: "",
    contingency: "",
    due_date: "",
  });
  const { toasts, showToast } = useToast();

  useEffect(() => { loadRisks(); }, []);

  async function loadRisks() {
    if (!id) return;
    try {
      const { data, error } = await supabase.from("risks").select("*").eq("project_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      setRisks((data || []) as Risk[]);
    } catch (e) {
      setError("Failed to load risks");
    } finally {
      setLoading(false);
    }
  }

  async function logActivity(action: string, description: string, entityType: string, entityId?: string) {
    if (!id || !user?.id) return;
    await supabase.from("activity_logs").insert({
      project_id: id,
      actor_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      description,
      metadata: {},
    }).then(({ error }) => {
      if (error) console.error("Activity log failed:", error);
    });
  }

  async function createRisk() {
    if (!id || !form.title.trim()) return;
    const { data, error } = await supabase.from("risks").insert({
      project_id: id,
      risk_title: form.title.trim(),
      description: form.description || null,
      category: form.category || null,
      probability: form.probability,
      impact: form.impact,
      risk_score: form.probability * form.impact,
      owner_id: form.owner_id || null,
      mitigation: form.mitigation || null,
      contingency: form.contingency || null,
      due_date: form.due_date || null,
      status: "open",
      created_by: user?.id || null,
    }).select().single();
    if (error) {
      showToast("error", "Failed to create risk");
      return;
    }
    setShowModal(false);
    setForm({ title: "", description: "", category: "", probability: 3, impact: 3, owner_id: "", mitigation: "", contingency: "", due_date: "" });
    showToast("success", "Risk created");
    await logActivity("create_risk", `Risk "${form.title.trim()}" created`, "risk", data.id);
    loadRisks();
  }

  const openRisks = risks.filter((r) => r.status === "open");
  const mitigatedRisks = risks.filter((r) => r.status === "mitigated");
  const closedRisks = risks.filter((r) => r.status === "closed");

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Risks</h1>
          <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>Risk register and monitoring</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Risk</button>
      </div>

      {error && (
        <Card>
          <EmptyState title="Error" message={error} />
        </Card>
      )}

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
          {risks.map((risk) => {
            const level = getRiskLevel(risk.risk_score);
            const levelColor = level === "Low" ? "#059669" : level === "Medium" ? "#F59E0B" : level === "High" ? "#DC2626" : "#991B1B";
            return (
              <Card key={risk.id}>
                <div style={styles.riskHeader}>
                  <div style={{ fontWeight: 600, fontSize: "15px" }}>{risk.risk_title}</div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: `${levelColor}15`, color: levelColor, border: `1px solid ${levelColor}40` }}>
                      {level}
                    </span>
                    <span style={{ background: "#FEF2F2", color: "#DC2626", padding: "4px 8px", borderRadius: "4px", fontWeight: 700, fontSize: "13px" }}>
                      {risk.risk_score}
                    </span>
                  </div>
                </div>
                {risk.description && <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "8px" }}>{risk.description}</p>}
                <div style={styles.riskMeta}>
                  <span>P: {risk.probability}</span>
                  <span>I: {risk.impact}</span>
                  <span>Category: {risk.category || "—"}</span>
                  <span>Owner: {risk.owner_id?.slice(0, 8) || "—"}</span>
                </div>
                {risk.mitigation && <p style={{ fontSize: "12px", color: "#0D6B4E", marginTop: "8px" }}>Mitigation: {risk.mitigation}</p>}
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Risk">
        <label style={styles.label}>Risk Title *</label>
        <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Description</label>
        <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: "12px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={styles.label}>Probability (1-5)</label>
            <input className="input" type="number" min="1" max="5" value={form.probability} onChange={(e) => setForm({ ...form, probability: Math.max(1, Math.min(5, Number(e.target.value) || 1)) })} />
          </div>
          <div>
            <label style={styles.label}>Impact (1-5)</label>
            <input className="input" type="number" min="1" max="5" value={form.impact} onChange={(e) => setForm({ ...form, impact: Math.max(1, Math.min(5, Number(e.target.value) || 1)) })} />
          </div>
        </div>
        <label style={{ ...styles.label, marginTop: "12px" }}>Category</label>
        <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Mitigation</label>
        <textarea className="input" rows={2} value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Contingency</label>
        <textarea className="input" rows={2} value={form.contingency} onChange={(e) => setForm({ ...form, contingency: e.target.value })} style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Due Date</label>
        <input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={{ marginBottom: "16px" }} />
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={createRisk}>Add Risk</button>
        </div>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" },
  riskHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" },
  riskMeta: { display: "flex", gap: "16px", fontSize: "12px", color: "#6B7280", marginTop: "8px", flexWrap: "wrap" },
  label: { fontSize: "13px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" },
};

export default RisksPage;
