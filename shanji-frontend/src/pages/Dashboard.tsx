import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useProject } from "../contexts/ProjectContext";
import { StatCard } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { Loading, EmptyState } from "../components/Loading";

function Dashboard() {
  const { user, profile, hasRole } = useAuth();
  const { currentProject, setCurrentProject } = useProject();
  const navigate = useNavigate();
  const isPM = hasRole("project_manager") || hasRole("admin");

  const [projects, setProjects] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [procurement, setProcurement] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      const [pR, rR, tR, aR, eR, prR, acR] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("risks").select("*").order("created_at", { ascending: false }),
        supabase.from("workplan_items").select("*").order("created_at", { ascending: false }),
        supabase.from("approvals").select("*").order("requested_at", { ascending: false }),
        supabase.from("evidence_records").select("*").order("created_at", { ascending: false }),
        supabase.from("procurement_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("activity_logs").select("id,project_id,actor_id,action,entity_type,entity_id,description,metadata,created_at").order("created_at", { ascending: false }).limit(20),
      ]);
      setProjects((pR.data || []) as any[]);
      setRisks((rR.data || []) as any[]);
      setTasks((tR.data || []) as any[]);
      setApprovals((aR.data || []) as any[]);
      setEvidence((eR.data || []) as any[]);
      setProcurement((prR.data || []) as any[]);
      setActivityLogs((acR.data || []) as any[]);
    } catch (err) { console.error("Dashboard error:", err); }
    setLoading(false);
  }

  if (loading) return <Loading message="Loading Project Operations Command Centre..." />;

  // --- GLOBAL METRICS ---
  const activeProjects = projects.filter((p: any) => p.status === "active");
  const openRisks = risks.filter((r: any) => r.status === "open");
  const criticalRisks = openRisks.filter((r: any) => r.risk_score >= 17);
  const highRisks = openRisks.filter((r: any) => r.risk_score >= 10 && r.risk_score < 17);
  const pendingApprovals = approvals.filter((a: any) => a.status === "pending");
  const overdueTasks = tasks.filter((t: any) => t.end_date && new Date(t.end_date) < new Date() && t.status !== "completed" && t.status !== "verified" && t.status !== "approved");
  const dueSoonTasks = tasks.filter((t: any) => {
    if (!t.end_date) return false;
    const d = new Date(t.end_date); const now = new Date();
    now.setHours(0,0,0,0); const dd = new Date(d); dd.setHours(0,0,0,0);
    const diff = (dd.getTime() - now.getTime()) / (1000*60*60*24);
    return diff >= 0 && diff <= 7 && t.status !== "completed" && t.status !== "verified" && t.status !== "approved";
  });
  const evidencePending = evidence.filter((e: any) => e.verification_status === "pending" || e.verification_status === "correction_requested");

  const overallProgress = activeProjects.length > 0 ? Math.round(activeProjects.reduce((s, p) => s + (p.progress || 0), 0) / activeProjects.length) : 0;

  // --- PROJECT HEALTH ---
  const getProjectRisks = (pid: string) => risks.filter((r: any) => r.project_id === pid && r.status === "open");
  const getProjectOverdue = (pid: string) => tasks.filter((t: any) => t.project_id === pid && t.end_date && new Date(t.end_date) < new Date() && t.status !== "completed" && t.status !== "verified" && t.status !== "approved");
  const getProjectPendingApprovals = (pid: string) => approvals.filter((a: any) => a.project_id === pid && a.status === "pending");
  const getProjectProgress = (pid: string) => { const projs = projects.filter((p: any) => p.id === pid); return projs.length > 0 ? (projs[0].progress || 0) : 0; };
  const getProjectHealth = (pid: string) => { const projs = projects.filter((p: any) => p.id === pid); return projs.length > 0 ? projs[0].health : "green"; };

  const getLatestActivity = (pid: string) => {
    const logs = activityLogs.filter((l: any) => l.project_id === pid);
    if (logs.length === 0) return null;
    return logs[0];
  };

  // --- UPCOMING & OVERDUE ---
  const upcomingOverdue = tasks
    .filter((t: any) => t.end_date && t.status !== "completed" && t.status !== "verified" && t.status !== "approved")
    .map((t: any) => { const d = new Date(t.end_date); const now = new Date(); now.setHours(0,0,0,0); const dd = new Date(d); dd.setHours(0,0,0,0); const diff = Math.ceil((dd.getTime() - now.getTime()) / (1000*60*60*24)); return { ...t, daysUntil: diff }; })
    .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
    .slice(0, 8);

  // --- ATTENTION ITEMS ---
  const attentionItems = [
    ...overdueTasks.slice(0, 3).map((t: any) => ({ type: "overdue", label: t.task_title || "Task", reason: "Overdue", date: t.end_date, navigate: `/projects/${t.project_id}/tasks` })),
    ...criticalRisks.slice(0, 2).map((r: any) => ({ type: "risk", label: r.risk_title || "Risk", reason: "Critical risk", date: r.due_date, navigate: `/projects/${r.project_id}/risks` })),
    ...pendingApprovals.slice(0, 3).map((a: any) => ({ type: "approval", label: a.title || "Approval", reason: "Awaiting decision", date: a.requested_at, navigate: `/projects/${a.project_id}/approvals` })),
    ...evidencePending.slice(0, 2).map((e: any) => ({ type: "evidence", label: e.title || "Evidence", reason: "Awaiting verification", date: e.created_at, navigate: `/projects/${e.project_id}/evidence` })),
    ...procurement.filter((p: any) => {
      const s = p.status;
      const pr = p.priority;
      return (s === "pending" || s === "review" || s === "quotations") && (pr === "critical" || pr === "high");
    }).slice(0, 2).map((p: any) => ({ type: "procurement", label: p.title || "Procurement", reason: `${p.priority} priority`, date: p.expected_delivery_date || p.created_at, navigate: `/projects/${p.project_id}/procurement` })),
  ].sort((a: any, b: any) => (a.date ? new Date(a.date).getTime() : 0) - (b.date ? new Date(b.date).getTime() : 0));

  // --- PM INTELLIGENCE ---
  const pmOverdueCount = overdueTasks.length;
  const pmCriticalRisks = criticalRisks.length;
  const pmPendingApprovals = pendingApprovals.length;
  const pmEvidenceGaps = evidencePending.length;
  const pmTasksDueSoon = dueSoonTasks.length;

  // --- FORMATTERS ---
  const formatDate = (s: string | null | undefined) => {
    if (!s) return "—";
    const d = new Date(s);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getDaysUntil = (s: string | null | undefined) => {
    if (!s) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(s); target.setHours(0,0,0,0);
    if (isNaN(target.getTime())) return null;
    return Math.ceil((target.getTime() - today.getTime()) / (1000*60*60*24));
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  // --- HELPERS ---
  const healthColor = (h: string) => h === "green" ? "#10B981" : h === "amber" ? "#F59E0B" : "#DC2626";
  const healthLabel = (h: string) => h === "green" ? "Healthy" : h === "amber" ? "Attention" : "Critical";

  const renderHealth = (h: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: healthColor(h), flexShrink: 0 }} />
      <span style={{ fontSize: "12px", fontWeight: 600, color: healthColor(h) }}>{healthLabel(h)}</span>
    </div>
  );

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
            <span style={styles.greetingRole}>{profile?.role === "project_manager" ? "PM" : profile?.role === "admin" ? "Admin" : "Member"}</span>
            <span>{getGreeting()},</span>
            <strong>{user?.full_name || "User"}</strong>
          </div>
          {projects.length > 1 && (
            <div style={styles.projectSelector}>
              <span style={styles.selectorLabel}>Project:</span>
              <select style={styles.select} value={currentProject?.id || ""} onChange={(e) => { const p = projects.find((x: any) => x.id === e.target.value); if (p) setCurrentProject(p); }}>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.project_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* KPI CARDS */}
      <section style={styles.kpiSection}>
        <div style={styles.kpiGrid}>
          <StatCard title="Active Projects" value={activeProjects.length} color="#1F2937" subtitle={`${projects.length} total`} />
          <StatCard title="Overall Progress" value={`${overallProgress}%`} color="#3B82F6" />
          <StatCard title="Open Risks" value={openRisks.length} color="#EF4444" subtitle={criticalRisks.length > 0 ? `${criticalRisks.length} critical` : ""} />
          <StatCard title="Pending Approvals" value={pendingApprovals.length} color="#8B5CF6" />
          <StatCard title="Tasks Due Soon" value={dueSoonTasks.length} color="#F59E0B" />
          <StatCard title="Overdue Tasks" value={overdueTasks.length} color="#DC2626" />
          <StatCard title="Evidence Pending" value={evidencePending.length} color="#EC4899" />
        </div>
      </section>

      {/* PROJECT HEALTH GRID */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Project Health</h3>
        {projects.length > 0 ? (
          <div style={styles.projectGrid}>
            {projects.slice(0, 6).map((p: any) => {
              const pRisks = getProjectRisks(p.id);
              const pOverdue = getProjectOverdue(p.id);
              const pPending = getProjectPendingApprovals(p.id);
              const pProgress = getProjectProgress(p.id);
              const pHealth = getProjectHealth(p.id);
              const latest = getLatestActivity(p.id);
              return (
                <div key={p.id} style={styles.projectCard} onClick={() => navigate(`/projects/${p.id}`)}>
                  <div style={styles.projectCardHeader}>
                    <div style={styles.projectCardName}>{p.project_name}</div>
                    {renderHealth(pHealth)}
                  </div>
                  <div style={styles.projectCardBody}>
                    <div style={styles.projectMetric}>
                      <span style={styles.projectMetricLabel}>Progress</span>
                      <div style={styles.miniProgressBg}><div style={{ ...styles.miniProgressFill, width: `${pProgress}%`, background: healthColor(pHealth) }} /></div>
                      <span style={styles.projectMetricValue}>{pProgress}%</span>
                    </div>
                    <div style={styles.projectMetricsRow}>
                      <span style={styles.projectMetricSmall}>{pRisks.length} risks</span>
                      <span style={styles.projectMetricSmall}>{pOverdue.length} overdue</span>
                      <span style={styles.projectMetricSmall}>{pPending.length} pending</span>
                    </div>
                    {latest && (
                      <div style={styles.projectLatestActivity}>
                        <span style={styles.projectLatestLabel}>Latest:</span>
                        <span style={styles.projectLatestText}>{latest.action?.replace(/_/g, " ") || "Activity"}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No projects yet" message="Projects will appear here once they are created." />
        )}
      </section>

      {/* ATTENTION REQUIRED */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Attention Required</h3>
        {attentionItems.length > 0 ? (
          <div style={styles.attentionList}>
            {attentionItems.map((item, i) => (
              <div key={i} style={styles.attentionItem} onClick={() => item.navigate && navigate(item.navigate)}>
                <div style={{ ...styles.attentionDot, background: item.type === "overdue" ? "#DC2626" : item.type === "risk" ? "#EF4444" : item.type === "approval" ? "#8B5CF6" : item.type === "evidence" ? "#EC4899" : item.type === "procurement" ? "#F59E0B" : "#3B82F6" }} />
                <div style={styles.attentionContent}>
                  <p style={styles.attentionLabel}>{item.label}</p>
                  <p style={styles.attentionReason}>{item.reason}</p>
                </div>
                <span style={styles.attentionDate}>{item.type === "overdue" ? "Overdue" : item.type === "risk" ? "At risk" : "Pending"}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>Nothing requiring immediate attention.</p>
          </div>
        )}
      </section>

      <div style={styles.twoColumn}>
        {/* PROJECT PROGRESS */}
        <section style={styles.panel}>
          <h3 style={styles.panelTitle}>Project Progress</h3>
          {currentProject ? (
            <div>
              <div style={styles.progressBarContainer}>
                <div style={styles.progressBarBg}><div style={{ ...styles.progressBarFill, width: `${currentProject.progress || 0}%`, background: healthColor(currentProject.health || "green") }} /></div>
                <div style={styles.progressLabels}><span>0%</span><span style={{ color: "#6B7280" }}>{Math.round(currentProject.progress || 0)}%</span><span>100%</span></div>
              </div>
              <p style={styles.progressNote}>
                {currentProject.project_name} &bull; {formatDate(currentProject.start_date)} &mdash; {formatDate(currentProject.end_date)}
              </p>
            </div>
          ) : (
            <EmptyState title="No active project" message="Select a project to view progress." />
          )}
        </section>

        {/* UPCOMING & OVERDUE */}
        <section style={styles.panel}>
          <h3 style={styles.panelTitle}>Upcoming & Overdue</h3>
          {upcomingOverdue.length > 0 ? (
            <div style={styles.upcomingList}>
              {upcomingOverdue.map((t: any) => {
                const days = t.daysUntil;
                const isOverdue = days !== null && days < 0;
                const isToday = days !== null && days === 0;
                return (
                  <div key={t.id} style={styles.upcomingItem} onClick={() => navigate(`/projects/${t.project_id}/tasks`)}>
                    <div style={{ ...styles.upcomingDate, background: isOverdue ? "#DC2626" : isToday ? "#F59E0B" : "#0D3B2E" }}>
                      <span style={styles.upcomingDay}>{isOverdue ? `${Math.abs(days)}d` : days === 0 ? "Today" : `${days}d`}</span>
                    </div>
                    <div style={styles.upcomingContent}>
                      <p style={styles.upcomingTitle}>{t.task_title}</p>
                      <p style={styles.upcomingMeta}>
                        <StatusBadge status={t.status} />
                        {isOverdue && <span style={{ color: "#DC2626", fontSize: "11px", fontWeight: 600 }}> OVERDUE</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No upcoming deadlines" message="Tasks will appear here once they are scheduled." />
          )}
        </section>
      </div>

      {/* RECENT ACTIVITY */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Recent Activity</h3>
        {activityLogs.length > 0 ? (
          <div style={styles.activityList}>
            {activityLogs.slice(0, 10).map((log: any, i: number) => (
              <div key={log.id || i} style={styles.activityItem}>
                <div style={styles.activityIcon}>
                  {log.action === "task_created" ? "+" : log.action === "task_updated" ? "~" : log.action === "status_changed" ? "=" : log.action === "approval" ? "A" : log.action?.charAt(0).toUpperCase() || "."}
                </div>
                <div style={styles.activityContent}>
                  <p style={styles.activityText}>
                    {log.action?.replace(/_/g, " ") || "Activity"}
                    {log.entity_type ? ` on ${log.entity_type}` : ""}
                    {log.description ? ` — ${log.description}` : ""}
                  </p>
                  <span style={styles.activityTime}>{formatDate(log.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No recent activity" message="Activity will be recorded here once work begins." />
        )}
      </section>

      {/* PM INTELLIGENCE */}
      {isPM && (
        <section style={styles.pmSection}>
          <h3 style={styles.panelTitle}>PM Operational Intelligence</h3>
          <div style={styles.pmGrid}>
            <div style={styles.pmCard}>
              <p style={styles.pmLabel}>Overdue Work</p>
              <p style={styles.pmValue}>{pmOverdueCount} overdue tasks</p>
            </div>
            <div style={styles.pmCard}>
              <p style={styles.pmLabel}>Risks Requiring Attention</p>
              <p style={styles.pmValue}>{pmCriticalRisks} critical, {highRisks.length} high</p>
            </div>
            <div style={styles.pmCard}>
              <p style={styles.pmLabel}>Approvals Waiting</p>
              <p style={styles.pmValue}>{pmPendingApprovals} pending</p>
            </div>
            <div style={styles.pmCard}>
              <p style={styles.pmLabel}>Evidence Gaps</p>
              <p style={styles.pmValue}>{pmEvidenceGaps} pending verification</p>
            </div>
            <div style={styles.pmCard}>
              <p style={styles.pmLabel}>Tasks Due Soon</p>
              <p style={styles.pmValue}>{pmTasksDueSoon} within 7 days</p>
            </div>
            <div style={styles.pmCard}>
              <p style={styles.pmLabel}>Active Progress</p>
              <p style={styles.pmValue}>{overallProgress}% overall</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
<<<<<<< ours
  container: { padding: "24px", maxWidth: "1400px", margin: "0 auto", background: "#F9FAFB", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", paddingBottom: "16px", borderBottom: "1px solid #E5E7EB" },
  headerLeft: { display: "flex", flexDirection: "column", gap: "2px" },
  brand: { display: "flex", alignItems: "baseline", gap: "4px" },
  logo: { fontSize: "26px", fontWeight: "700", color: "#0D3B2E", letterSpacing: "-0.02em" },
  logoAccent: { fontSize: "26px", fontWeight: "700", color: "#F59E0B" },
  subtitle: { fontSize: "13px", color: "#6B7280", margin: 0, fontWeight: 400 },
  headerRight: { display: "flex", alignItems: "center", gap: "20px" },
  greeting: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" },
  greetingRole: { fontSize: "10px", fontWeight: 700, color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.08em" },
  projectSelector: { display: "flex", alignItems: "center", gap: "8px" },
  selectorLabel: { fontSize: "12px", color: "#6B7280" },
  select: { padding: "6px 10px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "13px", background: "white", minWidth: "180px" },
  kpiSection: { marginBottom: "28px" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px" },
  section: { marginBottom: "28px" },
  sectionTitle: { fontSize: "15px", fontWeight: "600", color: "#1F2937", margin: "0 0 16px" },
  projectGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" },
  projectCard: { background: "white", borderRadius: "10px", border: "1px solid #E5E7EB", padding: "16px", cursor: "pointer", transition: "box-shadow 0.15s", textDecoration: "none", color: "inherit" },
  projectCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" },
  projectCardName: { fontSize: "14px", fontWeight: "600", color: "#1F2937", flex: 1, marginRight: "8px" },
  projectCardBody: { display: "flex", flexDirection: "column", gap: "8px" },
  projectMetric: { display: "flex", alignItems: "center", gap: "8px" },
  projectMetricLabel: { fontSize: "11px", color: "#9CA3AF", minWidth: "50px" },
  miniProgressBg: { flex: 1, height: "6px", background: "#E5E7EB", borderRadius: "3px", overflow: "hidden" },
  miniProgressFill: { height: "100%", borderRadius: "3px" },
  projectMetricValue: { fontSize: "12px", fontWeight: "600", color: "#374151", minWidth: "32px", textAlign: "right" as const },
  projectMetricsRow: { display: "flex", gap: "12px" },
  projectMetricSmall: { fontSize: "11px", color: "#6B7280" },
  projectLatestActivity: { display: "flex", gap: "4px", marginTop: "4px" },
  projectLatestLabel: { fontSize: "10px", color: "#9CA3AF" },
  projectLatestText: { fontSize: "11px", color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  attentionList: { display: "flex", flexDirection: "column", gap: "8px" },
  attentionItem: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "white", borderRadius: "8px", border: "1px solid #E5E7EB", cursor: "pointer" },
  attentionDot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
=======
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
>>>>>>> theirs
  attentionContent: { flex: 1, minWidth: 0 },
  attentionLabel: { fontSize: "13px", fontWeight: 600, color: "#1F2937", margin: "0 0 2px", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  attentionReason: { fontSize: "12px", color: "#6B7280", margin: 0 },
  attentionDate: { fontSize: "11px", fontWeight: 600, color: "#DC2626", whiteSpace: "nowrap" as const, padding: "2px 8px", background: "#FEF2F2", borderRadius: "4px" } as React.CSSProperties,
  emptyState: { padding: "32px 24px", textAlign: "center" as const, color: "#9CA3AF", background: "white", borderRadius: "8px", border: "1px dashed #D1D5DB" },
  twoColumn: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "28px" },
  panel: { background: "white", borderRadius: "10px", border: "1px solid #E5E7EB", padding: "20px", minHeight: "240px" },
  panelTitle: { fontSize: "14px", fontWeight: "600", color: "#1F2937", margin: "0 0 16px" },
  progressBarContainer: { display: "flex", flexDirection: "column", gap: "6px" },
  progressBarBg: { height: "10px", background: "#E5E7EB", borderRadius: "5px", overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: "5px", transition: "width 0.3s ease" },
  progressLabels: { display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#9CA3AF" },
  progressNote: { fontSize: "12px", color: "#6B7280", margin: "8px 0 0" },
  upcomingList: { display: "flex", flexDirection: "column", gap: "8px" },
  upcomingItem: { display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "white", borderRadius: "8px", border: "1px solid #E5E7EB", cursor: "pointer" },
  upcomingDate: { display: "flex", alignItems: "center", justifyContent: "center", color: "white", padding: "6px 10px", borderRadius: "6px", minWidth: "44px", height: "44px", textAlign: "center" as const },
  upcomingDay: { fontSize: "14px", fontWeight: "700", lineHeight: 1.2 },
  upcomingContent: { flex: 1 },
  upcomingTitle: { fontSize: "13px", fontWeight: 500, color: "#1F2937", margin: "0 0 2px", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  upcomingMeta: { fontSize: "11px", color: "#6B7280", margin: 0, display: "flex", alignItems: "center", gap: "6px" } as React.CSSProperties,
  activityList: { display: "flex", flexDirection: "column", gap: "8px" },
  activityItem: { display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 14px", background: "white", borderRadius: "8px", border: "1px solid #E5E7EB" },
  activityIcon: { width: "28px", height: "28px", borderRadius: "6px", background: "#EFF6FF", color: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 },
  activityContent: { flex: 1 },
  activityText: { fontSize: "12px", color: "#374151", margin: "0 0 3px", lineHeight: 1.4 },
  activityTime: { fontSize: "10px", color: "#9CA3AF" },
  pmSection: { background: "#FEF3C7", borderRadius: "10px", border: "1px solid #FCD34D", padding: "20px", marginTop: "4px" },
  pmGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" },
  pmCard: { background: "white", borderRadius: "8px", border: "1px solid #FDE68A", padding: "12px" },
  pmLabel: { fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.05em", margin: "0 0 4px" },
  pmValue: { fontSize: "13px", fontWeight: 600, color: "#374151", margin: 0 },
};

export default Dashboard;