import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card, StatCard } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { useToast } from "../../hooks/useToast";
import type { Expense } from "../../types";

function FinancePage() {
  const { id } = useParams<{ id: string }>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    if (!id) return;
    const { data: expData } = await supabase.from("expenses").select("*").eq("project_id", id).order("created_at", { ascending: false });
    const { data: budData } = await supabase.from("budgets").select("*").eq("project_id", id);
    setExpenses((expData || []) as Expense[]);
    setBudgets(budData || []);
    setLoading(false);
  }

  async function submitExpense() {
    if (!id) return;
    const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const { data } = await supabase.from("expenses").insert({
      project_id: id,
      expense_category: 'General',
      amount: totalExp || 1000,
      currency: 'KES',
      expense_date: new Date().toISOString().split('T')[0],
      submitted_by: 'user-id',
      description: 'Expense entry',
      approval_status: 'pending',
    }).select().single();
    if (!data.error) {
      showToast("success", "Expense submitted");
      loadData();
    }
  }

  const totalBudget = budgets.reduce((s, b) => s + (b.amount || 0), 0);
  const totalSpent = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const variance = totalBudget - totalSpent;

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Finance</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Budget, expenses, and financial records</p>
        </div>
      </div>

      <div style={styles.statsRow}>
        <StatCard title="Total Budget" value={`KES ${totalBudget.toLocaleString()}`} />
        <StatCard title="Total Spent" value={`KES ${totalSpent.toLocaleString()}`} color="#DC2626" />
        <StatCard title="Variance" value={`KES ${variance.toLocaleString()}`} color={variance >= 0 ? '#059669' : '#DC2626'} />
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Budget Categories</h2>
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
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>{b.category}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                    <span>Budget: KES {b.amount.toLocaleString()}</span>
                    <span>Spent: KES {spent.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pct > 90 ? '#DC2626' : pct > 70 ? '#F59E0B' : '#059669', borderRadius: '3px' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{pct}% used</div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Expenses</h2>
        {expenses.length === 0 ? (
          <Card>
            <EmptyState title="No expenses recorded" />
          </Card>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} style={styles.tr}>
                    <td style={styles.td}>{e.expense_category || 'General'}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>KES {(e.amount || 0).toLocaleString()}</td>
                    <td style={styles.td}>{e.expense_date}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                        background: e.approval_status === 'approved' ? '#ECFDF5' : e.approval_status === 'rejected' ? '#FEF2F2' : '#F3F4F6',
                        color: e.approval_status === 'approved' ? '#059669' : e.approval_status === 'rejected' ? '#DC2626' : '#6B7280',
                      }}>
                        {e.approval_status}
                      </span>
                    </td>
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
  header: { marginBottom: '24px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  tableWrap: { background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' },
  td: { padding: '12px 16px', borderBottom: '1px solid #F3F4F6' },
  tr: { cursor: 'pointer' },
};

export default FinancePage;
