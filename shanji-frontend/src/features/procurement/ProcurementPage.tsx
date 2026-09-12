import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Loading, EmptyState } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { useToast } from "../../hooks/useToast";
import type { ProcurementRequest, Supplier } from "../../types";

function ProcurementPage() {
  const { id } = useParams<{ id: string }>();
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: '', priority: 'medium', budget_amount: '', expected_delivery_date: '', supplier_id: '' });
  const { toasts, showToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    if (!id) return;
    const { data: reqData } = await supabase.from("procurement_requests").select("*").eq("project_id", id).order("created_at", { ascending: false });
    const { data: supData } = await supabase.from("suppliers").select("*");
    setRequests((reqData || []) as ProcurementRequest[]);
    setSuppliers((supData || []) as Supplier[]);
    setLoading(false);
  }

  async function createRequest() {
    if (!id || !form.title.trim()) return;
    const { data } = await supabase.from("procurement_requests").insert({
      project_id: id,
      title: form.title.trim(),
      description: form.description || null,
      category: form.category || null,
      priority: form.priority,
      budget_amount: form.budget_amount ? Number(form.budget_amount) : null,
      expected_delivery_date: form.expected_delivery_date || null,
      supplier_id: form.supplier_id || null,
      requester_id: 'user-id',
    }).select().single();
    if (!data.error) {
      setShowModal(false);
      setForm({ title: '', description: '', category: '', priority: 'medium', budget_amount: '', expected_delivery_date: '', supplier_id: '' });
      showToast("success", "Procurement request created");
      loadData();
    }
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Procurement</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Requests, quotations, and purchase orders</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Request</button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <EmptyState title="No procurement requests" message="Create your first procurement request." />
        </Card>
      ) : (
        <div style={styles.grid}>
          {requests.map((req) => (
            <Card key={req.id}>
              <div style={styles.reqHeader}>
                <div style={{ fontWeight: 600 }}>{req.title}</div>
                <StatusBadge status={req.status} />
              </div>
              <div style={styles.reqMeta}>
                <span>Priority: {req.priority}</span>
                <span>Budget: {req.budget_amount ? `${req.currency || 'KES'} ${req.budget_amount}` : '—'}</span>
                {req.delay_days > 0 && <span style={{ color: '#DC2626' }}>⚠ Delayed {req.delay_days} days</span>}
              </div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#6B7280' }}>
                Supplier: {req.supplier_id?.slice(0, 8) || '—'} · Expected: {req.expected_delivery_date || '—'}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Procurement Request">
        <label style={styles.label}>Title *</label>
        <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ marginBottom: '12px' }} />
        <label style={styles.label}>Description</label>
        <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: '12px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={styles.label}>Category</label>
            <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
          <div>
            <label style={styles.label}>Budget Amount</label>
            <input className="input" type="number" value={form.budget_amount} onChange={(e) => setForm({ ...form, budget_amount: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>Expected Delivery</label>
            <input className="input" type="date" value={form.expected_delivery_date} onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })} />
          </div>
        </div>
        <label style={{ ...styles.label, marginTop: '12px' }}>Supplier</label>
        <select className="input" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
          <option value="">Select supplier...</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.supplier_name}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={createRequest}>Create Request</button>
        </div>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' },
  reqHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  reqMeta: { display: 'flex', gap: '12px', fontSize: '13px', color: '#6B7280', marginTop: '8px', flexWrap: 'wrap' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' },
};

export default ProcurementPage;
