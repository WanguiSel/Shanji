import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Loading, EmptyState } from "../../components/Loading";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../lib/utils";
import type { Issue } from "../../types";

function IssuesPage() {
  const { id } = useParams<{ id: string }>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast } = useToast();

  useEffect(() => { loadIssues(); }, []);

  async function loadIssues() {
    if (!id) return;
    const { data } = await supabase.from("issues").select("*").eq("project_id", id).order("date_raised", { ascending: false });
    setIssues((data || []) as Issue[]);
    setLoading(false);
  }

  async function updateIssueStatus(issueId: string, newStatus: string) {
    const { error } = await supabase.from("issues").update({ status: newStatus }).eq("id", issueId);
    if (!error) {
      showToast("success", "Issue updated");
      loadIssues();
    }
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Issues</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Track and resolve issues</p>
        </div>
      </div>

      {issues.length === 0 ? (
        <Card>
          <EmptyState title="No issues" message="Issues will appear here when raised." />
        </Card>
      ) : (
        <div style={styles.grid}>
          {issues.map((issue) => (
            <Card key={issue.id}>
              <div style={styles.issueHeader}>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{issue.issue_title}</div>
                <StatusBadge status={issue.status} />
              </div>
              {issue.description && <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>{issue.description}</p>}
              <div style={styles.issueMeta}>
                <span>Severity: <strong>{issue.severity}</strong></span>
                <span>Escalation: L{issue.escalation_level}</span>
                <span>Raised: {formatDateTime(issue.date_raised)}</span>
                {issue.due_date && <span>Due: {issue.due_date}</span>}
                <span>Owner: {issue.owner_id?.slice(0, 8) || '—'}</span>
              </div>
              {issue.resolution && <p style={{ fontSize: '12px', color: '#0D6B4E', marginTop: '8px' }}>Resolution: {issue.resolution}</p>}
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                {issue.status !== 'resolved' && (
                  <button className="btn btn-sm btn-primary" onClick={() => updateIssueStatus(issue.id, 'resolved')}>Resolve</button>
                )}
                {issue.status === 'resolved' && (
                  <button className="btn btn-sm btn-secondary" onClick={() => updateIssueStatus(issue.id, 'closed')}>Close</button>
                )}
                {issue.escalation_level < 3 && (
                  <button className="btn btn-sm btn-secondary" onClick={() => updateIssueStatus(issue.id, 'escalated')}>Escalate</button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' },
  issueHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  issueMeta: { display: 'flex', gap: '12px', fontSize: '12px', color: '#6B7280', marginTop: '8px', flexWrap: 'wrap' },
};

export default IssuesPage;
