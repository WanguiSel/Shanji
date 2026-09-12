import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Card, StatCard } from "../components/Card";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      setProjects((data || []) as any[]);
    } catch (err) { console.error("Dashboard error:", err); }
    setLoading(false);
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard...</div>;

  const activeProjects = projects.filter((p) => p.status === "active");
  const atRisk = projects.filter((p) => p.health === "red" || p.status === "at_risk");

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={{ fontSize: '24px' }}>Dashboard</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Welcome back{user?.full_name ? `, ${user.full_name}` : ''}</p>
        </div>
      </div>
      <div style={styles.statsGrid}>
        <StatCard title="Active Projects" value={activeProjects.length} color="#0D6B4E" />
        <StatCard title="At Risk" value={atRisk.length} color="#DC2626" />
        <StatCard title="Total Projects" value={projects.length} />
        <StatCard title="Pending Tasks" value={projects.reduce((s, p) => s + (p.progress || 0) < 100 ? 1 : 0, 0)} color="#F59E0B" />
      </div>
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Recent Projects</h2>
        {projects.length === 0 ? (
          <Card><p style={{ color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>No projects yet. Create your first project.</p></Card>
        ) : (
          <div style={styles.projectsGrid}>
            {projects.slice(0, 6).map((p) => (
              <div key={p.id} style={styles.projectCard} onClick={() => navigate(`/projects/${p.id}`)}>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>{p.project_name}</div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  {p.client_name || 'No client'} · {p.status || 'initiation'}
                </div>
                <div style={{ marginTop: '12px', height: '4px', background: '#E5E7EB', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${p.progress || 0}%`, background: '#0D6B4E', borderRadius: '2px' }} />
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{p.progress || 0}%</div>
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
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' },
  projectsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  projectCard: { background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB', cursor: 'pointer' },
};

export default Dashboard;
