import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Project } from "../types";
import { HealthIndicator } from "../components/HealthIndicator";
import { StatusBadge } from "../components/StatusBadge";
import { Card, StatCard } from "../components/Card";

function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects((data || []) as Project[]);
    setLoading(false);
  }

  if (loading) return <div style={{ padding: '40px' }}>Loading...</div>;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Projects</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Project Portfolio</p>
        </div>
      </div>

      <div style={styles.statsRow}>
        <StatCard title="Total" value={projects.length} />
        <StatCard title="Active" value={projects.filter((p) => p.status === "active").length} color="#0D6B4E" />
        <StatCard title="Planning" value={projects.filter((p) => p.status === "planning" || p.status === "approval").length} color="#8B5CF6" />
      </div>

      <div style={{ marginTop: '24px' }}>
        {projects.length === 0 ? (
          <Card>
            <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>No projects found. Create your first project to get started.</p>
          </Card>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Project</th>
                  <th style={styles.th}>Client</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Health</th>
                  <th style={styles.th}>Progress</th>
                  <th style={styles.th}>Start Date</th>
                  <th style={styles.th}>End Date</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} style={styles.tr} onClick={() => navigate(`/projects/${p.id}`)}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{p.project_name}</td>
                    <td style={styles.td}>{p.client_name || '—'}</td>
                    <td style={styles.td}><StatusBadge status={p.status || 'initiation'} /></td>
                    <td style={styles.td}><HealthIndicator health={p.health || 'green'} size="sm" /></td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={styles.miniBar}>
                          <div style={{ ...styles.miniFill, width: `${p.progress || 0}%` }} />
                        </div>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>{p.progress || 0}%</span>
                      </div>
                    </td>
                    <td style={{ ...styles.td, fontSize: '13px' }}>{p.start_date || '—'}</td>
                    <td style={{ ...styles.td, fontSize: '13px' }}>{p.end_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
  tableWrap: { background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' },
  td: { padding: '12px 16px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' },
  tr: { cursor: 'pointer' },
  miniBar: { width: '80px', height: '4px', background: '#E5E7EB', borderRadius: '2px', overflow: 'hidden' },
  miniFill: { height: '100%', background: '#0D6B4E', borderRadius: '2px' },
};

export default Projects;
