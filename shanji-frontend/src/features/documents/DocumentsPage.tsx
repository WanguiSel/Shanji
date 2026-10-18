import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { useToast } from "../../hooks/useToast";
import type { Document } from "../../types";

function DocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast } = useToast();

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    if (!id) return;
    const { data } = await supabase.from("documents").select("*").eq("project_id", id).order("created_at", { ascending: false });
    setDocuments((data || []) as Document[]);
    setLoading(false);
  }

  async function createDocument() {
    if (!id) return;
    const { data } = await supabase.from("documents").insert({
      project_id: id,
      category: 'reports',
      title: 'New Document',
      description: 'Document uploaded',
      uploaded_by: 'user-id',
    }).select().single();
    if (!data.error) {
      showToast("success", "Document created");
      loadDocs();
    }
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
        <button className="btn btn-primary" onClick={createDocument}>+ Upload Document</button>
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
                  <div style={{ fontWeight: 600 }}>{d.title}</div>
                  <span style={{ padding: '4px 8px', background: '#EFF6FF', color: '#2563EB', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>
                    {d.category}
                  </span>
                </div>
                <div style={styles.evMeta}>
                  <span>v{d.version}</span>
                  <span>Uploaded: {new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  docHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  evMeta: { display: 'flex', gap: '12px', fontSize: '12px', color: '#6B7280', marginTop: '8px' },
};

export default DocumentsPage;
