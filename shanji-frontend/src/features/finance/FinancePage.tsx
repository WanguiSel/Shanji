import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card, StatCard } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { useToast } from "../../hooks/useToast";
import type { Expense, Budget } from "../../types";

const EXPENSE_CATEGORIES = [
  "Transport", "Accommodation", "Meals", "Equipment", "Materials",
  "Labour", "Procurement", "Communication", "Other",
];

function FinancePage() {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showApprove, setShowApprove] = useState<string | null>(null);
  const [approveComment, setApproveComment] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Other");
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("KES");
  const [formDate, setFormDate] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formReceipt, setFormReceipt] = useState("");
  const [formTaskId, setFormTaskId] = useState("");
  const { toasts, showToast } = useToast();

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    if (!id) return;
    setError(null);
    try {
      const [expR, budR] = await Promise.all([
        supabase.from("expenses").select("*").eq("project_id", id).order("created_at", { ascending: false }),
        supabase.from("budgets").select("*").eq("project_id", id),
      ]);
      setExpenses((expR.data || []) as Expense[]);
      setBudgets((budR.data || []) as Budget[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }

  async function logActivity(action: string, description: string, entityType: string, entityId?: string) {
    if (!id || !user?.id) return;
    await supabase.from("activity_logs").insert({
      project_id: id, actor_id: user.id, action, entity_type: entityType,
      entity_id: entityId || null, description, metadata: {},
    }).then(({ error }) => { if (error) console.error("Activity log failed:", error); });
  }

  async function createExpense() {
    if (!id || !formTitle.trim() || !formAmount) return;
    const { data, error } = await supabase.from("expenses").insert({
      project_id: id,
      task_id: formTaskId || null,
      expense_category: formCategory,
      amount: parseFloat(formAmount),
      currency: formCurrency,
      expense_date: formDate || new Date().toISOString().split("T")[0],
      submitted_by: user?.id || "",
      description: formDesc || null,
      receipt_path: formReceipt || null,
      receipt_filename: formReceipt?.split("/").pop() || null,
      approval_status: "pending",
    }).select().single();
    if (!error) {
      showToast("success", "Expense created");
      await logActivity("expense_created", `Expense "${formTitle.trim()}" submitted for ${formCategory}`, "expense", data.id);
      setShowCreate(false);
      resetForm();
      loadData();
    } else {
      showToast("error", "Failed to create expense");
    }
  }

  async function approveExpense(expenseId: string, approve: boolean) {
    const { error } = await supabase.from("expenses").update({
      approval_status: approve ? "approved" : "rejected",
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
    }).eq("id", expenseId);
    if (!error) {
      showToast("success", approve ? "Expense approved" : "Expense rejected");
      await logActivity(approve ? "expense_approved" : "expense_rejected", `Expense ${approve ? "approved" : "rejected"}`, "expense", expenseId);
      setShowApprove(null);
      setApproveComment("");
      loadData();
    } else {
      showToast("error", "Failed to update expense");
    }
  }

  function resetForm() {
    setFormTitle(""); setFormCategory("Other"); setFormAmount("");
    setFormCurrency("KES"); setFormDate(""); setFormDesc("");
    setFormReceipt(""); setFormTaskId("");
  }

  const totalBudget = budgets.reduce((s, b) => s + (b.amount || 0), 0);
  const totalSpent = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const remaining = totalBudget - totalSpent;
  const pendingExpenses = expenses.filter((e) => e.approval_status === "pending");
  const approvedExpenses = expenses.filter((e) => e.approval_status === "approved");
  const rejectedExpenses = expenses.filter((e) => e.approval_status === "rejected");
  const categorySpending = EXPENSE_CATEGORIES.map((cat) => ({
    category: cat,
    spent: expenses.filter((e) => e.expense_category === cat).reduce((s, e) => s + (e.amount || 0), 0),
  })).filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Finance</h1>
          <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>Budget, expenses, and financial accountability</p>
        </div>
        {(hasRole("project_manager") || hasRole("finance") || hasRole("site_supervisor")) && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Expense</button>
        )}
      </div>

      {error && (
        <Card>
          <EmptyState title="Error" message={error} />
        </Card>
      )}

      <div style={styles.statsRow}>
        <StatCard title="Total Budget" value={`${formCurrency || "KES"} ${totalBudget.toLocaleString()}`} />
        <StatCard title="Total Spent" value={`${formCurrency || "KES"} ${totalSpent.toLocaleString()}`} color="#DC2626" />
        <StatCard title="Remaining" value={`${formCurrency || "KES"} ${remaining.toLocaleString()}`} color={remaining >= 0 ? "#059669" : "#DC2626"} />
      </div>

      <div style={{ marginTop: "24px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <StatCard title="Pending" value={pendingExpenses.length} subtitle="Awaiting approval" color="#D97706" />
        <StatCard title="Approved" value={approvedExpenses.length} subtitle="Approved expenses" color="#059669" />
        <StatCard title="Rejected" value={rejectedExpenses.length} subtitle="Rejected expenses" color="#DC2626" />
      </div>

      <div style={{ marginTop: "24px" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Budget Categories</h2>
        {budgets.length === 0 ? (
          <Card>
            <EmptyState title="No budgets set" message="Set up budget categories to track spending." />
          </Card>
        ) : (
          <div style={styles.grid}>
            {budgets.map((b) => {
              const spent = expenses.filter((e) => e.expense_category === b.category).reduce((s, e) => s + (e.amount || 0), 0);
              const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
              return (
                <Card key={b.id}>
                  <div style={{ fontWeight: 600, marginBottom: "8px" }}>{b.category}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "8px" }}>
                    <span>{formCurrency || "KES"} {b.amount.toLocaleString()}</span>
                    <span>{formCurrency || "KES"} {spent.toLocaleString()}</span>
                  </div>
                  <div style={{ height: "6px", background: "#E5E7EB", borderRadius: "3px" }}>
                    <div style={{
                      height: "100%", width: `${Math.min(pct, 100)}%`,
                      background: pct > 90 ? "#DC2626" : pct > 70 ? "#F59E0B" : "#059669", borderRadius: "3px",
                    }} />
                  </div>
                  <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>{pct}% used</div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {categorySpending.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Spending by Category</h2>
          <div style={styles.grid}>
            {categorySpending.map((c) => {
              const budget = budgets.find((b) => b.category === c.category);
              const pct = budget && budget.amount > 0 ? Math.round((c.spent / budget.amount) * 100) : 0;
              return (
                <Card key={c.category}>
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>{c.category}</div>
                  <div style={{ fontSize: "24px", fontWeight: 700, color: "#1F2937" }}>{formCurrency || "KES"} {c.spent.toLocaleString()}</div>
                  <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>{budget ? `${pct}% of budget` : "No budget set"}</div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: "32px" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Expenses</h2>
        {expenses.length === 0 ? (
          <Card>
            <EmptyState title="No expenses recorded" message="Create your first expense to begin tracking." />
          </Card>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} style={styles.tr}>
                    <td style={styles.td}>{e.expense_category || "Other"}</td>
                    <td style={{ ...styles.td, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description || "—"}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{formCurrency || "KES"} {(e.amount || 0).toLocaleString()}</td>
                    <td style={styles.td}>{e.expense_date}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                        background: e.approval_status === "approved" ? "#ECFDF5" : e.approval_status === "rejected" ? "#FEF2F2" : "#F3F4F6",
                        color: e.approval_status === "approved" ? "#059669" : e.approval_status === "rejected" ? "#DC2626" : "#D97706",
                      }}>
                        {e.approval_status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {e.approval_status === "pending" && (hasRole("project_manager") || hasRole("finance")) && (
                        <button className="btn btn-sm btn-secondary" onClick={() => { setShowApprove(e.id); setApproveComment(""); }}>Review</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Expense">
        <label style={styles.label}>Title *</label>
        <input className="input" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} style={{ marginBottom: "12px" }} />
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Category</label>
            <select className="input" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} style={{ marginBottom: "12px" }}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Amount *</label>
            <input className="input" type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} style={{ marginBottom: "12px" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Currency</label>
            <input className="input" value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} style={{ marginBottom: "12px" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Date</label>
            <input type="date" className="input" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={{ marginBottom: "12px" }} />
          </div>
        </div>
        <label style={styles.label}>Description</label>
        <textarea className="input" rows={2} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Task ID (optional)</label>
        <input className="input" value={formTaskId} onChange={(e) => setFormTaskId(e.target.value)} placeholder="Workplan item ID" style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Receipt Path (optional)</label>
        <input className="input" value={formReceipt} onChange={(e) => setFormReceipt(e.target.value)} placeholder="Evidence file path" style={{ marginBottom: "12px" }} />
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={createExpense}>Submit</button>
        </div>
      </Modal>

      <Modal isOpen={!!showApprove} onClose={() => setShowApprove(null)} title="Review Expense">
        <label style={styles.label}>Comment</label>
        <textarea className="input" rows={3} value={approveComment} onChange={(e) => setApproveComment(e.target.value)} style={{ marginBottom: "16px" }} />
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={() => setShowApprove(null)}>Cancel</button>
          <button className="btn btn-secondary" style={{ color: "#DC2626", borderColor: "#FECACA" }} onClick={() => showApprove && approveExpense(showApprove, false)}>Reject</button>
          <button className="btn btn-primary" onClick={() => showApprove && approveExpense(showApprove, true)}>Approve</button>
        </div>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" },
  tableWrap: { background: "white", borderRadius: "8px", border: "1px solid #E5E7EB", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  th: { padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" },
  td: { padding: "12px 16px", borderBottom: "1px solid #F3F4F6" },
  tr: { cursor: "pointer" },
  label: { fontSize: "13px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" },
};

export default FinancePage;
