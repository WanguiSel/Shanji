import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card, StatCard } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { useToast } from "../../hooks/useToast";
import type { Incident, Inspection, CorrectiveAction, NearMiss } from "../../types";

type HTAB = "incidents" | "inspections" | "hazards" | "actions";

function HSEQPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [tab, setTab] = useState<HTAB>("incidents");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [nearMisses, setNearMisses] = useState<NearMiss[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editId, setEditId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formSeverity, setFormSeverity] = useState("medium");
  const [formPeople, setFormPeople] = useState("");
  const [formImmediate, setFormImmediate] = useState("");
  const [formCorrective, setFormCorrective] = useState("");
  const [formStatus, setFormStatus] = useState("open");
  const [formDueDate, setFormDueDate] = useState("");
  const [formInspector, setFormInspector] = useState("");
  const [formType, setFormType] = useState("");
  const [formFindings, setFormFindings] = useState("");
  const [formCompliance, setFormCompliance] = useState("compliant");
  const [formSource, setFormSource] = useState("");
  const [formAssignedTo, setFormAssignedTo] = useState("");
  const { toasts, showToast } = useToast();

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    if (!id) return;
    setError(null);
    try {
      const [iR, inspR, hR, aR, nmR] = await Promise.all([
        supabase.from("incidents").select("*").eq("project_id", id).order("date_occurred", { ascending: false }),
        supabase.from("inspections").select("*").eq("project_id", id).order("inspection_date", { ascending: false }),
        supabase.from("risks").select("*").eq("project_id", id).eq("category", "hse").order("created_at", { ascending: false }),
        supabase.from("corrective_actions").select("*").eq("project_id", id).order("due_date", { ascending: true }),
        supabase.from("near_misses").select("*").eq("project_id", id).order("report_date", { ascending: false }),
      ]);
      setIncidents((iR.data || []) as Incident[]);
      setInspections((inspR.data || []) as Inspection[]);
      setHazards(hR.data || []);
      setActions(aR.data || []);
      setNearMisses((nmR.data || []) as NearMiss[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load HSEQ data");
    } finally {
      setLoading(false);
    }
  }

  async function logActivity(action: string, description: string, entityType: string, entityId?: string) {
    if (!id || !user?.id) return;
    await supabase.from("activity_logs").insert({
      project_id: id, actor_id: user.id, action, entity_type: entityType,
      entity_id: entityId || null, description, metadata: {},
      created_at: new Date().toISOString(),
    }).then(({ error }) => { if (error) console.error("Activity log failed:", error); });
  }

  async function createItem() {
    if (!id || !formTitle.trim()) return;
    const isIncident = tab === "incidents";
    const isInspection = tab === "inspections";

    if (isIncident) {
      const { data, error } = await supabase.from("incidents").insert({
        project_id: id,
        incident_type: "safety",
        title: formTitle.trim(),
        description: formDesc || null,
        severity: formSeverity,
        reported_by: user?.id,
        date_occurred: new Date().toISOString().split("T")[0],
        location: formLocation || null,
        people_involved: formPeople || null,
        immediate_actions: formImmediate || null,
        investigation: null,
        corrective_actions: formCorrective || null,
        status: formStatus,
      }).select().single();
      if (!error) {
        showToast("success", "Incident created");
        await logActivity("incident_created", `Incident "${formTitle.trim()}" created`, "incident", data.id);
      } else {
        showToast("error", "Failed to create incident");
      }
    } else if (isInspection) {
      const { data, error } = await supabase.from("inspections").insert({
        project_id: id,
        inspection_type: formType || "general",
        title: formTitle.trim(),
        description: formDesc || null,
        inspector_id: formInspector || user?.id || "",
        inspection_date: new Date().toISOString(),
        location: formLocation || null,
        findings: formFindings || null,
        compliance_status: formCompliance,
        status: "open",
      }).select().single();
      if (!error) {
        showToast("success", "Inspection created");
        await logActivity("inspection_created", `Inspection "${formTitle.trim()}" created`, "inspection", data.id);
      } else {
        showToast("error", "Failed to create inspection");
      }
    } else if (tab === "actions") {
      const sourceType = formSource === "incident" ? "incident" : formSource === "inspection" ? "inspection" : "risk";
      const sourceId = formSource === "incident" ? (incidents[0]?.id || "") : formSource === "inspection" ? (inspections[0]?.id || "") : (hazards[0]?.id || "");
      const { data, error } = await supabase.from("corrective_actions").insert({
        project_id: id,
        incident_id: sourceType === "incident" ? sourceId : null,
        inspection_id: sourceType === "inspection" ? sourceId : null,
        risk_id: sourceType === "risk" ? sourceId : null,
        title: formTitle.trim(),
        description: formDesc || null,
        assigned_to: formAssignedTo || null,
        due_date: formDueDate || null,
        status: "open",
      }).select().single();
      if (!error) {
        showToast("success", "Corrective action created");
        await logActivity("corrective_action_created", `Corrective action "${formTitle.trim()}" created`, "corrective_action", data.id);
      } else {
        showToast("error", "Failed to create corrective action");
      }
    }
    setShowModal(false);
    resetForm();
    loadAll();
  }

  async function updateStatus(itemId: string, status: string, table: string) {
    const { error } = await supabase.from(table).update({ status }).eq("id", itemId);
    if (!error) {
      showToast("success", `Status updated to ${status}`);
      await logActivity(`${table}_updated`, `Status changed to ${status}`, table, itemId);
      loadAll();
    } else {
      showToast("error", "Failed to update status");
    }
  }

  async function updateNearMissStatus(itemId: string, status: string) {
    const { error } = await supabase.from("near_misses").update({ status }).eq("id", itemId);
    if (!error) {
      showToast("success", `Near miss ${status}`);
      await logActivity("near_miss_updated", `Near miss status changed to ${status}`, "near_miss", itemId);
      loadAll();
    } else {
      showToast("error", "Failed to update near miss");
    }
  }

  function resetForm() {
    setFormTitle(""); setFormDesc(""); setFormLocation(""); setFormSeverity("medium");
    setFormPeople(""); setFormImmediate(""); setFormCorrective(""); setFormStatus("open");
    setFormDueDate(""); setFormInspector(""); setFormType(""); setFormFindings("");
    setFormCompliance("compliant"); setFormSource(""); setFormAssignedTo("");
  }

  function openCreate() {
    setModalMode("create");
    setModalTitle(tab === "incidents" ? "New Incident" : tab === "inspections" ? "New Inspection" : tab === "hazards" ? "New Hazard" : "New Corrective Action");
    resetForm();
    setShowModal(true);
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>HSEQ / OHS</h1>
          <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>Health, safety, environment and occupational health management</p>
        </div>
        {hasRole("project_manager") || hasRole("ohs") ? (
          <button className="btn btn-primary" onClick={openCreate}>+ New {tab === "incidents" ? "Incident" : tab === "inspections" ? "Inspection" : tab === "hazards" ? "Hazard" : "Corrective Action"}</button>
        ) : null}
      </div>

      {error && (
        <Card>
          <EmptyState title="Error" message={error} />
        </Card>
      )}

      <div style={{ marginTop: "24px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <StatCard title="Open Incidents" value={incidents.filter((i) => i.status === "open" || i.status === "investigating").length} color="#DC2626" />
        <StatCard title="High/Critical Risks" value={hazards.filter((h: any) => h.risk_score >= 17 || h.risk_score >= 10).length} color="#EF4444" />
        <StatCard title="Overdue Actions" value={actions.filter((a) => a.due_date && new Date(a.due_date) < new Date()).length} color="#D97706" />
        <StatCard title="Upcoming Inspections" value={inspections.filter((i) => new Date(i.inspection_date) >= new Date()).length} color="#0D3B2E" />
        <StatCard title="Non-Compliant" value={inspections.filter((i) => i.compliance_status === "non_compliant").length} color="#DC2626" />
        <StatCard title="Open Near Misses" value={nearMisses.filter((n) => n.status === "open").length} color="#7C3AED" />
      </div>

      {/* Near Misses Table */}
      {nearMisses.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Near Misses</h2>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Report Date</th>
                  <th style={styles.th}>Location</th>
                  <th style={styles.th}>Risk Level</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {nearMisses.map((nm) => (
                  <tr key={nm.id} style={styles.tr}>
                    <td style={styles.td}>{new Date(nm.report_date).toLocaleDateString()}</td>
                    <td style={styles.td}>{nm.location || "—"}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                        background: nm.risk_level === "critical" ? "#FEF2F2" : nm.risk_level === "high" ? "#FEF3C7" : "#F3F4F6",
                        color: nm.risk_level === "critical" ? "#DC2626" : nm.risk_level === "high" ? "#D97706" : "#6B7280",
                      }}>{nm.risk_level}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                        background: nm.status === "closed" ? "#ECFDF5" : nm.status === "mitigated" ? "#ECFDF5" : "#F3F4F6",
                        color: nm.status === "closed" ? "#059669" : "#D97706",
                      }}>{nm.status}</span>
                    </td>
                    <td style={styles.td}>
                      {(hasRole("project_manager") || hasRole("ohs")) && nm.status === "open" && (
                        <button className="btn btn-sm btn-secondary" onClick={() => updateNearMissStatus(nm.id, "mitigated")}>Mitigate</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={styles.tabs}>
        {[
          { key: "incidents" as HTAB, label: "Incidents", count: incidents.length },
          { key: "inspections" as HTAB, label: "Inspections", count: inspections.length },
          { key: "hazards" as HTAB, label: "Hazards", count: hazards.length },
          { key: "actions" as HTAB, label: "Corrective Actions", count: actions.length },
        ].map((t) => (
          <button
            key={t.key}
            className="btn btn-sm"
            style={{
              ...styles.tab,
              ...(tab === t.key ? styles.tabActive : {}),
            }}
            onClick={() => setTab(t.key)}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === "incidents" && (
        incidents.length === 0 ? (
          <Card><EmptyState title="No incidents" message="Report safety incidents to track and manage them." /></Card>
        ) : (
          <div style={styles.grid}>
            {incidents.map((inc) => (
              <Card key={inc.id}>
                <div style={styles.cardHeader}>
                  <div style={{ fontWeight: 600 }}>{inc.title}</div>
                  <span style={{
                    padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                    background: inc.severity === "critical" ? "#FEF2F2" : inc.severity === "high" ? "#FEF3C7" : "#F3F4F6",
                    color: inc.severity === "critical" ? "#DC2626" : inc.severity === "high" ? "#D97706" : "#6B7280",
                  }}>{inc.severity}</span>
                </div>
                <div style={styles.meta}>
                  <span>Status: <strong>{inc.status}</strong></span>
                  <span>{inc.date_occurred}</span>
                  {inc.location && <span>📍 {inc.location}</span>}
                </div>
                {inc.description && <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "8px" }}>{inc.description}</p>}
                <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {inc.status === "open" && (
                    <button className="btn btn-sm btn-secondary" onClick={() => updateStatus(inc.id, "investigating", "incidents")}>Start Investigation</button>
                  )}
                  {inc.status === "investigating" && (
                    <>
                      <button className="btn btn-sm btn-secondary" onClick={() => updateStatus(inc.id, "action_required", "incidents")}>Action Required</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => updateStatus(inc.id, "closed", "incidents")}>Close</button>
                    </>
                  )}
                  {inc.status === "action_required" && (
                    <button className="btn btn-sm btn-secondary" onClick={() => updateStatus(inc.id, "closed", "incidents")}>Close</button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "inspections" && (
        inspections.length === 0 ? (
          <Card><EmptyState title="No inspections" message="Create inspections to track safety compliance." /></Card>
        ) : (
          <div style={styles.grid}>
            {inspections.map((insp) => (
              <Card key={insp.id}>
                <div style={styles.cardHeader}>
                  <div style={{ fontWeight: 600 }}>{insp.title}</div>
                  <span style={{
                    padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                    background: insp.compliance_status === "compliant" ? "#ECFDF5" : insp.compliance_status === "non_compliant" ? "#FEF2F2" : "#FEF3C7",
                    color: insp.compliance_status === "compliant" ? "#059669" : insp.compliance_status === "non_compliant" ? "#DC2626" : "#D97706",
                  }}>{insp.compliance_status}</span>
                </div>
                <div style={styles.meta}>
                  <span>Status: <strong>{insp.status}</strong></span>
                  <span>{new Date(insp.inspection_date).toLocaleDateString()}</span>
                </div>
                {insp.findings && <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "8px" }}>{insp.findings}</p>}
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "hazards" && (
        hazards.length === 0 ? (
          <Card><EmptyState title="No hazards" message="Record hazards to manage site risks." /></Card>
        ) : (
          <div style={styles.grid}>
            {hazards.map((h) => (
              <Card key={h.id}>
                <div style={styles.cardHeader}>
                  <div style={{ fontWeight: 600 }}>{h.risk_title || h.title}</div>
                  <span style={{
                    padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                    background: h.risk_score >= 17 ? "#FEF2F2" : h.risk_score >= 10 ? "#FEF3C7" : "#F3F4F6",
                    color: h.risk_score >= 17 ? "#DC2626" : h.risk_score >= 10 ? "#D97706" : "#059669",
                  }}>{h.risk_score} risk</span>
                </div>
                <div style={styles.meta}>
                  <span>Category: HSE</span>
                  <span>{h.category}</span>
                </div>
                {h.risk_description && <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "8px" }}>{h.risk_description}</p>}
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "actions" && (
        actions.length === 0 ? (
          <Card><EmptyState title="No corrective actions" message="Track corrective actions from incidents and inspections." /></Card>
        ) : (
          <div style={styles.grid}>
            {actions.map((a) => (
              <Card key={a.id}>
                <div style={styles.cardHeader}>
                  <div style={{ fontWeight: 600 }}>{a.title}</div>
                  <span style={{
                    padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                    background: a.status === "completed" ? "#ECFDF5" : a.status === "in_progress" ? "#FEF3C7" : "#F3F4F6",
                    color: a.status === "completed" ? "#059669" : a.status === "in_progress" ? "#D97706" : "#6B7280",
                  }}>{a.status}</span>
                </div>
                <div style={styles.meta}>
                  {a.due_date && <span>Due: {a.due_date}</span>}
                  {a.assigned_to && <span>Owner: {a.assigned_to.slice(0, 8)}</span>}
                </div>
                {a.description && <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "8px" }}>{a.description}</p>}
                {a.status !== "completed" && (
                  <div style={{ marginTop: "8px" }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => updateStatus(a.id, "completed", "corrective_actions")}>Mark Complete</button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={modalTitle}>
        <label style={styles.label}>Title *</label>
        <input className="input" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Description</label>
        <textarea className="input" rows={3} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} style={{ marginBottom: "12px" }} />
        {tab === "incidents" && (
          <>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Severity</label>
                <select className="input" value={formSeverity} onChange={(e) => setFormSeverity(e.target.value)} style={{ marginBottom: "12px" }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Location</label>
                <input className="input" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} style={{ marginBottom: "12px" }} />
              </div>
            </div>
            <label style={styles.label}>People Involved</label>
            <input className="input" value={formPeople} onChange={(e) => setFormPeople(e.target.value)} style={{ marginBottom: "12px" }} />
            <label style={styles.label}>Immediate Actions</label>
            <textarea className="input" rows={2} value={formImmediate} onChange={(e) => setFormImmediate(e.target.value)} style={{ marginBottom: "12px" }} />
          </>
        )}
        {tab === "inspections" && (
          <>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Type</label>
                <input className="input" value={formType} onChange={(e) => setFormType(e.target.value)} placeholder="Safety, Fire, Electrical..." style={{ marginBottom: "12px" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Inspector</label>
                <input className="input" value={formInspector} onChange={(e) => setFormInspector(e.target.value)} style={{ marginBottom: "12px" }} />
              </div>
            </div>
            <label style={styles.label}>Findings</label>
            <textarea className="input" rows={2} value={formFindings} onChange={(e) => setFormFindings(e.target.value)} style={{ marginBottom: "12px" }} />
          </>
        )}
        {tab === "actions" && (
          <>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Source</label>
                <select className="input" value={formSource} onChange={(e) => setFormSource(e.target.value)} style={{ marginBottom: "12px" }}>
                  <option value="incident">Incident</option>
                  <option value="inspection">Inspection</option>
                  <option value="risk">Hazard</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Assigned To</label>
                <input className="input" value={formAssignedTo} onChange={(e) => setFormAssignedTo(e.target.value)} style={{ marginBottom: "12px" }} />
              </div>
            </div>
            <label style={styles.label}>Due Date</label>
            <input type="date" className="input" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} style={{ marginBottom: "12px" }} />
          </>
        )}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={createItem}>Save</button>
        </div>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" },
  tab: { padding: "8px 16px", borderRadius: "6px", border: "1px solid #D1D5DB", background: "white", cursor: "pointer", fontSize: "13px", fontWeight: 500 },
  tabActive: { background: "#0D3B2E", color: "white", borderColor: "#0D3B2E" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" },
  meta: { display: "flex", gap: "12px", fontSize: "12px", color: "#6B7280", flexWrap: "wrap" as const },
  label: { fontSize: "13px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" },
  tableWrap: { background: "white", borderRadius: "8px", border: "1px solid #E5E7EB", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  th: { padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" },
  td: { padding: "12px 16px", borderBottom: "1px solid #F3F4F6" },
  tr: { cursor: "pointer" },
};

export default HSEQPage;
