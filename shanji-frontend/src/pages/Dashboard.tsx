import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useProject } from "../contexts/ProjectContext";
import { StatCard } from "../components/Card";
import { StatusBadge } from "../components/StatusBadge";
import { Loading, EmptyState } from "../components/Loading";
import { CommandCentre } from "../features/dashboards/CommandCentres";

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
  const [expenses, setExpenses] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<any[]>([]);
  const [nearMisses, setNearMisses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [financeApprovals, setFinanceApprovals] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      const [pR, rR, tR, aR, eR, prR, acR, expR, iR, inspR, caR, nmR, payR, fR, faR, budR] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("risks").select("*").order("created_at", { ascending: false }),
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("approvals").select("*").order("created_at", { ascending: false }),
        supabase.from("evidence_records").select("*").order("created_at", { ascending: false }),
        supabase.from("procurement_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("expenses").select("*").order("created_at", { ascending: false }),
        supabase.from("incidents").select("*").order("date_occurred", { ascending: false }),
        supabase.from("inspections").select("*").order("inspection_date", { ascending: false }),
        supabase.from("corrective_actions").select("*").order("due_date", { ascending: true }),
        supabase.from("near_misses").select("*").order("report_date", { ascending: false }),
        supabase.from("payments").select("*").order("created_at", { ascending: false }),
        supabase.from("funds").select("*").order("date_received", { ascending: false }),
        supabase.from("finance_approvals").select("*").order("submitted_at", { ascending: false }),
        supabase.from("budgets").select("*").order("created_at", { ascending: false }),
      ]);
      setProjects((pR.data || []) as any[]);
      setRisks((rR.data || []) as any[]);
      setTasks((tR.data || []) as any[]);
      setApprovals((aR.data || []) as any[]);
      setEvidence((eR.data || []) as any[]);
      setProcurement((prR.data || []) as any[]);
      setActivityLogs((acR.data || []) as any[]);
      setExpenses((expR.data || []) as any[]);
      setIncidents((iR.data || []) as any[]);
      setInspections((inspR.data || []) as any[]);
      setCorrectiveActions((caR.data || []) as any[]);
      setNearMisses((nmR.data || []) as any[]);
      setPayments((payR.data || []) as any[]);
      setFunds((fR.data || []) as any[]);
      setFinanceApprovals((faR.data || []) as any[]);
      setBudgets((budR.data || []) as any[]);
    } catch (err) { console.error("Dashboard error:", err); setError(err instanceof Error ? err.message : "Failed to load dashboard"); }
    setLoading(false);
  }

  if (loading) return <Loading message="Loading Project Operations Command Centre..." />;
  if (error) return <EmptyState title="Dashboard Error" message={error} />;
  return (
    <CommandCentre
      role={user?.role || ""}
      projects={projects}
      tasks={tasks}
      risks={risks}
      approvals={approvals}
      evidence={evidence}
      procurement={procurement}
      expenses={expenses}
      payments={payments}
      funds={funds}
      budgets={budgets}
      incidents={incidents}
      inspections={inspections}
      correctiveActions={correctiveActions}
      nearMisses={nearMisses}
      financeApprovals={financeApprovals}
      activityLogs={activityLogs}
      navigate={navigate}
    />
  );

}

export default Dashboard;
