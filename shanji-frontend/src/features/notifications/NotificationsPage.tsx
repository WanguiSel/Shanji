import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../contexts/AuthContext";
import type { Notification } from "../../types";

function NotificationsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast } = useToast();

  useEffect(() => {
    if (!user?.id) return;
    loadNotifications();
  }, [user]);

  async function loadNotifications() {
    if (!user?.id) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setNotifications((data || []) as Notification[]);
    setLoading(false);
  }

  async function markAllRead() {
    if (!user?.id) return;
    await supabase.from("notifications").update({ read: true, read_at: new Date().toISOString() }).eq("user_id", user.id).eq("read", false);
    showToast("success", "All notifications marked as read");
    loadNotifications();
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Notifications</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>System notifications and updates</p>
        </div>
        <button className="btn btn-secondary" onClick={markAllRead}>Mark All Read</button>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <EmptyState title="No notifications" />
        </Card>
      ) : (
        <div style={styles.grid}>
          {notifications.map((n) => (
            <Card key={n.id} style={{ opacity: n.read ? 0.7 : 1 }}>
              <div style={styles.notifHeader}>
                <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.05em' }}>{n.type}</span>
                {!n.read && <span style={{ width: '8px', height: '8px', background: '#0D6B4E', borderRadius: '50%' }} />}
              </div>
              <div style={{ fontWeight: 600, marginTop: '4px' }}>{n.title}</div>
              {n.message && <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>{n.message}</p>}
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>
                {new Date(n.created_at).toLocaleString()}
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
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' },
  notifHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
};

export default NotificationsPage;
