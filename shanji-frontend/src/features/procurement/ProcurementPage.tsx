import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import type { ProcurementRequest, Supplier, Quotation, PurchaseOrder, ActivityLog } from "../../types";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Loading, EmptyState } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { useToast } from "../../hooks/useToast";

function ProcurementPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "quotations" | "orders">("requests");
  const [form, setForm] = useState({ title: "", description: "", category: "", priority: "medium", budget_amount: "", expected_delivery_date: "", supplier_id: "" });
  const { toasts, showToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    if (!id) return;
    try {
      const { data: reqData } = await supabase.from("procurement_requests").select("*").eq("project_id", id).order("created_at", { ascending: false });
      const { data: supData } = await supabase.from("suppliers").select("*").order("supplier_name", { ascending: true });
      const { data: quotData } = await supabase.from("quotations").select("*").eq("procurement_request_id", id).order("created_at", { ascending: false });
      const { data: poData } = await supabase.from("purchase_orders").select("*").eq("procurement_request_id", id).order("created_at", { ascending: false });
      setRequests((reqData || []) as ProcurementRequest[]);
      setSuppliers((supData || []) as Supplier[]);
      setQuotations((quotData || []) as Quotation[]);
      setPurchaseOrders((poData || []) as PurchaseOrder[]);
    } catch (e) {
      setError("Failed to load procurement data");
    } finally {
      setLoading(false);
    }
  }

  async function logActivity(action: string, description: string, entityType: string, entityId?: string) {
    if (!id || !user?.id) return;
    await supabase.from("activity_logs").insert({
      project_id: id,
      actor_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      description,
      metadata: {},
    }).then(({ error }) => {
      if (error) console.error("Activity log failed:", error);
    });
  }

  async function createRequest() {
    if (!id || !form.title.trim() || !user?.id) return;
    const { data, error } = await supabase.from("procurement_requests").insert({
      project_id: id,
      task_id: null,
      requester_id: user.id,
      title: form.title.trim(),
      description: form.description || null,
      category: form.category || null,
      priority: form.priority,
      budget_amount: form.budget_amount ? Number(form.budget_amount) : null,
      currency: "KES",
      status: "pending",
      expected_delivery_date: form.expected_delivery_date || null,
      supplier_id: form.supplier_id || null,
    }).select().single();
    if (error) {
      showToast("error", "Failed to create request");
      return;
    }
    setShowModal(false);
    setForm({ title: "", description: "", category: "", priority: "medium", budget_amount: "", expected_delivery_date: "", supplier_id: "" });
    showToast("success", "Procurement request created");
    await logActivity("create_procurement", `Procurement request "${form.title.trim()}" created`, "procurement_request", data.id);
    loadData();
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Procurement</h1>
          <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>Requests, quotations, and purchase orders</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Request</button>
      </div>

      {error && (
        <Card>
          <EmptyState title="Error" message={error} />
        </Card>
      )}

      <div style={styles.tabs}>
        {[
          { key: "requests" as const, label: `Requests (${requests.length})` },
          { key: "quotations" as const, label: `Quotations (${quotations.length})` },
          { key: "orders" as const, label: `Purchase Orders (${purchaseOrders.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "btn btn-sm btn-primary" : "btn btn-sm btn-secondary"}
            style={{ fontWeight: activeTab === tab.key ? 600 : 400 }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "requests" && (
        requests.length === 0 ? (
          <Card><EmptyState title="No procurement requests" message="Create your first procurement request." /></Card>
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
                  <span>Budget: {req.budget_amount ? `${req.currency || "KES"} ${req.budget_amount}` : "—"}</span>
                  {req.delay_days > 0 && <span style={{ color: "#DC2626" }}>Delayed {req.delay_days} days</span>}
                </div>
                <div style={{ marginTop: "8px", fontSize: "13px", color: "#6B7280" }}>
                  Supplier: {req.supplier_id?.slice(0, 8) || "—"} · Expected: {req.expected_delivery_date || "—"}
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {activeTab === "quotations" && (
        quotations.length === 0 ? (
          <Card><EmptyState title="No quotations" message="Quotations appear once procurement requests are in the quotations stage." /></Card>
        ) : (
          <div style={styles.grid}>
            {quotations.map((q) => (
              <Card key={q.id}>
                <div style={styles.reqHeader}>
                  <div style={{ fontWeight: 600 }}>{q.title || q.quotation_number || "Quotation"}</div>
                  <StatusBadge status={q.status} />
                </div>
                <div style={styles.reqMeta}>
                  <span>Amount: {q.amount ? `${q.currency || "KES"} ${q.amount}` : "—"}</span>
                  <span>Valid until: {q.valid_until || "—"}</span>
                </div>
                {q.description && <div style={{ marginTop: "8px", fontSize: "13px", color: "#6B7280" }}>{q.description}</div>}
                {q.terms && <div style={{ marginTop: "4px", fontSize: "12px", color: "#6B7280" }}>Terms: {q.terms}</div>}
              </Card>
            ))}
          </div>
        )
      )}

      {activeTab === "orders" && (
        purchaseOrders.length === 0 ? (
          <Card><EmptyState title="No purchase orders" message="Purchase orders are created after supplier selection." /></Card>
        ) : (
          <div style={styles.grid}>
            {purchaseOrders.map((po) => (
              <Card key={po.id}>
                <div style={styles.reqHeader}>
                  <div style={{ fontWeight: 600 }}>{po.po_number || po.title || "Purchase Order"}</div>
                  <StatusBadge status={po.status} />
                </div>
                <div style={styles.reqMeta}>
                  <span>Amount: {po.amount ? `${po.currency || "KES"} ${po.amount}` : "—"}</span>
                  <span>Issued: {po.issue_date || "—"}</span>
                  <span>Expected: {po.expected_delivery || "—"}</span>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {suppliers.length > 0 && (
        <div style={{ marginTop: "24px" }}>
          <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>Suppliers</h3>
          <div style={styles.grid}>
            {suppliers.map((s) => (
              <Card key={s.id}>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>{s.supplier_name}</div>
                <div style={styles.reqMeta}>
                  <span>Contact: {s.contact_name || "—"}</span>
                  <span>Email: {s.contact_email || "—"}</span>
                  <span>Rating: {s.rating}/5</span>
                  <span>Status: {s.status}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Procurement Request">
        <label style={styles.label}>Title *</label>
        <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Description</label>
        <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: "12px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
          <div>
            <label style={styles.label}>Budget Amount</label>
            <input className="input" type="number" value={form.budget_amount} onChange={(e) => setForm({ ...form, budget_amount: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>Expected Delivery</label>
            <input className="input" type="date" value={form.expected_delivery_date} onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })} />
          </div>
        </div>
        <label style={{ ...styles.label, marginTop: "12px" }}>Supplier</label>
        <select className="input" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
          <option value="">Select supplier...</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.supplier_name}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "20px" }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={createRequest}>Create Request</button>
        </div>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" },
  reqHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  reqMeta: { display: "flex", gap: "12px", fontSize: "13px", color: "#6B7280", marginTop: "8px", flexWrap: "wrap" },
  label: { fontSize: "13px", fontWeight: 500, color: "#374151", display: "block", marginBottom: "4px" },
};

export default ProcurementPage;
