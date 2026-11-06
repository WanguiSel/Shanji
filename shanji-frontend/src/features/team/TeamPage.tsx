import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { useToast } from "../../hooks/useToast";

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [roleHistory, setRoleHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newToken, setNewToken] = useState("");
  const orgId = (profile as any)?.organization_id || (user as any)?.organization_id;

  async function load() {
    if (!orgId) { setLoading(false); return; }
    const { data: inv } = await supabase.from("organization_invitations").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
    setInvitations(inv || []);
    const { data: hist } = await supabase.from("role_change_history").select("*").eq("organization_id", orgId).order("changed_at", { ascending: false });
    setRoleHistory(hist || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [orgId]);

  async function invite() {
    if (!orgId || !email.trim()) return;
    const rawToken = crypto.randomUUID();
    const hash = await sha256(rawToken);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("organization_invitations").insert({
      organization_id: orgId,
      email: email.trim(),
      token_hash: hash,
      expires_at: expires,
      invited_by: user?.id,
    });
    if (error) { showToast("error", error.message); return; }
    setNewToken(rawToken);
    setEmail("");
    showToast("success", "Invitation created");
    load();
  }

  async function acceptInvitation() {
    if (!token.trim()) return;
    const { data, error } = await supabase.rpc("accept_organization_invitation", { p_token: token.trim() });
    if (error) { showToast("error", error.message); return; }
    showToast("success", "Invitation accepted");
    setToken("");
    load();
  }

  if (loading) return <Loading />;
  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Team & HR</h1>
          <p className="page-subtitle">Invitations and role history</p>
        </div>
      </header>
      <section className="section">
        <div className="section-head"><div><h2 className="section-title">Invite Member</h2></div></div>
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn-primary" onClick={invite}>Create Invitation</button>
          </div>
          {newToken && <div className="card" style={{ marginTop: "var(--space-3)" }}>Token: {newToken}</div>}
        </div>
      </section>
      <section className="section">
        <div className="section-head"><div><h2 className="section-title">Accept Invitation</h2></div></div>
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input className="input" placeholder="Token" value={token} onChange={(e) => setToken(e.target.value)} />
            <button className="btn btn-primary" onClick={acceptInvitation}>Accept</button>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="section-head"><div><h2 className="section-title">Pending Invitations</h2></div></div>
        {invitations.length === 0 ? <div className="card"><EmptyState title="No invitations" message="Create invitations to onboard team members." /></div> : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Email</th><th>Status</th><th>Expires</th></tr></thead>
              <tbody>{invitations.map((i) => <tr key={i.id}><td>{i.email}</td><td>{i.status}</td><td>{i.expires_at}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
      <section className="section">
        <div className="section-head"><div><h2 className="section-title">Role Change History</h2></div></div>
        {roleHistory.length === 0 ? <div className="card"><EmptyState title="No role changes" message="Role changes will appear here." /></div> : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>User</th><th>From</th><th>To</th><th>Reason</th><th>Date</th></tr></thead>
              <tbody>{roleHistory.map((r) => <tr key={r.id}><td>{r.user_id}</td><td>{r.old_role_id || "—"}</td><td>{r.new_role_id}</td><td>{r.reason || "—"}</td><td>{r.changed_at}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default TeamPage;
