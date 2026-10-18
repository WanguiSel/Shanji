import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/Card";
import { Loading, EmptyState } from "../components/Loading";
import { Modal } from "../components/Modal";
import { useToast } from "../hooks/useToast";

function Projects() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', client: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const { toasts, showToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data, error: queryError } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (queryError) {
      setLoadError(queryError.message);
    } else {
      setLoadError("");
      setProjects((data || []) as any[]);
    }
    setLoading(false);
  }

  async function createProject() {
    setError('');
    if (!newProject.name.trim() || saving) return;
    setSaving(true);

    // The live project INSERT policy requires the signed-in user's organization.
    const organizationId = user?.organization_id
      || (profile?.organization_id as string | undefined);

    if (!user) {
      setSaving(false);
      setError('You are not signed in. Please sign in again.');
      return;
    }
    if (!organizationId) {
      setSaving(false);
      setError('No organization is assigned to your profile. Contact an administrator.');
      return;
    }

    const { error: insertError } = await supabase.from("projects").insert({
      organization_id: organizationId,
      project_name: newProject.name.trim(),
      client_name: newProject.client.trim() || null,
      description: newProject.description.trim() || null,
      status: 'planning',
    });

    setSaving(false);
    if (insertError) {
      setError(
        insertError.code === '42501'
          ? `Permission denied by database policy: ${insertError.message}`
          : insertError.message
      );
      return;
    }
    setShowModal(false);
    setNewProject({ name: '', client: '', description: '' });
    showToast("success", "Project created");
    loadData();
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>Projects</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Manage your projects</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
      </div>
      {loadError && (
        <Card>
          <div style={{ color: '#DC2626', fontSize: '14px' }}>Could not load projects: {loadError}</div>
        </Card>
      )}
      {projects.length === 0 ? (
        <Card>
          <EmptyState title="No projects" message="Create your first project to get started." />
        </Card>
      ) : (
        <div style={styles.grid}>
          {projects.map((p) => (
            <div key={p.id} style={styles.card} onClick={() => navigate(`/projects/${p.id}`)}>
              <div style={styles.cardHeader}>
                <div style={{ fontWeight: 600, fontSize: '16px' }}>{p.project_name}</div>
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                {p.client_name || 'No client'} · {p.description?.slice(0, 60) || 'No description'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{p.status || 'draft'}</span>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{p.progress || 0}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Project">
        <label style={styles.label}>Project Name *</label>
        <input className="input" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} style={{ marginBottom: '12px' }} />
        <label style={styles.label}>Client</label>
        <input className="input" value={newProject.client} onChange={(e) => setNewProject({ ...newProject, client: e.target.value })} style={{ marginBottom: '12px' }} />
        <label style={styles.label}>Description</label>
        <textarea className="input" rows={3} value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} style={{ marginBottom: '16px' }} />
        {error && <p style={{ color: '#DC2626', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={createProject} disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
        </div>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  card: { background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #E5E7EB', cursor: 'pointer' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' },
};

export default Projects;
