import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card, StatCard } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";

function ReportsPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReport(); }, []);

  async function loadReport() {
    if (!id) return;
    const { data: pData } = await supabase.from("projects").select("*").eq("id", id).single();
    setProject(pData);

    const { data: wpData } = await supabase.from("workplans").select("id").eq("project_id", id);
    if (wpData?.length) {
      const { data: tData } = await supabase.from("workplan_items").select("*").in("workplan_id", wpData.map((w) => w.id));
      setTasks((tData || []) as any[]);
    }

    const { data: rData } = await supabase.from("risks").select("*").eq("project_id", id);
    setRisks((rData || []) as any[]);

    const { data: eData } = await supabase.from("expenses").select("*").eq("project_id", id);
    setExpenses((eData || []) as any[]);

    setLoading(false);
  }

  if (loading || !project) return <Loading />;

  const completed = tasks.filter((t) => t.status === 'completed' || t.status === 'approved').length;
  const total = tasks.length;
  const openRisks = risks.filter((r) => r.status === 'open').length;
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Reports</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Generated reports from system data</p>
        </div>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Project Status Report — {project.project_name}</h2>
        <div style={styles.infoGrid}>
          <InfoItem label="Progress" value={`${project.progress || 0}%`} />
          <InfoItem label="Health" value={project.health || 'green'} />
          <InfoItem label="Tasks Completed" value={`${completed}/${total}`} />
          <InfoItem label="Open Risks" value={String(openRisks)} />
          <InfoItem label="Total Expenses" value={`KES ${totalExpenses.toLocaleString()}`} />
          <InfoItem label="Start Date" value={project.start_date || '—'} />
          <InfoItem label="End Date" value={project.end_date || '—'} />
          <InfoItem label="Client" value={project.client_name || '—'} />
        </div>
      </Card>

      <div style={styles.statsRow}>
        <StatCard title="Task Completion" value={total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%'} />
        <StatCard title="Budget Used" value={project.budget ? `${Math.round((totalExpenses / project.budget) * 100)}%` : '—'} />
        <StatCard title="Open Issues" value={String(risks.filter((r) => r.status === 'materialized').length)} color="#F59E0B" />
      </div>

      <Card style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Required Decisions</h2>
        <p style={{ color: '#6B7280', fontSize: '14px' }}>Review pending approvals, unresolved risks, and incomplete closure items.</p>
      </Card>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '12px', background: '#F9FAFB', borderRadius: '6px' }}>
      <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: '24px' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px' },
};

export default ReportsPage;
