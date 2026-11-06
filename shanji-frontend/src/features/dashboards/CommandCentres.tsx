import { StatCard } from "../../components/Card";
import { EmptyState } from "../../components/Loading";

export interface CommandCentreProps {
  role: string;
  projects: any[];
  tasks: any[];
  risks: any[];
  approvals: any[];
  evidence: any[];
  procurement: any[];
  expenses: any[];
  payments: any[];
  funds: any[];
  budgets: any[];
  incidents: any[];
  inspections: any[];
  correctiveActions: any[];
  nearMisses: any[];
  financeApprovals: any[];
  activityLogs: any[];
  navigate: (path: string) => void;
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div style={{ marginTop: "24px" }}>
      <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>{title}</h2>
      {children}
    </div>
  );
}

export function CommandCentre(props: CommandCentreProps) {
  const { role } = props;
  switch (role) {
    case "finance":
      return <FinanceCentre {...props} />;
    case "procurement":
      return <ProcurementCentre {...props} />;
    case "ohs":
      return <OHSCentre {...props} />;
    case "site_supervisor":
      return <SiteCentre {...props} />;
    case "me":
      return <MECentre {...props} />;
    case "project_assistant":
      return <AssistantCentre {...props} />;
    case "admin":
    case "ceo":
    case "director":
      return <ExecutiveCentre {...props} />;
    default:
      return <PMCentre {...props} />;
  }
}

function PMCentre(p: CommandCentreProps) {
  const overdue = p.tasks.filter((t) => t.status !== "completed" && t.due_date && new Date(t.due_date) < new Date()).length;
  return (
    <>
      <h1>Project Manager Command Centre</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginTop: "16px" }}>
        <StatCard title="Projects" value={p.projects.length} />
        <StatCard title="Open Tasks" value={p.tasks.filter((t) => t.status !== "completed").length} />
        <StatCard title="Overdue" value={overdue} color="#DC2626" />
        <StatCard title="Pending Approvals" value={p.approvals.filter((a) => a.status === "pending").length} />
      </div>
      <Section title="Quick Actions">
        <button className="btn btn-primary" onClick={() => p.navigate("/tasks")}>Manage Tasks</button>{" "}
        <button className="btn btn-secondary" onClick={() => p.navigate("/approvals")}>Review Approvals</button>{" "}
        <button className="btn btn-secondary" onClick={() => p.navigate("/finance")}>Finance</button>
      </Section>
      <Section title="Recent Activity">
        {p.activityLogs.length === 0 ? <EmptyState title="No activity" /> : <ul>{p.activityLogs.slice(0,5).map((a:any)=><li key={a.id}>{a.description || a.action}</li>)}</ul>}
      </Section>
    </>
  );
}

function AssistantCentre(p: CommandCentreProps) {
  return (
    <>
      <h1>Assistant PM Command Centre</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginTop: "16px" }}>
        <StatCard title="Projects" value={p.projects.length} />
        <StatCard title="My Tasks" value={p.tasks.filter((t) => t.status !== "completed").length} />
        <StatCard title="Evidence Pending" value={p.evidence.filter((e) => e.verification_status === "pending").length} />
        <StatCard title="Risks" value={p.risks.length} />
      </div>
      <Section title="Quick Actions">
        <button className="btn btn-primary" onClick={() => p.navigate("/tasks")}>Tasks</button>{" "}
        <button className="btn btn-secondary" onClick={() => p.navigate("/evidence")}>Evidence</button>{" "}
        <button className="btn btn-secondary" onClick={() => p.navigate("/procurement")}>Procurement</button>
      </Section>
    </>
  );
}

function SiteCentre(p: CommandCentreProps) {
  return (
    <>
      <h1>Site Supervisor Command Centre</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginTop: "16px" }}>
        <StatCard title="Site Tasks" value={p.tasks.filter((t) => t.status !== "completed").length} />
        <StatCard title="Evidence" value={p.evidence.length} />
        <StatCard title="Incidents" value={p.incidents.length} color="#DC2626" />
        <StatCard title="Inspections" value={p.inspections.length} />
      </div>
      <Section title="Quick Actions">
        <button className="btn btn-primary" onClick={() => p.navigate("/site")}>Site Reports</button>{" "}
        <button className="btn btn-secondary" onClick={() => p.navigate("/evidence")}>Upload Evidence</button>{" "}
        <button className="btn btn-secondary" onClick={() => p.navigate("/hseq")}>HSEQ</button>
      </Section>
    </>
  );
}

