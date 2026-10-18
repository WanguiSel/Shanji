import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card, StatCard } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { useToast } from "../../hooks/useToast";
import type { Expense, Budget, Payment, Fund, FinanceApproval } from "../../types";

const EXPENSE_CATEGORIES = [
  "Transport", "Accommodation", "Meals", "Equipment", "Materials",
  "Labour", "Procurement", "Communication", "Other",
];

function FinancePage() {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreatePayment, setShowCreatePayment] = useState(false);
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
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payExpenseId, setPayExpenseId] = useState("");
  const [paySupplierId, setPaySupplierId] = useState("");
  const [funds, setFunds] = useState<Fund[]>([]);
  const [approvals, setApprovals] = useState<FinanceApproval[]>([]);
  const [showCreateFund, setShowCreateFund] = useState(false);
  const [showFinanceApprove, setShowFinanceApprove] = useState<string | null>(null);
  const [fundSource, setFundSource] = useState("");
  const [fundType, setFundType] = useState("capital");
  const [fundAmount, setFundAmount] = useState("");
  const [fundCurrency, setFundCurrency] = useState("KES");
  const [fundDate, setFundDate] = useState("");
  const [fundRef, setFundRef] = useState("");
  const [fundDoc, setFundDoc] = useState("");
  const [fundDesc, setFundDesc] = useState("");
  const [fundStatus, setFundStatus] = useState("received");
  const { toasts, showToast } = useToast();

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    if (!id) return;
    setError(null);
    try {
      const [expR, budR, payR, fundR, appR] = await Promise.all([
        supabase.from("expenses").select("*").eq("project_id", id).order("created_at", { ascending: false }),
        supabase.from("budgets").select("*").eq("project_id", id),
        supabase.from("payments").select("*").eq("project_id", id).order("created_at", { ascending: false }),
        supabase.from("funds").select("*").eq("project_id", id).order("date_received", { ascending: false }),
        supabase.from("finance_approvals").select("*").eq("project_id", id).order("submitted_at", { ascending: false }),
      ]);
      setExpenses((expR.data || []) as Expense[]);
      setBudgets((budR.data || []) as Budget[]);
      setPayments((payR.data || []) as Payment[]);
      setFunds((fundR.data || []) as Fund[]);
      setApprovals((appR.data || []) as FinanceApproval[]);
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

  async function createPayment() {
    if (!id || !payAmount || !payMethod || !payDate) return;
    const { data, error } = await supabase.from("payments").insert({
      project_id: id,
      expense_id: payExpenseId || null,
      supplier_id: paySupplierId || null,
      amount: parseFloat(payAmount),
      currency: "KES",
      payment_method: payMethod,
      payment_date: payDate,
      reference_number: payReference || null,
      status: "completed",
    }).select().single();
    if (!error) {
      showToast("success", "Payment recorded");
      await logActivity("payment_created", `Payment "${data.reference_number || data.id}" of ${data.amount} ${data.currency} recorded`, "payment", data.id);
      setShowCreatePayment(false);
      resetPaymentForm();
      loadData();
    } else {
      showToast("error", "Failed to record payment");
    }
  }

  async function updatePaymentStatus(paymentId: string, status: string) {
    const { error } = await supabase.from("payments").update({
      status,
    }).eq("id", paymentId);
    if (!error) {
      showToast("success", `Payment ${status}`);
      await logActivity("payment_updated", `Payment ${status}`, "payment", paymentId);
      loadData();
    } else {
      showToast("error", "Failed to update payment");
    }
  }

  function resetPaymentForm() {
    setPayAmount(""); setPayMethod(""); setPayDate("");
    setPayReference(""); setPayExpenseId(""); setPaySupplierId("");
  }

  async function createFund() {
    if (!id || !fundSource.trim() || !fundAmount) return;
    const { data, error } = await supabase.from("funds").insert({
      project_id: id,
      source: fundSource.trim(),
      funding_type: fundType,
      amount: parseFloat(fundAmount),
      currency: fundCurrency,
      date_received: fundDate || new Date().toISOString().split("T")[0],
      reference: fundRef || null,
      document_path: fundDoc || null,
      status: fundStatus,
      description: fundDesc || null,
      created_by: user?.id || "",
    }).select().single();
    if (!error) {
      showToast("success", "Fund recorded");
      await logActivity("fund_received", `Fund "${fundSource.trim()}" of ${fundCurrency || "KES"} ${parseFloat(fundAmount).toLocaleString()} received`, "fund", data.id);
      setShowCreateFund(false);
      resetFundForm();
      loadData();
    } else {
      showToast("error", "Failed to record fund");
    }
  }

  function resetFundForm() {
    setFundSource(""); setFundType("capital"); setFundAmount("");
    setFundCurrency("KES"); setFundDate(""); setFundRef("");
    setFundDoc(""); setFundDesc(""); setFundStatus("received");
  }

  async function approveFinanceApproval(approvalId: string, approve: boolean) {
    const { error } = await supabase.from("finance_approvals").update({
      status: approve ? "approved" : "rejected",
      approver_id: user?.id,
      comment: approveComment,
      decided_at: new Date().toISOString(),
    }).eq("id", approvalId);
    if (!error) {
      showToast("success", approve ? "Finance approval granted" : "Finance approval rejected");
      await logActivity(approve ? "finance_approved" : "finance_rejected", `Finance ${approve ? "approved" : "rejected"}`, "finance_approval", approvalId);
      setShowFinanceApprove(null);
      setApproveComment("");
      loadData();
    } else {
      showToast("error", "Failed to update approval");
    }
  }

  function resetForm() {
    setFormTitle(""); setFormCategory("Other"); setFormAmount("");
    setFormCurrency("KES"); setFormDate(""); setFormDesc("");
    setFormReceipt(""); setFormTaskId("");
  }

  const totalBudget = budgets.reduce((s, b) => s + (b.amount || 0), 0);
  const totalSpent = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalFunds = funds.reduce((s, f) => s + (f.amount || 0), 0);
  const remaining = totalBudget - totalSpent;
  const pendingExpenses = expenses.filter((e) => e.approval_status === "pending");
  const approvedExpenses = expenses.filter((e) => e.approval_status === "approved");
  const rejectedExpenses = expenses.filter((e) => e.approval_status === "rejected");
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const completedPayments = payments.filter((p) => p.status === "completed");
  const failedPayments = payments.filter((p) => p.status === "failed");
  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const approvedApprovals = approvals.filter((a) => a.status === "approved");
  const rejectedApprovals = approvals.filter((a) => a.status === "rejected");
  const openFunds = funds.filter((f) => f.status === "received");
  const reconciledFunds = funds.filter((f) => f.status === "reconciled");
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
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Expense</button>
            <button className="btn btn-secondary" onClick={() => setShowCreatePayment(true)}>Record Payment</button>
            <button className="btn btn-secondary" onClick={() => setShowCreateFund(true)}>Receive Fund</button>
          </div>
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
        <StatCard title="Funds" value={`${formCurrency || "KES"} ${totalFunds.toLocaleString()}`} color="#059669" />
      </div>

      <div style={{ marginTop: "24px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <StatCard title="Pending" value={pendingExpenses.length} subtitle="Awaiting approval" color="#D97706" />
        <StatCard title="Approved" value={approvedExpenses.length} subtitle="Approved expenses" color="#059669" />
        <StatCard title="Rejected" value={rejectedExpenses.length} subtitle="Rejected expenses" color="#DC2626" />
      </div>

      <div style={{ marginTop: "24px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <StatCard title="Total Paid" value={`${formCurrency || "KES"} ${totalPaid.toLocaleString()}`} color="#059669" />
        <StatCard title="Pending Payments" value={pendingPayments.length} subtitle="Awaiting processing" color="#D97706" />
        <StatCard title="Failed" value={failedPayments.length} subtitle="Failed payments" color="#DC2626" />
      </div>

      <div style={{ marginTop: "24px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <StatCard title="Budget Use %" value={totalBudget > 0 ? `${Math.min(Math.round((totalSpent / totalBudget) * 100), 100)}%` : "0%"} subtitle="Budget vs actual" color={totalBudget > 0 && (totalSpent / totalBudget) > 0.9 ? "#DC2626" : "#059669"} />
        <StatCard title="Pending Approvals" value={pendingApprovals.length} subtitle="Finance requests" color="#D97706" />
        <StatCard title="Open Funds" value={openFunds.length} subtitle="Awaiting reconciliation" color="#0D3B2E" />
        <StatCard title="Reconciled" value={reconciledFunds.length} subtitle="Funds reconciled" color="#059669" />
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

      {funds.length > 0 && (
        <div style={{ marginTop: "32px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Funds Received</h2>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Source</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {funds.map((f) => (
                  <tr key={f.id} style={styles.tr}>
                    <td style={styles.td}>{f.source}</td>
                    <td style={styles.td}>{f.funding_type}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{f.currency || "KES"} {(f.amount || 0).toLocaleString()}</td>
                    <td style={styles.td}>{f.date_received}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                        background: f.status === "reconciled" ? "#ECFDF5" : f.status === "flagged" ? "#FEF2F2" : "#F3F4F6",
                        color: f.status === "reconciled" ? "#059669" : f.status === "flagged" ? "#DC2626" : "#D97706",
                      }}>{f.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {approvals.length > 0 && (
        <div style={{ marginTop: "32px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Finance Approvals</h2>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Submitted</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.id} style={styles.tr}>
                    <td style={styles.td}>{a.type}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{a.amount ? `${formCurrency || "KES"} ${a.amount.toLocaleString()}` : "—"}</td>
                    <td style={styles.td}>{new Date(a.submitted_at).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                        background: a.status === "approved" ? "#ECFDF5" : a.status === "rejected" ? "#FEF2F2" : "#F3F4F6",
                        color: a.status === "approved" ? "#059669" : a.status === "rejected" ? "#DC2626" : "#D97706",
                      }}>{a.status}</span>
                    </td>
                    <td style={styles.td}>
                      {a.status === "pending" && (hasRole("project_manager") || hasRole("finance")) && (
                        <button className="btn btn-sm btn-secondary" onClick={() => { setShowFinanceApprove(a.id); setApproveComment(""); }}>Review</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {payments.length > 0 && (
        <div style={{ marginTop: "32px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Payments</h2>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Reference</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Method</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={styles.td}>{p.reference_number || p.id?.slice(0, 8)}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{p.currency || "KES"} {(p.amount || 0).toLocaleString()}</td>
                    <td style={styles.td}>{p.payment_method || "—"}</td>
                    <td style={styles.td}>{p.payment_date || "—"}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                        background: p.status === "completed" ? "#ECFDF5" : p.status === "failed" ? "#FEF2F2" : p.status === "refunded" ? "#FEF3C7" : "#F3F4F6",
                        color: p.status === "completed" ? "#059669" : p.status === "failed" ? "#DC2626" : p.status === "refunded" ? "#D97706" : "#D97706",
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {p.status === "pending" && (hasRole("project_manager") || hasRole("finance")) && (
                        <button className="btn btn-sm btn-secondary" onClick={() => updatePaymentStatus(p.id, "completed")}>Complete</button>
                      )}
                      {p.status === "completed" && (hasRole("project_manager") || hasRole("finance")) && (
                        <button className="btn btn-sm btn-secondary" onClick={() => updatePaymentStatus(p.id, "refunded")}>Refund</button>
                      )}
                      {(p.status === "pending" || p.status === "completed") && (hasRole("project_manager") || hasRole("finance")) && (
                        <button className="btn btn-sm btn-secondary" style={{ color: "#DC2626", borderColor: "#FECACA" }} onClick={() => updatePaymentStatus(p.id, "failed")}>Fail</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      <Modal isOpen={showCreatePayment} onClose={() => { setShowCreatePayment(false); resetPaymentForm(); }} title="Record Payment">
        <label style={styles.label}>Amount *</label>
        <input className="input" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} style={{ marginBottom: "12px" }} />
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Method *</label>
            <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} style={{ marginBottom: "12px" }}>
              <option value="">Select method</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Date *</label>
            <input type="date" className="input" value={payDate} onChange={(e) => setPayDate(e.target.value)} style={{ marginBottom: "12px" }} />
          </div>
        </div>
        <label style={styles.label}>Expense ID (optional)</label>
        <input className="input" value={payExpenseId} onChange={(e) => setPayExpenseId(e.target.value)} placeholder="Linked expense ID" style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Supplier ID (optional)</label>
        <input className="input" value={paySupplierId} onChange={(e) => setPaySupplierId(e.target.value)} placeholder="Supplier ID" style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Reference Number</label>
        <input className="input" value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="Payment reference" style={{ marginBottom: "12px" }} />
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={() => { setShowCreatePayment(false); resetPaymentForm(); }}>Cancel</button>
          <button className="btn btn-primary" onClick={createPayment}>Record Payment</button>
        </div>
      </Modal>

      <Modal isOpen={showCreateFund} onClose={() => { setShowCreateFund(false); resetFundForm(); }} title="Receive Fund">
        <label style={styles.label}>Source *</label>
        <input className="input" value={fundSource} onChange={(e) => setFundSource(e.target.value)} style={{ marginBottom: "12px" }} />
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Amount *</label>
            <input className="input" type="number" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} style={{ marginBottom: "12px" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Currency</label>
            <input className="input" value={fundCurrency} onChange={(e) => setFundCurrency(e.target.value)} style={{ marginBottom: "12px" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Type</label>
            <select className="input" value={fundType} onChange={(e) => setFundType(e.target.value)} style={{ marginBottom: "12px" }}>
              <option value="capital">Capital</option>
              <option value="grant">Grant</option>
              <option value="loan">Loan</option>
              <option value="revenue">Revenue</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Date Received</label>
            <input type="date" className="input" value={fundDate} onChange={(e) => setFundDate(e.target.value)} style={{ marginBottom: "12px" }} />
          </div>
        </div>
        <label style={styles.label}>Reference</label>
        <input className="input" value={fundRef} onChange={(e) => setFundRef(e.target.value)} placeholder="Reference number" style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Document Path</label>
        <input className="input" value={fundDoc} onChange={(e) => setFundDoc(e.target.value)} placeholder="Evidence file path" style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Description</label>
        <textarea className="input" rows={2} value={fundDesc} onChange={(e) => setFundDesc(e.target.value)} style={{ marginBottom: "12px" }} />
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={() => { setShowCreateFund(false); resetFundForm(); }}>Cancel</button>
          <button className="btn btn-primary" onClick={createFund}>Receive Fund</button>
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
