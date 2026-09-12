import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Project } from "../types";
import { Card } from "../components/Card";
import { Loading, EmptyState } from "../components/Loading";
import { HealthIndicator } from "../components/HealthIndicator";
import { StatusBadge } from "../components/StatusBadge";

function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  const loadProject = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("projects").select("*").eq("id", id).single();
    if (data) setProject(data as Project);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);

  if (loading || !project) return <div style={{ padding: '40px' }}>Loading project...</div>;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "plan", label: "Plan" },
    { key: "tasks", label: "Tasks" },
    { key: "timeline", label: "Timeline" },
    { key: "risks", label: "Risks" },
    { key: "issues", label: "Issues" },
    { key: "procurement", label: "Procurement" },
    { key: "finance", label: "Finance" },
    { key: "site", label: "Site" },
    { key: "documents", label: "Documents" },
    { key: "approvals", label: "Approvals" },
    { key: "reports", label: "Reports" },
    { key: "changes", label: "Changes" },
    { key: "handover", label: "Handover" },
  ];

  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '24px' }}>← Back</button>
      <div style={styles.hero}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>{project.project_name}</h1>
          <p style={{ color: '#6B7280', fontSize: '15px' }}>
            {project.client_name || 'No client'} · {project.location || 'No location'} · {project.project_code || 'No code'}
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={project.status || 'initiation'} />
            <HealthIndicator health={project.health || 'green'} />
          </div>
        </div>
        <div style={styles.stats}>
          <div><div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progress</div><div style={{ fontSize: '24px', fontWeight: 700, color: '#0D6B4E' }}>{project.progress || 0}%</div></div>
          <div><div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Readiness</div><div style={{ fontSize: '24px', fontWeight: 700, color: '#F59E0B' }}>{project.completion_readiness || 0}%</div></div>
          <div><div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</div><div style={{ fontSize: '24px', fontWeight: 700 }}>{project.start_date && project.end_date ? Math.round((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24)) : '—'}d</div></div>
        </div>
      </div>
      <div style={styles.tabsRow}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '8px 14px', borderRadius: '6px', border: 'none',
            background: activeTab === tab.key ? '#0D6B4E' : '#F3F4F6',
            color: activeTab === tab.key ? 'white' : '#374151',
            fontSize: '13px', fontWeight: activeTab === tab.key ? 600 : 400,
            cursor: 'pointer',
          }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: '24px' }}>
        <ContentTab project={project} tab={activeTab} />
      </div>
    </div>
  );
}

function ContentTab({ project, tab }: { project: Project; tab: string }) {
  switch (tab) {
    case "overview":
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          <InfoCard label="Client" value={project.client_name || '—'} />
          <InfoCard label="PM" value={project.pm_user_id ? 'Assigned' : 'Not assigned'} />
          <InfoCard label="Start Date" value={project.start_date || '—'} />
          <InfoCard label="End Date" value={project.end_date || '—'} />
          <InfoCard label="Budget" value={project.budget ? `${project.currency} ${project.budget.toLocaleString()}` : '—'} />
          <InfoCard label="Description" value={project.description?.slice(0, 80) || '—'} />
        </div>
      );
    case "tasks":
      return <Card><EmptyState title="View Tasks" message="Navigate to Tasks tab for full task management." /></Card>;
    case "risks":
      return <Card><EmptyState title="View Risks" message="Navigate to Risks tab." /></Card>;
    case "finance":
      return <Card><EmptyState title="View Finance" message="Navigate to Finance tab." /></Card>;
    default:
      return <Card><EmptyState title={tab} message="This module is under development." /></Card>;
  }
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
