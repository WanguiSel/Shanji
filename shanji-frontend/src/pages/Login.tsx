import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Login() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  useState(() => {
    if (user) navigate("/dashboard");
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        const { error: authError } = await signUp(email, password, fullName);
        if (authError) { setError(authError.message); setLoading(false); return; }
        navigate("/dashboard");
      } else {
        const { error: authError } = await signIn(email, password);
        if (authError) { setError(authError.message); setLoading(false); return; }
        navigate("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred.");
    }
    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.logo}>Shanji<span style={{ color: '#F59E0B' }}>DNA</span></h1>
          <p style={styles.subtitle}>Project Operations System</p>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegister && (
            <>
              <label style={styles.label}>Full Name</label>
              <input className="input" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={{ marginBottom: '12px' }} />
            </>
          )}
          <label style={styles.label}>Email</label>
          <input type="email" className="input" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label style={{ ...styles.label, marginTop: '16px' }}>Password</label>
          <input type="password" className="input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button type="submit" className="btn btn-primary" style={{ ...styles.button, marginTop: '24px' }} disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        <p style={styles.toggle}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(!isRegister); setError(""); }} style={{ fontWeight: 600 }}>
            {isRegister ? 'Sign In' : 'Register'}
          </a>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F9FAFB', padding: '24px' },
  card: { background: 'white', padding: '40px', borderRadius: '12px', width: '420px', maxWidth: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  header: { textAlign: 'center', marginBottom: '32px' },
  logo: { fontSize: '32px', fontWeight: 700, color: '#111827', margin: '0 0 8px' },
  subtitle: { color: '#6B7280', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151' },
  button: { padding: '12px' },
  error: { background: '#FEF2F2', color: '#DC2626', padding: '12px', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' },
  toggle: { textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6B7280' },
};

export default Login;
