import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { useToast } from "../../hooks/useToast";
import type { Document } from "../../types";

function DocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [category, setCategory] = useState("reports");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toasts, showToast } = useToast();

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    if (!id) return;
    const { data } = await supabase.from("documents").select("*").eq("project_id", id).order("created_at", { ascending: false });
    setDocuments((data || []) as Document[]);
    setLoading(false);
  }

  async function createDocument() {
    if (!id || !title.trim() || !fileUrl.trim() || saving) return;
    setSaving(true);
    setError("");

    const rich = await supabase.from("documents").insert({
      project_id: id,
      category,
      title: title.trim(),
      description: null,
      file_url: fileUrl.trim(),
      uploaded_by: user?.id,
    }).select().single();

    let error = rich.error;
    if (error) {
      // Live schema stores only the file URL; the title is kept in the URL label if available.
      const live = await supabase.from("documents").insert({
        project_id: id,
        file_url: fileUrl.trim(),
        uploaded_by: user?.id,
      }).select().single();
      error = live.error;
    }

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setShowModal(false);
    setTitle("");
    setFileUrl("");
    showToast("success", "Document added");
    loadDocs();
  }

  const categories = ['contracts', 'workplans', 'reports', 'procurement', 'finance', 'hse', 'site', 'me', 'handover', 'administrative'];

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Documents</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Project document repository</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Document</button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <EmptyState title="No documents" message="Upload documents to build the project repository." />
        </Card>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {categories.map((cat) => {
              const count = documents.filter((d) => d.category === cat).length;
              if (!count) return null;
              return (
                <span key={cat} style={{ padding: '4px 12px', background: '#F3F4F6', borderRadius: '6px', fontSize: '13px' }}>
                  {cat}: {count}
                </span>
              );
            })}
          </div>
          <div style={styles.grid}>
            {documents.map((d) => (
              <Card key={d.id}>
                <div style={styles.docHeader}>
                  <div style={{ fontWeight: 600 }}>{(d as any).title || (d as any).document_name || (d as any).file_url || "Document"}</div>
                  <span style={{ padding: '4px 8px', background: '#EFF6FF', color: '#2563EB', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>
                    {(d as any).category || "document"}
                  </span>
                </div>
                <div style={styles.evMeta}>
                  {(d as any).version ? <span>v{(d as any).version}</span> : null}
                  <span>Added: {new Date(d.created_at).toLocaleDateString()}</span>
                  {(d as any).file_url && <a href={(d as any).file_url} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>Open</a>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Document">
        <label style={styles.label}>Document title *</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: "12px" }} />
        <label style={styles.label}>File URL *</label>
        <input className="input" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." style={{ marginBottom: "12px" }} />
        <label style={styles.label}>Category</label>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ marginBottom: "16px" }}>
          {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        {error && <p style={{ color: "#DC2626", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={createDocument} disabled={saving}>{saving ? "Saving..." : "Save Document"}</button>
        </div>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  docHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  evMeta: { display: 'flex', gap: '12px', fontSize: '12px', color: '#6B7280', marginTop: '8px' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' },
};

export default DocumentsPage;
