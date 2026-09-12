import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Project } from "../types";
import { HealthIndicator } from "../components/HealthIndicator";
import { StatusBadge } from "../components/StatusBadge";
import { Card, StatCard } from "../components/Card";

function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProject = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("projects").select("*").eq("id", id).single();
    if (data) setProject(data as Project);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);

  if (loading || !project) return <div style={{ padding: '40px' }}>Loading project...</div>;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '24px' }}>
        ← Back
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>{project.project_name}</h1>
          <p style={{ color: '#6B7280' }}>
            {project.client_name || 'No client'} · {project.location || 'No location'}
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={project.status || 'initiation'} />
            <HealthIndicator health={project.health || 'green'} />
          </div>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <StatCard title="Progress" value={`${project.progress || 0}%`} subtitle="Operational progress" />
        <StatCard title="Completion Readiness" value={`${project.completion_readiness || 0}%`} subtitle="Closure requirements" color="#F59E0B" />
        <StatCard title="Budget" value={project.budget ? `${project.currency || 'KES'} ${project.budget.toLocaleString()}` : 'Not set'} subtitle="Total budget" />
        <StatCard title="Duration" value={
          project.start_date && project.end_date
            ? `${Math.round((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))} days`
            : 'Not set'
        } />
      </div>

      <div style={styles.tabsRow}>
        {[
          { label: 'Overview', path: '' },
          { label: 'Tasks', path: '/tasks' },
          { label: 'Timeline', path: '/timeline' },
          { label: 'Risks', path: '/risks' },
          { label: 'Issues', path: '/issues' },
          { label: 'Procurement', path: '/procurement' },
          { label: 'Finance', path: '/finance' },
          { label: 'Site', path: '/site' },
          { label: 'Documents', path: '/documents' },
          { label: 'Approvals', path: '/approvals' },
          { label: 'Reports', path: '/reports' },
          { label: 'Change Requests', path: '/change-requests' },
          { label: 'Handover', path: '/handover' },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => tab.path ? navigate(`/projects/${id}${tab.path}`) : null}
            style={styles.tab}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Quick Summary</h2>
        <div style={styles.infoGrid}>
          <InfoCard label="Project Code" value={project.project_code || '—'} />
          <InfoCard label="PM" value={project.pm_user_id ? 'Assigned' : 'Not assigned'} />
          <InfoCard label="Start Date" value={project.start_date || '—'} />
          <InfoCard label="End Date" value={project.end_date || '—'} />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
      <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 500, color: '#111827' }}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' },
  tabsRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid #E5E7EB', paddingBottom: '16px' },
  tab: { padding: '8px 16px', background: 'transparent', border: '1px solid transparent', borderRadius: '6px', fontSize: '13px', fontWeight: 500, color: '#6B7280', cursor: 'pointer', transition: 'all 0.15s' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
};

export default ProjectWorkspace;
