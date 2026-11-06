import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { useToast } from "../../hooks/useToast";

function MEPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [indicators, setIndicators] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [indName, setIndName] = useState("");
  const [indUnit, setIndUnit] = useState("");
  const [indTarget, setIndTarget] = useState("");
  const [indCategoryId, setIndCategoryId] = useState("");
  const [measIndicatorId, setMeasIndicatorId] = useState("");
  const [measStart, setMeasStart] = useState("");
  const [measEnd, setMeasEnd] = useState("");
  const [measValue, setMeasValue] = useState("");

  const orgId = (profile as any)?.organization_id || (user as any)?.organization_id;

  async function load() {
    if (!id) return;
    setError(null);
    try {
      const { data: indData, error: indErr } = await supabase.from("indicators").select("*").eq("project_id", id).order("created_at", { ascending: false });
      if (indErr) throw indErr;
      setIndicators(indData || []);
      if (orgId) {
        const { data: catData } = await supabase.from("indicator_categories").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
        setCategories(catData || []);
      }
      const { data: measData } = await supabase.from("indicator_measurements").select("*").eq("project_id", id).order("created_at", { ascending: false });
      setMeasurements(measData || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load M&E data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id, orgId]);

  async function createCategory() {
    if (!orgId || !catName.trim()) return;
    const { error } = await supabase.from("indicator_categories").insert({ organization_id: orgId, name: catName.trim() });
    if (error) { showToast("error", error.message); return; }
    setCatName("");
    showToast("success", "Category created");
    load();
  }

  async function createIndicator() {
    if (!id || !indName.trim()) return;
    const { error } = await supabase.from("indicators").insert({
      project_id: id,
      indicator_name: indName.trim(),
      unit: indUnit || null,
      target_value: indTarget ? Number(indTarget) : null,
      category_id: indCategoryId || null,
      frequency: "monthly",
    });
    if (error) { showToast("error", error.message); return; }
    setIndName(""); setIndUnit(""); setIndTarget(""); setIndCategoryId("");
    showToast("success", "Indicator created");
    load();
  }

  async function createMeasurement() {
    if (!id || !measIndicatorId || !measStart || !measEnd || !measValue || !user?.id) return;
    const { error } = await supabase.from("indicator_measurements").insert({
      indicator_id: measIndicatorId,
      project_id: id,
      reporting_period_start: measStart,
      reporting_period_end: measEnd,
      actual_value: Number(measValue),
      submitted_by: user.id,
    });
    if (error) { showToast("error", error.message); return; }
    setMeasIndicatorId(""); setMeasStart(""); setMeasEnd(""); setMeasValue("");
    showToast("success", "Measurement submitted");
    load();
  }

  async function verifyMeasurement(mId: string, status: string) {
    const { error } = await supabase.from("indicator_measurements").update({
      verification_status: status,
      verified_by: user?.id,
      verified_at: new Date().toISOString(),
    }).eq("id", mId);
    if (error) { showToast("error", error.message); return; }
    showToast("success", "Measurement " + status);
    load();
  }

  if (loading) return <Loading />;
  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">M&E Indicators</h1>
          <p className="page-subtitle">Indicators, categories and measurements</p>
        </div>
      </header>
      {error && <div className="card" style={{ marginBottom: "var(--space-6)", color: "var(--danger)" }}>{error}</div>}

      <section className="section">
        <div className="section-head"><div><h2 className="section-title">Indicator Categories</h2></div></div>
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input className="input" placeholder="Category name" value={catName} onChange={(e) => setCatName(e.target.value)} />
            <button className="btn btn-primary" onClick={createCategory}>Add Category</button>
          </div>
        </div>
        <div className="grid grid-3">
          {categories.map((c) => <div className="card" key={c.id}><div className="text-strong">{c.name}</div></div>)}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><div><h2 className="section-title">Indicators</h2></div></div>
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <input className="input" placeholder="Indicator name" value={indName} onChange={(e) => setIndName(e.target.value)} />
            <input className="input" placeholder="Unit" value={indUnit} onChange={(e) => setIndUnit(e.target.value)} />
            <input className="input" placeholder="Target" value={indTarget} onChange={(e) => setIndTarget(e.target.value)} />
            <select className="input" value={indCategoryId} onChange={(e) => setIndCategoryId(e.target.value)}>
              <option value="">Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={createIndicator}>Add Indicator</button>
          </div>
        </div>
        {indicators.length === 0 ? <div className="card"><EmptyState title="No indicators" message="Add indicators to track M&E." /></div> : (
          <div className="grid grid-2">
            {indicators.map((i) => <div className="card" key={i.id}>
              <div className="text-strong">{i.indicator_name}</div>
              <div className="t-xs text-muted">Unit: {i.unit || "—"} • Target: {i.target_value ?? "—"}</div>
            </div>)}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head"><div><h2 className="section-title">Measurements</h2></div></div>
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <select className="input" value={measIndicatorId} onChange={(e) => setMeasIndicatorId(e.target.value)}>
              <option value="">Indicator</option>
              {indicators.map((i) => <option key={i.id} value={i.id}>{i.indicator_name}</option>)}
            </select>
            <input type="date" className="input" value={measStart} onChange={(e) => setMeasStart(e.target.value)} />
            <input type="date" className="input" value={measEnd} onChange={(e) => setMeasEnd(e.target.value)} />
            <input className="input" placeholder="Actual value" value={measValue} onChange={(e) => setMeasValue(e.target.value)} />
            <button className="btn btn-primary" onClick={createMeasurement}>Submit Measurement</button>
          </div>
        </div>
        {measurements.length === 0 ? <div className="card"><EmptyState title="No measurements" message="Submit measurements to track progress." /></div> : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Indicator</th><th>Period</th><th>Actual</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {measurements.map((m) => (
                  <tr key={m.id}>
                    <td className="text-strong">{indicators.find((i) => i.id === m.indicator_id)?.indicator_name || m.indicator_id}</td>
                    <td className="text-muted">{m.reporting_period_start} → {m.reporting_period_end}</td>
                    <td className="text-strong">{m.actual_value}</td>
                    <td><span className="chip chip-neutral">{m.verification_status}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => verifyMeasurement(m.id, "verified")}>Verify</button>
                        <button className="btn btn-sm btn-ghost" style={{ color: "var(--danger)" }} onClick={() => verifyMeasurement(m.id, "rejected")}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default MEPage;
