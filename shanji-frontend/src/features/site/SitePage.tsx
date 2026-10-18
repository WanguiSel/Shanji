import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { useToast } from "../../hooks/useToast";
import type { SiteReport } from "../../types";

function SitePage() {
  const { id } = useParams<{ id: string }>();
  const [reports, setReports] = useState<SiteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast } = useToast();

  useEffect(() => { loadReports(); }, []);

  async function loadReports() {
    if (!id) return;
    const { data } = await supabase.from("site_reports").select("*").eq("project_id", id).order("report_date", { ascending: false });
    setReports((data || []) as SiteReport[]);
    setLoading(false);
  }

  async function createReport() {
    if (!id) return;
    const { data } = await supabase.from("site_reports").insert({
      project_id: id,
      report_date: new Date().toISOString().split('T')[0],
      reported_by: 'user-id',
      work_completed: 'Site work completed',
    }).select().single();
    if (!data.error) {
      showToast("success", "Site report created");
      loadReports();
    }
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Site Management</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Daily reports and site activities</p>
        </div>
        <button className="btn btn-primary" onClick={createReport}>+ Daily Report</button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <EmptyState title="No site reports" message="Create daily reports to track site activities." />
        </Card>
      ) : (
        <div style={styles.grid}>
          {reports.map((r) => (
            <Card key={r.id}>
              <div style={styles.evHeader}>
                <div style={{ fontWeight: 600 }}>Site Report — {r.report_date}</div>
                <span style={{ color: '#0D6B4E', fontWeight: 500 }}>{r.location || 'Site'}</span>
              </div>
              {r.work_completed && <p style={{ fontSize: '13px', color: '#374151', marginTop: '8px' }}><strong>Work:</strong> {r.work_completed}</p>}
              {r.problems && <p style={{ fontSize: '13px', color: '#DC2626' }}><strong>Problems:</strong> {r.problems}</p>}
              {r.next_steps && <p style={{ fontSize: '13px', color: '#2563EB' }}><strong>Next Steps:</strong> {r.next_steps}</p>}
              <div style={styles.evMeta}>
                <span>Reported: {new Date(r.created_at).toLocaleString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' },
  evHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  evMeta: { display: 'flex', gap: '12px', fontSize: '12px', color: '#6B7280', marginTop: '8px' },
};

export default SitePage;