function FinanceCentre(p: CommandCentreProps) {
  const totalBudget = p.budgets.reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalSpent = p.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  return (
    <>
      <h1>Finance Officer Command Centre</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginTop: "16px" }}>
        <StatCard title="Budget" value={totalBudget.toLocaleString()} />
        <StatCard title="Spent" value={totalSpent.toLocaleString()} color="#DC2626" />
        <StatCard title="Pending Expenses" value={p.expenses.filter((e) => (e.approval_status || e.status) === "pending").length} />
        <StatCard title="Payments" value={p.payments.length} />
      </div>
      <Section title="Quick Actions">
        <button className="btn btn-primary" onClick={() => p.navigate("/finance")}>Finance</button>{" "}
        <button className="btn btn-secondary" onClick={() => p.navigate("/reports")}>Reports</button>
      </Section>
    </>
  );
}

function ProcurementCentre(p: CommandCentreProps) {
  return (
    <>
      <h1>Procurement Officer Command Centre</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginTop: "16px" }}>
        <StatCard title="Requests" value={p.procurement.length} />
        <StatCard title="Pending" value={p.procurement.filter((r) => r.status === "pending").length} />
        <StatCard title="Approved" value={p.procurement.filter((r) => r.status === "approved").length} />
        <StatCard title="Projects" value={p.projects.length} />
      </div>
      <Section title="Quick Actions">
        <button className="btn btn-primary" onClick={() => p.navigate("/procurement")}>Procurement</button>
      </Section>
    </>
  );
}

function OHSCentre(p: CommandCentreProps) {
  return (
    <>
      <h1>OHS Officer Command Centre</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginTop: "16px" }}>
        <StatCard title="Incidents" value={p.incidents.length} color="#DC2626" />
        <StatCard title="Inspections" value={p.inspections.length} />
        <StatCard title="Corrective Actions" value={p.correctiveActions.length} />
        <StatCard title="Near Misses" value={p.nearMisses.length} />
      </div>
      <Section title="Quick Actions">
        <button className="btn btn-primary" onClick={() => p.navigate("/hseq")}>HSEQ</button>
      </Section>
    </>
  );
}

function MECentre(p: CommandCentreProps) {
  const completed = p.tasks.filter((t) => t.status === "completed").length;
  const total = p.tasks.length || 1;
  return (
    <>
      <h1>M&E Officer Command Centre</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginTop: "16px" }}>
        <StatCard title="Tasks" value={p.tasks.length} />
        <StatCard title="Completed" value={completed} />
        <StatCard title="Completion %" value={`${Math.round((completed / total) * 100)}%`} />
        <StatCard title="Evidence" value={p.evidence.length} />
      </div>
      <Section title="Quick Actions">
        <button className="btn btn-primary" onClick={() => p.navigate("/reports")}>Reports</button>{" "}
        <button className="btn btn-secondary" onClick={() => p.navigate("/evidence")}>Evidence</button>
      </Section>
    </>
  );
}

function ExecutiveCentre(p: CommandCentreProps) {
  return (
    <>
      <h1>Executive Command Centre</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginTop: "16px" }}>
        <StatCard title="Projects" value={p.projects.length} />
        <StatCard title="Risks" value={p.risks.length} />
        <StatCard title="Pending Approvals" value={p.approvals.filter((a) => a.status === "pending").length} />
        <StatCard title="Finance Approvals" value={p.financeApprovals.filter((a) => a.status === "pending").length} />
      </div>
      <Section title="Quick Actions">
        <button className="btn btn-primary" onClick={() => p.navigate("/reports")}>Reports</button>{" "}
        <button className="btn btn-secondary" onClick={() => p.navigate("/approvals")}>Approvals</button>
      </Section>
    </>
  );
}
export default CommandCentre;