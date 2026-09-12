import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { Project } from "../types";
import { StatCard } from "../components/Card";
import { HealthIndicator } from "../components/HealthIndicator";
import { StatusBadge } from "../components/StatusBadge";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      setProjects((data || []) as Project[]);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    }
    setLoading(false);
  }

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    atRisk: projects.filter((p) => p.health === "red" || p.status === "at_risk").length,
    overdue: projects.reduce((sum, p) => sum + (p.progress < 100 ? 1 : 0), 0),
  };

  if (loading) return <div style={{ padding: '40px' }}>Loading dashboard...</div>;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={{ fontSize: '24px' }}>Dashboard</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Project Operations Overview</p>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <StatCard title="Total Projects" value={stats.total} subtitle="All organizations" />
        <StatCard title="Active Projects" value={stats.active} color="#0D6B4E" />
        <StatCard title="At Risk" value={stats.atRisk} color="#DC2626" />
        <StatCard title="Overdue" value={stats.overdue} color="#F59E0B" />
      </div>

      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Projects</h2>
        {projects.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#9CA3AF', background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <p>No projects yet.</p>
          </div>
        ) : (
          <div style={styles.projectsGrid}>
            {projects.map((project) => (
              <div
                key={project.id}
                style={styles.projectCard}
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div style={styles.projectHeader}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{project.project_name}</h3>
                  <HealthIndicator health={project.health || 'green'} size="sm" />
                </div>
                <div style={styles.projectInfo}>
                  <span style={styles.projectClient}>{project.client_name || 'No client'}</span>
                  <StatusBadge status={project.status || 'initiation'} />
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${project.progress || 0}%` }} />
                </div>
                <div style={styles.progressText}>
                  {project.progress || 0}% complete
                  {project.completion_readiness && project.completion_readiness < 100 && (
                    <span style={{ color: '#F59E0B' }}> · Readiness {project.completion_readiness}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' },
  projectsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  projectCard: { background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #E5E7EB', cursor: 'pointer', transition: 'box-shadow 0.15s' },
  projectHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  projectInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' },
  projectClient: { fontSize: '13px', color: '#6B7280' },
  progressBar: { height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' },
  progressFill: { height: '100%', background: '#0D6B4E', borderRadius: '3px', transition: 'width 0.3s' },
  progressText: { fontSize: '12px', color: '#6B7280', marginTop: '8px' },
};

export default Dashboard;
