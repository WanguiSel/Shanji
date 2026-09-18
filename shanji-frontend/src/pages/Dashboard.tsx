import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Card, StatCard } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { Loading, EmptyState } from "../components/Loading";

function Dashboard() {
  const { user, profile, hasRole } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
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
        .order("created_at", { ascending: false });

      const { data: approvalsData } = await supabase
        .from("approvals")
        .select("*")
        .order("requested_at", { ascending: false });

      const { data: expensesData } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });

      const { data: activityData } = await supabase
        .from("activity_logs")
        .select("action, entity_type, entity_id, description, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      setProjects((projectsData || []) as any[]);
      setRisks((risksData || []) as any[]);
      setTasks((tasksData || []) as any[]);
      setApprovals((approvalsData || []) as any[]);
      setExpenses((expensesData || []) as any[]);
      setActivityLogs((activityData || []) as any[]);
    } catch (err) { console.error("Dashboard error:", err); }
    setLoading(false);
  }

  if (loading) return <Loading message="Loading Project Operations Command Centre..." />;

  const isPM = hasRole('project_manager') || hasRole('admin');

  // Get current project (first active project or most recent)
  const currentProject = projects.find(p => p.status === 'active') || projects[0];

  // Project health calculations
  const healthyProjects = projects.filter(p => p.health === "green");
  const atRiskProjects = projects.filter(p => p.health === "amber");
  const unhealthyProjects = projects.filter(p => p.health === "red");

  // Task metrics
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'planned');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'verified' || t.status === 'approved');
  const overdueTasks = tasks.filter(t => t.end_date && new Date(t.end_date) < new Date() && t.status !== 'completed' && t.status !== 'verified' && t.status !== 'approved');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');

  // Approvals
  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const recentApprovals = approvals.filter(a => a.status !== 'pending').slice(0, 5);

  // Risks
  const openRisks = risks.filter(r => r.status === 'open');
  const criticalRisks = risks.filter(r => r.status === 'open' && (r.probability >= 80 || r.impact >= 80));
  const highRisks = risks.filter(r => r.status === 'open' && (r.probability >= 60 || r.impact >= 60));

  // Expenses
  const totalSpend = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const pendingExpenses = expenses.filter(e => e.approval_status === 'pending');

  // Upcoming deadlines
  const upcomingTasks = tasks
    .filter(t => t.end_date && new Date(t.end_date) >= new Date() && t.status !== 'completed' && t.status !== 'verified' && t.status !== 'approved')
    .sort((a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime())
    .slice(0, 5);

  // Needs attention
  const needsAttention = [
    ...overdueTasks.slice(0, 3).map(t => ({ type: 'overdue', item: t, label: t.task_title, reason: 'Overdue', date: t.end_date })),
    ...blockedTasks.slice(0, 3).map(t => ({ type: 'blocked', item: t, label: t.task_title, reason: 'Blocked', date: t.end_date })),
    ...pendingApprovals.slice(0, 3).map(a => ({ type: 'approval', item: a, label: 'Pending approval', reason: 'Awaiting decision', date: a.requested_at })),
    ...criticalRisks.slice(0, 2).map(r => ({ type: 'risk', item: r, label: r.risk_title, reason: 'Critical risk', date: r.due_date })),
  ].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateA - dateB;
  }).slice(0, 5);

  // Current project details
  const currentProjectProgress = currentProject ? currentProject.progress || 0 : 0;
  const currentProjectStatus = currentProject ? currentProject.status : 'No active project';
  const currentProjectHealth = currentProject ? currentProject.health : 'unknown';

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

  const getDaysUntil = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
    if (isNaN(target.getTime())) return null;
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.brand}>
            <span style={styles.logo}>Shanji</span><span style={styles.logoAccent}>DNA</span>
          </div>
          <p style={styles.subtitle}>Project Operations Command Centre</p>
          <div style={styles.marker}>✅ SHANJI COMMAND CENTRE — NEW DASHBOARD</div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.greeting}>
            <span>{getGreeting()},</span>
            <strong>{user?.full_name || 'Project Manager'}</strong>
          </div>
          {projects.length > 1 && (
            <div style={styles.projectSelector}>
              <span style={styles.selectorLabel}>Current Project:</span>
              <select 
                style={styles.select}
                value={currentProject?.id || ''}
                onChange={(e) => navigate(`/projects/${e.target.value}`)}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.project_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* SECTION 1 — PROJECT HEALTH (Main Hero Section) */}
      {currentProject && (
        <section style={styles.healthSection}>
          <div style={styles.healthCard}>
            <div style={styles.healthMain}>
              <div style={styles.healthStatus}>
                <div style={{
                  ...styles.healthIndicator,
                  background: currentProjectHealth === 'green' ? '#10B981' : 
                             currentProjectHealth === 'amber' ? '#F59E0B' : '#DC2626'
                }} />
                <div>
                  <h2 style={styles.healthTitle}>{currentProject.project_name}</h2>
                  <p style={styles.healthSubtitle}>Project Status: {currentProjectStatus} • Schedule: {getScheduleState(currentProject)}</p>
                </div>
              </div>
              <div style={styles.healthProgress}>
                <div style={styles.progressRing}>
                  <svg width="120" height="120">
                    <circle cx="60" cy="60" r="54" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                    <circle 
                      cx="60" cy="60" r="54" 
                      stroke={currentProjectHealth === 'green' ? '#10B981' : currentProjectHealth === 'amber' ? '#F59E0B' : '#DC2626'} 
                      strokeWidth="8" 
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 54 * (currentProjectProgress / 100)} ${2 * Math.PI * 54}`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                    <text x="60" y="68" textAnchor="middle" style={styles.progressText}>{Math.round(currentProjectProgress)}%</text>
                  </svg>
                </div>
                <div style={styles.progressDetails}>
                  <p style={styles.progressLabel}>Overall Completion</p>
                  <p style={styles.progressValue}>{Math.round(currentProjectProgress)}%</p>
                </div>
              </div>
            </div>
            <div style={styles.healthMeta}>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Tasks</span>
                <span style={styles.metaValue}>
                  {completedTasks.filter(t => t.project_id === currentProject?.id).length} / {tasks.filter(t => t.project_id === currentProject?.id).length} completed
                </span>
              </div>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Schedule</span>
                <span style={styles.metaValue}>
                  {currentProject?.start_date && currentProject?.end_date 
                    ? `${formatDate(currentProject.start_date)} — ${formatDate(currentProject.end_date)}`
                    : 'Dates not set'}
                </span>
              </div>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Budget</span>
                <span style={styles.metaValue}>
                  {currentProject?.budget ? formatCurrency(currentProject.budget) : 'Not set'}
                </span>
              </div>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Client</span>
                <span style={styles.metaValue}>{currentProject?.client_name || 'Not specified'}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2 — OPERATIONAL METRICS */}
      <section style={styles.metricsSection}>
        <div style={styles.metricsGrid}>
          <StatCard title="Total Projects" value={projects.length} color="#1F2937" subtitle={currentProject ? `${tasks.filter(t => t.project_id === currentProject.id).length} tasks in current project` : ''} />
          <StatCard title="Total Tasks" value={totalTasks} color="#3B82F6" subtitle={currentProject ? `${tasks.filter(t => t.project_id === currentProject.id).length} in current project` : ''} />
          <StatCard title="In Progress" value={inProgressTasks.length} color="#3B82F6" subtitle={currentProject ? `${inProgressTasks.filter(t => t.project_id === currentProject.id).length} active` : ''} />
          <StatCard title="Completed" value={completedTasks.length} color="#10B981" subtitle={currentProject ? `${completedTasks.filter(t => t.project_id === currentProject.id).length} done` : ''} />
          <StatCard title="Overdue" value={overdueTasks.length} color="#DC2626" subtitle={currentProject ? `${overdueTasks.filter(t => t.project_id === currentProject.id).length} need action` : ''} />
          <StatCard title="Blocked" value={blockedTasks.length} color="#F59E0B" subtitle={currentProject ? `${blockedTasks.filter(t => t.project_id === currentProject.id).length} awaiting deps` : ''} />
          <StatCard title="Pending Approvals" value={pendingApprovals.length} color="#8B5CF6" subtitle={currentProject ? `${pendingApprovals.filter(a => a.project_id === currentProject.id).length} pending` : ''} />
          <StatCard title="Open Risks" value={openRisks.length} color="#EF4444" subtitle={criticalRisks.length > 0 ? `${criticalRisks.length} critical` : ''} />
          <StatCard title="Project Spend" value={formatCurrency(totalSpend)} color="#059669" subtitle={pendingExpenses.length > 0 ? `${pendingExpenses.length} pending` : ''} />
        </div>
      </section>

      <div style={styles.twoColumn}>
        {/* SECTION 3 — PROJECT PROGRESS */}
        <section style={styles.panel}>
          <h3 style={styles.panelTitle}>Project Progress</h3>
          {currentProject ? (
            <div>
              <div style={styles.progressBarContainer}>
                <div style={styles.progressBarBg}>
                  <div 
                    style={{ 
                      ...styles.progressBarFill,
                      width: `${currentProjectProgress}%`,
                      background: currentProjectHealth === 'green' ? '#10B981' : currentProjectHealth === 'amber' ? '#F59E0B' : '#DC2626'
                    }} 
                  />
                </div>
                <div style={styles.progressLabels}>
                  <span>0%</span>
                  <span style={{ color: '#6B7280' }}>{Math.round(currentProjectProgress)}%</span>
                  <span>100%</span>
                </div>
              </div>
              <p style={styles.progressNote}>
                {completedTasks.filter(t => t.project_id === currentProject!.id).length} of {tasks.filter(t => t.project_id === currentProject!.id).length} tasks completed
                {((project?: typeof currentProject) => { const endDate: string = project?.end_date || ''; const days: number = getDaysUntil(endDate) || 0; return endDate ? ` • ${days >= 0 ? `${days} days remaining` : 'Past end date'}` : null; })(currentProject)}
              </p>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p>No active project selected. Choose a project from the selector above.</p>
            </div>
          )}
        </section>

        {/* SECTION 4 — NEEDS ATTENTION */}
        <section style={styles.panel}>
          <h3 style={styles.panelTitle}>⚠ Needs Attention</h3>
          {needsAttention.length > 0 ? (
            <div style={styles.attentionList}>
              {needsAttention.map((item, index) => (
                <div key={index} style={styles.attentionItem}>
                  <div style={{
                    ...styles.attentionDot,
                    background: item.type === 'overdue' ? '#DC2626' : 
                               item.type === 'blocked' ? '#F59E0B' :
                               item.type === 'approval' ? '#8B5CF6' : '#EF4444'
                  }} />
                  <div style={styles.attentionContent}>
                    <p style={styles.attentionLabel}>{item.label}</p>
                    <p style={styles.attentionReason}>{item.reason}</p>
                  </div>
                  {item.date && (
                    <span style={styles.attentionDate}>
                      {(() => { const d = item.date!; const days = getDaysUntil(d); return days !== null && days < 0 ? `${Math.abs(days || 0)}d overdue` : days !== null ? `${days}d left` : formatDate(d); })()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p>No items requiring immediate attention. All systems nominal.</p>
            </div>
          )}
        </section>
      </div>

      <div style={styles.twoColumn}>
        {/* SECTION 5 — UPCOMING */}
        <section style={styles.panel}>
          <h3 style={styles.panelTitle}>📅 Upcoming</h3>
          {upcomingTasks.length > 0 ? (
            <div style={styles.upcomingList}>
              {upcomingTasks.map((task) => (
                <div key={task.id} style={styles.upcomingItem}>
                  <div style={styles.upcomingDate}>
                    <span style={styles.upcomingDay}>
                      {getDaysUntil(task.end_date) !== null ? `${getDaysUntil(task.end_date)}d` : '—'}
                    </span>
                    <span style={styles.upcomingMonth}>
                      {formatDate(task.end_date).split(' ')[0]}
                    </span>
                  </div>
                  <div style={styles.upcomingContent}>
                    <p style={styles.upcomingTitle}>{task.task_title}</p>
                    <p style={styles.upcomingMeta}>
                      <StatusBadge status={task.status} />
                      {task.responsible_user_id && ` • Assigned`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p>No upcoming deadlines in the next 30 days.</p>
            </div>
          )}
        </section>

        {/* SECTION 6 — RECENT ACTIVITY */}
        <section style={styles.panel}>
          <h3 style={styles.panelTitle}>🕐 Recent Activity</h3>
          {activityLogs.length > 0 ? (
            <div style={styles.activityList}>
              {activityLogs.map((log, index) => (
                <div key={index} style={styles.activityItem}>
                  <div style={styles.activityIcon}>
                    {log.action === 'task_created' ? '✓' : 
                     log.action === 'task_updated' ? '✎' :
                     log.action === 'status_changed' ? '⇄' :
                     log.action === 'approval_submitted' ? '📋' :
                     log.action === 'approval_approved' ? '✓' :
                     log.action === 'evidence_uploaded' ? '📎' :
                     log.action === 'workplan_updated' ? '📋' : '•'}
                  </div>
                  <div style={styles.activityContent}>
                    <p style={styles.activityText}>
                      {log.action?.replace(/_/g, ' ') || 'Activity'} 
                      {log.entity_type ? `on ${log.entity_type}` : ''}
                      {log.description ? ` — ${log.description}` : ''}
                    </p>
                    <span style={styles.activityTime}>
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p>No recent activity recorded.</p>
            </div>
          )}
        </section>
      </div>

      {/* SECTION 7 — PROJECT SNAPSHOT */}
      {currentProject && (
        <section style={styles.snapshotSection}>
          <h3 style={styles.panelTitle}>Project Snapshot</h3>
          <div style={styles.snapshotGrid}>
            <div style={styles.snapshotCard}>
              <p style={styles.snapshotLabel}>Project Name</p>
              <p style={styles.snapshotValue}>{currentProject.project_name}</p>
            </div>
            <div style={styles.snapshotCard}>
              <p style={styles.snapshotLabel}>PM</p>
              <p style={styles.snapshotValue}>{currentProject.pm_user_id ? 'Assigned' : 'Not assigned'}</p>
            </div>
            <div style={styles.snapshotCard}>
              <p style={styles.snapshotLabel}>Status</p>
              <p style={styles.snapshotValue}><StatusBadge status={currentProject.status} /></p>
            </div>
            <div style={styles.snapshotCard}>
              <p style={styles.snapshotLabel}>Health</p>
              <p style={styles.snapshotValue}><StatusBadge status={currentProject.health} /></p>
            </div>
            <div style={styles.snapshotCard}>
              <p style={styles.snapshotLabel}>Start Date</p>
              <p style={styles.snapshotValue}>{formatDate(currentProject.start_date)}</p>
            </div>
            <div style={styles.snapshotCard}>
              <p style={styles.snapshotLabel}>Expected Completion</p>
              <p style={styles.snapshotValue}>{formatDate(currentProject.end_date)}</p>
            </div>
            <div style={styles.snapshotCard}>
              <p style={styles.snapshotLabel}>Current Completion</p>
              <p style={styles.snapshotValue}>{Math.round(currentProjectProgress)}%</p>
            </div>
            <div style={styles.snapshotCard}>
              <p style={styles.snapshotLabel}>Client</p>
              <p style={styles.snapshotValue}>{currentProject.client_name || 'Not specified'}</p>
            </div>
          </div>
        </section>
      )}

      {/* PM-ONLY OPERATIONAL INTELLIGENCE */}
      {isPM && currentProject && (
        <section style={styles.pmSection}>
          <h3 style={styles.panelTitle}>🔒 PM Operational Intelligence</h3>
          <div style={styles.pmGrid}>
            <div style={styles.pmCard}>
              <p style={styles.pmLabel}>Team Workload</p>
              <p style={styles.pmValue}>
                {inProgressTasks.filter(t => t.project_id === currentProject.id).length} active tasks
                {blockedTasks.filter(t => t.project_id === currentProject.id).length > 0 && ` • ${blockedTasks.filter(t => t.project_id === currentProject.id).length} blocked`}
              </p>
            </div>
            <div style={styles.pmCard}>
              <p style={styles.pmLabel}>Risk Exposure</p>
              <p style={styles.pmValue}>
                {criticalRisks.filter(r => r.project_id === currentProject.id).length} critical
                {highRisks.filter(r => r.project_id === currentProject.id).length > 0 && ` • ${highRisks.filter(r => r.project_id === currentProject.id).length} high`}
              </p>
            </div>
            <div style={styles.pmCard}>
              <p style={styles.pmLabel}>Approval Bottlenecks</p>
              <p style={styles.pmValue}>
                {pendingApprovals.filter(a => a.project_id === currentProject.id).length} pending
                {pendingApprovals.filter(a => a.project_id === currentProject.id && new Date(a.requested_at) < new Date(Date.now() - 3*24*60*60*1000)).length > 0 && ` • ${pendingApprovals.filter(a => a.project_id === currentProject.id && new Date(a.requested_at) < new Date(Date.now() - 3*24*60*60*1000)).length} >3 days`}
              </p>
            </div>
            <div style={styles.pmCard}>
              <p style={styles.pmLabel}>Budget Health</p>
              <p style={styles.pmValue}>
                {currentProject.budget && currentProject.budget > 0 ? `${Math.round((totalSpend / currentProject.budget) * 100)}% utilized` : 'Budget not set'}
                {pendingExpenses.filter(e => e.project_id === currentProject.id).length > 0 && ` • ${pendingExpenses.filter(e => e.project_id === currentProject.id).length} pending`}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header: { 
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', 
    marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid #E5E7EB' 
  },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: '4px' },
  brand: { display: 'flex', alignItems: 'baseline', gap: '4px' },
  logo: { fontSize: '28px', fontWeight: '700', color: '#0D3B2E', letterSpacing: '-0.02em' },
  logoAccent: { fontSize: '28px', fontWeight: '700', color: '#F59E0B' },
  subtitle: { fontSize: '14px', color: '#6B7280', margin: 0, fontWeight: 400 },
  marker: { fontSize: '11px', fontWeight: 700, color: '#10B981', marginTop: '4px', padding: '2px 8px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '4px', display: 'inline-block', width: 'fit-content' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '24px' },
  greeting: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' },
  projectSelector: { display: 'flex', alignItems: 'center', gap: '8px' },
  selectorLabel: { fontSize: '13px', color: '#6B7280' },
  select: { 
    padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', 
    fontSize: '14px', background: 'white', minWidth: '220px' 
  },
  healthSection: { marginBottom: '32px' },
  healthCard: { 
    background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', 
    padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' 
  },
  healthMain: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '32px' },
  healthStatus: { display: 'flex', alignItems: 'center', gap: '16px', flex: 1 },
  healthIndicator: { width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0 },
  healthTitle: { fontSize: '24px', fontWeight: '700', color: '#1F2937', margin: '0 0 4px' },
  healthSubtitle: { fontSize: '14px', color: '#6B7280', margin: 0 },
  healthProgress: { display: 'flex', alignItems: 'center', gap: '24px' },
  progressRing: { flexShrink: 0 },
  progressText: { fontSize: '20px', fontWeight: '700', fill: '#1F2937', dominantBaseline: 'central' },
  progressDetails: { display: 'flex', flexDirection: 'column', gap: '4px' },
  progressLabel: { fontSize: '13px', color: '#6B7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  progressValue: { fontSize: '28px', fontWeight: '700', color: '#1F2937', margin: 0 },
  healthMeta: { 
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', 
    paddingTop: '16px', borderTop: '1px solid #E5E7EB' 
  },
  metaItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  metaLabel: { fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' },
  metaValue: { fontSize: '14px', fontWeight: 500, color: '#374151' },
  metricsSection: { marginBottom: '32px' },
  metricsGrid: { 
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
    gap: '16px' 
  },
  twoColumn: { 
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px',
    marginBottom: '32px'
  },
  panel: { 
    background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', 
    padding: '24px', minHeight: '280px' 
  },
  panelTitle: { 
    fontSize: '16px', fontWeight: '600', color: '#1F2937', 
    margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' 
  },
  emptyState: { 
    padding: '40px 24px', textAlign: 'center', color: '#9CA3AF', 
    background: '#F9FAFB', borderRadius: '8px', border: '1px dashed #D1D5DB' 
  },
  progressBarContainer: { display: 'flex', flexDirection: 'column', gap: '8px' },
  progressBarBg: { height: '12px', background: '#E5E7EB', borderRadius: '6px', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: '6px', transition: 'width 0.3s ease' },
  progressLabels: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9CA3AF' },
  progressNote: { fontSize: '13px', color: '#6B7280', margin: '12px 0 0' },
  attentionList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  attentionItem: { 
    display: 'flex', alignItems: 'center', gap: '12px', 
    padding: '12px 16px', background: '#F9FAFB', borderRadius: '8px', 
    border: '1px solid #E5E7EB' 
  },
  attentionDot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  attentionContent: { flex: 1, minWidth: 0 },
  attentionLabel: { fontSize: '14px', fontWeight: 500, color: '#1F2937', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  attentionReason: { fontSize: '12px', color: '#6B7280', margin: 0 },
  attentionDate: { fontSize: '12px', fontWeight: 500, color: '#DC2626', whiteSpace: 'nowrap' },
  upcomingList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  upcomingItem: { 
    display: 'flex', alignItems: 'center', gap: '16px', 
    padding: '12px 16px', background: '#F9FAFB', borderRadius: '8px', 
    border: '1px solid #E5E7EB' 
  },
  upcomingDate: { 
    display: 'flex', flexDirection: 'column', alignItems: 'center', 
    background: '#0D3B2E', color: 'white', padding: '8px 12px', 
    borderRadius: '8px', minWidth: '56px' 
  },
  upcomingDay: { fontSize: '18px', fontWeight: '700', lineHeight: 1 },
  upcomingMonth: { fontSize: '11px', opacity: 0.8, textTransform: 'uppercase' },
  upcomingContent: { flex: 1 },
  upcomingTitle: { fontSize: '14px', fontWeight: '500', color: '#1F2937', margin: '0 0 2px' },
  upcomingMeta: { fontSize: '12px', color: '#6B7280', margin: 0 },
  activityList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  activityItem: { 
    display: 'flex', alignItems: 'flex-start', gap: '12px', 
    padding: '12px 16px', background: '#F9FAFB', borderRadius: '8px', 
    border: '1px solid #E5E7EB' 
  },
  activityIcon: { 
    width: '32px', height: '32px', borderRadius: '8px', 
    background: '#EFF6FF', color: '#3B82F6', display: 'flex', 
    alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 
  },
  activityContent: { flex: 1 },
  activityText: { fontSize: '13px', color: '#374151', margin: '0 0 4px', lineHeight: 1.4 },
  activityTime: { fontSize: '11px', color: '#9CA3AF' },
  snapshotSection: { marginBottom: '32px' },
  snapshotGrid: { 
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
    gap: '16px' 
  },
  snapshotCard: { 
    background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', 
    padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' 
  },
  snapshotLabel: { fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
  snapshotValue: { fontSize: '14px', fontWeight: 500, color: '#374151', margin: 0 },
  pmSection: { 
    background: '#FEF3C7', borderRadius: '12px', border: '1px solid #FCD34D', 
    padding: '24px', marginTop: '24px' 
  },
  pmGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
  pmCard: { 
    background: 'white', borderRadius: '10px', border: '1px solid #FDE68A', 
    padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' 
  },
  pmLabel: { fontSize: '12px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
  pmValue: { fontSize: '14px', fontWeight: 500, color: '#374151', margin: 0 },
};

export default Dashboard;