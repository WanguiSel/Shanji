import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import type { WorkplanItem } from "../../types";

function TimelinePage() {
  const { id } = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<WorkplanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    if (!id) return;
    const { data: wpData } = await supabase.from("workplans").select("id").eq("project_id", id);
    if (!wpData?.length) { setLoading(false); return; }
    const { data } = await supabase.from("workplan_items").select("*").in("workplan_id", wpData.map((w) => w.id)).order("sort_order");
    setTasks((data || []) as WorkplanItem[]);
    setLoading(false);
  }

  if (loading) return <Loading />;

  // Group tasks by status for the timeline view
  const statusGroups: Record<string, WorkplanItem[]> = {
    'Not Started': [],
    'Planned': [],
    'In Progress': [],
    'Blocked': [],
    'Submitted': [],
    'Verified': [],
    'Completed': [],
  };

  tasks.forEach((t) => {
    const key = t.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (statusGroups[key]) statusGroups[key].push(t);
    else if (!statusGroups[key]) statusGroups['Not Started'].push(t); // fallback
  });

  // Simpler mapping
  const groups: Record<string, WorkplanItem[]> = {};
  tasks.forEach((t) => {
    const shortStatus = t.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (!groups[shortStatus]) groups[shortStatus] = [];
    groups[shortStatus].push(t);
  });

  const allGroups = ['NOT STARTED', 'PLANNED', 'IN PROGRESS', 'BLOCKED', 'SUBMITTED FOR VERIFICATION', 'VERIFIED', 'COMPLETED'];

  const statusColors: Record<string, string> = {
    'NOT STARTED': '#9CA3AF',
    'PLANNED': '#8B5CF6',
    'IN PROGRESS': '#2563EB',
    'BLOCKED': '#DC2626',
    'SUBMITTED FOR VERIFICATION': '#F59E0B',
    'VERIFIED': '#059669',
    'COMPLETED': '#0D6B4E',
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Timeline</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Task schedule and progress overview</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <EmptyState title="No tasks yet" />
        </Card>
      ) : (
        <div style={styles.timeline}>
          {allGroups.filter((g) => groups[g]?.length).map((group) => (
            <div key={group} style={styles.group}>
              <div style={{ ...styles.groupHeader, borderLeftColor: statusColors[group] || '#6B7280' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{group}</h3>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>{groups[group].length} tasks</span>
              </div>
              <div style={styles.groupTasks}>
                {groups[group].map((t) => (
                  <div key={t.id} style={styles.taskChip}>
                    <span style={{ fontSize: '13px' }}>{t.task_title}</span>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>{t.progress || 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: '24px' },
  timeline: { display: 'flex', flexDirection: 'column', gap: '20px' },
  group: { background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' },
  groupHeader: { padding: '12px 16px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', borderLeftWidth: '3px', borderLeftStyle: 'solid', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  groupTasks: { padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px' },
  taskChip: { padding: '6px 12px', background: '#F3F4F6', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' },
};

export default TimelinePage;
