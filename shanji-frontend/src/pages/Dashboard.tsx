import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Card, StatCard } from "../components/Card";

function Dashboard() {
  const { user, profile, hasRole } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      
      const { data: risksData } = await supabase
        .from("risks")
        .select("*")
        .order("created_at", { ascending: false });
        
      const { data: tasksData } = await supabase
        .from("workplan_items")
        .select("*")
        .eq("status", "not_started")
        .order("created_at", { ascending: false });
        
      setProjects((projectsData || []) as any[]);
      setRisks((risksData || []) as any[]);
      setTasks((tasksData || []) as any[]);
    } catch (err) { console.error("Dashboard error:", err); }
    setLoading(false);
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard...</div>;

  // PM authorization check using existing hasRole function from AuthContext
  const isPM = hasRole('project_manager') || hasRole('admin');

  // Project health counts - using only projects.health as authoritative
  const healthyProjects = projects.filter((p) => p.health === "green");
  const atRiskProjects = projects.filter((p) => p.health === "amber");
  const unhealthyProjects = projects.filter((p) => p.health === "red");

  // Schedule calculations
  const getScheduleState = (project: any) => {
    if (!project.start_date || !project.end_date) return 'Not set';
    
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);
    const today = new Date();
    
    if (today < start) return 'Upcoming';
    if (today > end && project.status !== 'closed' && project.status !== 'closure') return 'Overdue';
    if (today >= start && today <= end) return 'In Progress';
    return 'Completed';
  };

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Health reasons based on verified existing data
  const getHealthReason = (project: any) => {
    const reasons: string[] = [];
    
    if (project.end_date && project.status !== 'closed' && project.status !== 'closure') {
      if (new Date(project.end_date) < new Date()) {
        reasons.push("Past end date");
      }
    }
    
    const projectRisks = risks.filter(r => r.project_id === project.id && r.status === 'open');
    const highRiskItems = projectRisks.filter(r => r.probability >= 80 || r.impact >= 80);
    if (highRiskItems.length > 0) {
      reasons.push(`${highRiskItems.length} high-risk items`);
    }
    
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const overdueTasks = projectTasks.filter(t => t.end_date && new Date(t.end_date) < new Date());
    if (overdueTasks.length > 0) {
      reasons.push(`${overdueTasks.length} overdue tasks`);
    }
    
    if (reasons.length === 0) {
      return "Health status is based on the current project assessment.";
    }
    
    return reasons.join(", ");
  };

  // Risk summary using only verified fields
  const getRiskSummary = (projectId: string) => {
    const projectRisks = risks.filter(r => r.project_id === projectId && r.status === 'open');
    const total = projectRisks.length;
    const highProbability = projectRisks.filter(r => r.probability >= 80).length;
    const highImpact = projectRisks.filter(r => r.impact >= 80).length;
    const riskScore = projectRisks.reduce((sum, r) => sum + (r.risk_score || 0), 0);
    
    return { total, highProbability, highImpact, riskScore };
  };

  // PM-specific data for PM-only section
  const overdueProjects = projects.filter((p) => {
    if (!p.end_date || p.status === 'closed' || p.status === 'closure') return false;
    return new Date(p.end_date) < new Date();
  });

  const criticalRisks = risks.filter(r => r.status === 'open' && (r.probability >= 80 || r.impact >= 80));
  const openRiskCount = risks.filter(r => r.status === 'open').length;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={{ fontSize: '24px' }}>Dashboard</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Welcome back{user?.full_name ? `, ${user.full_name}` : ''}</p>
        </div>
      </div>
      
      {/* PM-only dashboard information - only shown to PMs */}
      {isPM && (
        <div style={styles.pmSection}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#F59E0B' }}>PM Dashboard View</h3>
          <div style={styles.statsGrid}>
            <StatCard title="Healthy" value={healthyProjects.length} color="#10B981" />
            <StatCard title="At Risk" value={atRiskProjects.length} color="#F59E0B" />
            <StatCard title="Unhealthy" value={unhealthyProjects.length} color="#DC2626" />
            <StatCard title="Overdue" value={overdueProjects.length} color="#EF4444" />
            <StatCard title="Open Risks" value={openRiskCount} color="#8B5CF6" />
            <StatCard title="Pending Tasks" value={tasks.length} color="#3B82F6" />
          </div>
        </div>
      )}

      {/* Standard dashboard for all users */}
      <div style={styles.statsGrid}>
        <StatCard title="Total Projects" value={projects.length} />
        <StatCard title="Active Projects" value={projects.filter(p => p.status === 'active').length} color="#0D6B4E" />
      </div>

      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Recent Projects</h2>
        {projects.length === 0 ? (
          <Card><p style={{ color: '#9CA3AF', textAlign: 'center', padding: '32px 0' }}>No projects yet. Create your first project.</p></Card>
        ) : (
          <div style={styles.projectsGrid}>
            {projects.slice(0, 6).map((p) => {
              const riskSummary = getRiskSummary(p.id);
              return (
                <div key={p.id} style={styles.projectCard} onClick={() => navigate(`/projects/${p.id}`)}>
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>{p.project_name}</div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>
                    {p.client_name || 'No client'} · {p.status || 'initiation'}
                  </div>
                  <div style={{ marginTop: '12px', height: '4px', background: '#E5E7EB', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${p.progress || 0}%`, background: '#0D6B4E', borderRadius: '2px' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{p.progress || 0}%</div>
                  
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                      Health: <span style={{ color: p.health === 'green' ? '#10B981' : p.health === 'amber' ? '#F59E0B' : '#DC2626' }}>
                        {p.health === 'green' ? 'Healthy' : p.health === 'amber' ? 'At Risk' : 'Unhealthy'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                      Schedule: <span style={{ color: '#374151' }}>{getScheduleState(p)}</span>
                    </div>
                    {p.start_date && p.end_date && (
                      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                        Dates: {new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()}
                        {getDaysRemaining(p.end_date) !== null && (
                          <span style={{ marginLeft: '4px', 
                            color: getDaysRemaining(p.end_date) < 0 ? '#DC2626' : '#6B7280' }}>
                            ({getDaysRemaining(p.end_date) < 0 ? 'Overdue' : `${getDaysRemaining(p.end_date)} days`})
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                      Risks: {riskSummary.total} total ({riskSummary.highProbability} high probability, {riskSummary.highImpact} high impact, Score: {riskSummary.riskScore})
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                      Reason: {getHealthReason(p)}
                    </div>
                  </div>
                </div>
              );
            })}
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
  pmSection: { marginBottom: '32px', padding: '20px', background: '#FEF3C7', borderRadius: '8px', border: '1px solid #FCD34D' },
};

export default Dashboard;
