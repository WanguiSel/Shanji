import { useNavigate } from "react-router-dom";

function RoleSelection() {
  const navigate = useNavigate();
  const roles = [
    { name: "Project Manager", desc: "Full project oversight and approvals", color: "#0D6B4E" },
    { name: "Project Assistant", desc: "Administrative support and documentation", color: "#2563EB" },
    { name: "Site Supervisor", desc: "Field execution and evidence", color: "#D97706" },
    { name: "Finance", desc: "Budgets, expenses, financial records", color: "#7C3AED" },
    { name: "Procurement", desc: "Purchases, quotations, suppliers", color: "#DC2626" },
    { name: "OHS / HSE", desc: "Safety, compliance, inspections", color: "#059669" },
    { name: "M&E", desc: "Monitoring and indicators", color: "#0891B2" },
    { name: "Team Member", desc: "General access to assigned work", color: "#6B7280" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Select Your Role</h1>
        <p style={styles.subtitle}>Choose your workspace to continue</p>
        <div style={styles.grid}>
          {roles.map((role) => (
            <button
              key={role.name}
              style={{ ...styles.button, borderTopColor: role.color }}
              onClick={() => navigate("/dashboard")}
            >
              <div style={styles.buttonTitle}>{role.name}</div>
              <div style={styles.buttonDesc}>{role.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F9FAFB', padding: '24px' },
  card: { background: 'white', padding: '40px', borderRadius: '12px', width: '640px', maxWidth: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  title: { fontSize: '24px', marginBottom: '8px', textAlign: 'center' },
  subtitle: { color: '#6B7280', fontSize: '14px', marginBottom: '24px', textAlign: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  button: { padding: '16px', background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: '8px', borderTopWidth: '3px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' },
  buttonTitle: { fontWeight: 600, fontSize: '14px', color: '#111827', marginBottom: '4px' },
  buttonDesc: { fontSize: '12px', color: '#6B7280' },
};

export default RoleSelection;
