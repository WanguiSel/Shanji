import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { useToast } from "../../hooks/useToast";

function MEPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [indicators, setIndicators] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ indicator_id: "", actual_value: "", start: "", end: "" });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [i, m] = await Promise.all([
        supabase.from("indicators").select("*").eq("project_id", id),
        supabase.from("indicator_measurements").select("*").eq("project_id", id),
      ]);
      if (i.error) showToast("error", i.error.message);
      else setIndicators(i.data || []);
      if (m.error) showToast("error", m.error.message);
      else setMeasurements(m.data || []);
      setLoading(false);
    })();
  }, [id]);

  async function submitMeasurement() {
    if (!id || !form.indicator_id || !form.actual_value || !form.start || !form.end) return;
    const { error } = await supabase.from("indicator_measurements").insert({
      indicator_id: form.indicator_id,
      project_id: id,
      actual_value: parseFloat(form.actual_value),
      reporting_period_start: form.start,
      reporting_period_end: form.end,
      submitted_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) showToast("error", error.message);
    else {
      showToast("success", "Measurement submitted");
      setForm({ indicator_id: "", actual_value: "", start: "", end: "" });
      const { data } = await supabase.from("indicator_measurements").select("*").eq("project_id", id);
      setMeasurements(data || []);
    }
  }

  async function verifyMeasurement(measurementId: string, status: string) {
    const { error } = await supabase.from("indicator_measurements").update({ verification_status: status, verified_by: (await supabase.auth.getUser()).data.user?.id, verified_at: new Date().toISOString() }).eq("id", measurementId);
    if (error) showToast("error", error.message);
    else {
      showToast("success", `Measurement ${status}`);
      const { data } = await supabase.from("indicator_measurements").select("*").eq("project_id", id);
      setMeasurements(data || []);
    }
  }

  if (loading) return <Loading />;
  return (
    <div>
      <h1>Monitoring & Evaluation</h1>
      <Card>
        <h2>Record Measurement</h2>
        <select value={form.indicator_id} onChange={(e) => setForm({ ...form, indicator_id: e.target.value })}>
          <option value="">Select indicator</option>
          {indicators.map((i) => <option key={i.id} value={i.id}>{i.indicator_name}</option>)}
        </select>
        <input type="number" placeholder="Actual value" value={form.actual_value} onChange={(e) => setForm({ ...form, actual_value: e.target.value })} />
        <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
        <input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
        <button onClick={submitMeasurement}>Submit</button>
      </Card>
      <h2>Measurements</h2>
      {measurements.length === 0 ? <Card><EmptyState title="No measurements" /></Card> : (
        <ul>{measurements.map((m) => (
          <li key={m.id}>
            {m.actual_value} ({m.verification_status})
            {m.verification_status === "pending" && <button onClick={() => verifyMeasurement(m.id, "verified")}>Verify</button>}
          </li>
        ))}</ul>
      )}
    </div>
  );
}
export default MEPage;