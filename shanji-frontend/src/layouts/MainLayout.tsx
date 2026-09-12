import { useState, useCallback } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotificationContext } from "../contexts/NotificationContext";
import { useToast } from "../hooks/useToast";

function MainLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotificationContext();
  const { toasts, showToast, removeToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate("/");
  }, [signOut, navigate]);

  const projectMatch = location.pathname.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1];

  const navItems = projectId ? [
    { name: "Overview", path: `/projects/${projectId}` },
    { name: "Plan", path: `/projects/${projectId}` },
    { name: "Tasks", path: `/projects/${projectId}/tasks` },
    { name: "Timeline", path: `/projects/${projectId}/timeline` },
    { name: "Risks", path: `/projects/${projectId}/risks` },
    { name: "Issues", path: `/projects/${projectId}/issues` },
    { name: "Procurement", path: `/projects/${projectId}/procurement` },
    { name: "Finance", path: `/projects/${projectId}/finance` },
    { name: "Site", path: `/projects/${projectId}/site` },
    { name: "Evidence", path: `/projects/${projectId}/evidence` },
    { name: "Documents", path: `/projects/${projectId}/documents` },
    { name: "Approvals", path: `/projects/${projectId}/approvals` },
    { name: "Reports", path: `/projects/${projectId}/reports` },
    { name: "Changes", path: `/projects/${projectId}/change-requests` },
    { name: "Handover", path: `/projects/${projectId}/handover` },
    { name: "Activity", path: `/activity` },
  ] : [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Projects", path: "/projects" },
    { name: "Activity", path: "/activity" },
  ];

  return (
    <div style={styles.container}>
      <aside style={{ ...styles.sidebar, width: sidebarOpen ? '260px' : '64px' }}>
        <div style={{ padding: sidebarOpen ? '0 20px 20px' : '0 20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            Shanji<span style={{ color: '#F59E0B' }}>DNA</span>
          </h2>
        </div>

        <nav style={{ padding: '8px 12px', flex: 1, overflowY: 'auto' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'block',
                padding: sidebarOpen ? '10px 14px' : '10px',
                marginBottom: '2px',
                borderRadius: '6px',
                textDecoration: 'none',
                color: isActive ? '#F59E0B' : 'rgba(255,255,255,0.7)',
                background: isActive ? 'rgba(245,158,11,0.15)' : 'transparent',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                transition: 'all 0.15s',
              })}
              title={item.name}
            >
              {sidebarOpen ? item.name : ''}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {unreadCount > 0 && (
            <div style={{ marginBottom: '8px', padding: '4px 12px', background: 'rgba(245,158,11,0.2)', borderRadius: '4px', fontSize: '12px', color: '#F59E0B', textAlign: 'center' }}>
              {unreadCount} unread
            </div>
          )}
          <button onClick={handleLogout} style={{
            width: '100%', padding: '8px', background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '13px',
            borderRadius: '6px',
          }}>
            Sign Out
          </button>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'absolute', right: '-12px', top: '80px',
            width: '24px', height: '24px', borderRadius: '50%',
            background: '#F59E0B', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', color: '#082C26', fontWeight: 700,
          }}
        >
          {sidebarOpen ? '←' : '→'}
        </button>
      </aside>

      <main style={styles.main}>
        <Outlet />
      </main>

      {toasts.map((t) => (
        <div key={t.id} style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          background: t.type === 'error' ? '#FEF2F2' : t.type === 'warning' ? '#FFFBEB' : t.type === 'info' ? '#EFF6FF' : '#ECFDF5',
          border: `1px solid ${t.type === 'error' ? '#FECACA' : t.type === 'warning' ? '#FDE68A' : t.type === 'info' ? '#BFDBFE' : '#A7F3D0'}`,
          borderRadius: '8px',
          fontSize: '14px',
          zIndex: 1100,
          color: t.type === 'error' ? '#DC2626' : t.type === 'warning' ? '#D97706' : t.type === 'info' ? '#2563EB' : '#059669',
          cursor: 'pointer',
        }} onClick={() => removeToast(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    background: '#0D3B2E',
    color: 'white',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s',
    position: 'relative',
    minWidth: '64px',
  },
  main: { flex: 1, padding: '24px', minHeight: '100vh', background: '#F9FAFB' },
};

export default MainLayout;
