import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card } from "../components/Card";
import { Loading, EmptyState } from "../components/Loading";

function ActivityPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
    setEvents((data || []) as any[]);
    setLoading(false);
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Activity</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Recent project activity</p>
        </div>
      </div>
      {events.length === 0 ? (
        <Card><EmptyState title="No activity yet" /></Card>
      ) : (
        <div style={styles.timeline}>
          {events.map((e) => (
            <div key={e.id} style={styles.event}>
              <div style={styles.eventDot} />
              <div style={styles.eventContent}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{e.action}</div>
                <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
                  {e.entity} {e.entity_id ? `#${e.entity_id.slice(0, 8)}` : ''} · {e.user_id?.slice(0, 8)}
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                  {new Date(e.created_at).toLocaleString()}
                </div>
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
  timeline: { display: 'flex', flexDirection: 'column', gap: '0' },
  event: { display: 'flex', gap: '16px', padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', marginBottom: '8px' },
  eventDot: { width: '10px', height: '10px', borderRadius: '50%', background: '#0D6B4E', marginTop: '4px', flexShrink: 0 },
  eventContent: { flex: 1 },
};

export default ActivityPage;
