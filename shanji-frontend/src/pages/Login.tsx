import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { User } from "../types";

function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      navigate("/role");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
  }, [navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.logo}>Shanji<span style={{ color: '#F59E0B' }}>DNA</span></h1>
          <p style={styles.subtitle}>Project Operations System</p>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            className="input"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label style={{ ...styles.label, marginTop: '16px' }}>Password</label>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ ...styles.button, marginTop: '24px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F9FAFB' },
  card: { background: 'white', padding: '48px', borderRadius: '12px', width: '400px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  header: { textAlign: 'center', marginBottom: '32px' },
  logo: { fontSize: '32px', fontWeight: 700, color: '#111827', margin: '0 0 8px' },
  subtitle: { color: '#6B7280', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151' },
  button: { padding: '12px' },
  error: { background: '#FEF2F2', color: '#DC2626', padding: '12px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' },
};

export default Login;
