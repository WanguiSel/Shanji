import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Project } from "../types";
import { useProject } from "../contexts/ProjectContext";
import { HealthIndicator } from "../components/HealthIndicator";
import { StatusBadge } from "../components/StatusBadge";

function projectHealth(project: any): string {
  if (project?.health) return project.health;
  const score = Number(project?.health_score ?? NaN);
  if (Number.isNaN(score)) return "green";
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "red";
}

function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setCurrentProject } = useProject();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProject = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("projects").select("*").eq("id", id).single();
    if (data) {
      setProject(data as Project);
      setCurrentProject(data as Project);
    }
    setLoading(false);
  }, [id, setCurrentProject]);

  useEffect(() => { loadProject(); }, [loadProject]);

  if (loading || !project) return <div style={{ padding: '40px' }}>Loading project...</div>;

  const live = project as any;
  const managerId = live.project_manager_id || live.pm_user_id;
  const health = projectHealth(live);

  const tabs = [
    { key: "overview", label: "Overview", slug: "" },
    { key: "plan", label: "Plan", slug: "workplan" },
    { key: "tasks", label: "Tasks", slug: "tasks" },
    { key: "dependencies", label: "Dependencies", slug: "dependencies" },
    { key: "timeline", label: "Timeline", slug: "timeline" },
    { key: "risks", label: "Risks", slug: "risks" },
    { key: "issues", label: "Issues", slug: "issues" },
    { key: "procurement", label: "Procurement", slug: "procurement" },
    { key: "finance", label: "Finance", slug: "finance" },
    { key: "hseq", label: "HSEQ", slug: "hseq" },
    { key: "site", label: "Site", slug: "site" },
    { key: "evidence", label: "Evidence", slug: "evidence" },
    { key: "documents", label: "Documents", slug: "documents" },
    { key: "approvals", label: "Approvals", slug: "approvals" },
    { key: "reports", label: "Reports", slug: "reports" },
    { key: "changes", label: "Changes", slug: "change-requests" },
    { key: "comments", label: "Comments", slug: "comments" },
    { key: "handover", label: "Handover", slug: "handover" },
  ];

  const openTab = (slug: string) => {
    if (!slug) return;
    navigate(`/projects/${project.id}/${slug}`);
  };


  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '24px' }}>← Back</button>
      <div style={styles.hero}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>{project.project_name}</h1>
          <p style={{ color: '#6B7280', fontSize: '15px' }}>
            {project.client_name || 'No client'} · {live.location || 'No location'} · {project.project_code || 'No code'}
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={project.status || 'initiation'} />
            <HealthIndicator health={health as any} />
          </div>
        </div>
        <div style={styles.stats}>
          <div><div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progress</div><div style={{ fontSize: '24px', fontWeight: 700, color: '#0D6B4E' }}>{project.progress || 0}%</div></div>
          <div><div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Readiness</div><div style={{ fontSize: '24px', fontWeight: 700, color: '#F59E0B' }}>{live.completion_readiness != null ? `${live.completion_readiness}%` : '—'}</div></div>
          <div><div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</div><div style={{ fontSize: '24px', fontWeight: 700 }}>{project.start_date && project.end_date ? Math.round((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24)) : '—'}d</div></div>
        </div>
      </div>
      <div style={styles.tabsRow}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => openTab(tab.slug)} style={{
            padding: '8px 14px', borderRadius: '6px', border: 'none',
            background: tab.key === 'overview' ? '#0D6B4E' : '#F3F4F6',
            color: tab.key === 'overview' ? 'white' : '#374151',
            fontSize: '13px', fontWeight: tab.key === 'overview' ? 600 : 400,
            cursor: tab.slug ? 'pointer' : 'default',
          }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          <InfoCard label="Client" value={project.client_name || '—'} />
          <InfoCard label="PM" value={managerId ? `Assigned (${String(managerId).slice(0, 8)})` : 'Not assigned'} />
          <InfoCard label="Start Date" value={project.start_date || '—'} />
          <InfoCard label="End Date" value={project.end_date || '—'} />
          <InfoCard label="Budget" value={live.budget_amount ? `${live.currency || 'KES'} ${Number(live.budget_amount).toLocaleString()}` : project.budget ? `${project.currency} ${project.budget.toLocaleString()}` : '—'} />
          <InfoCard label="Description" value={project.description?.slice(0, 80) || '—'} />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
      <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '20px' },
  stats: { display: 'flex', gap: '32px' },
  tabsRow: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '24px' },
};

export default ProjectWorkspace;
