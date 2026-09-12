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
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', client: '', org_id: '', description: '' });
  const { toasts, showToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: orgData } = await supabase.from("organizations").select("*");
    setOrganizations((orgData || []) as any[]);
    if (user?.organization_id) {
      const { data } = await supabase.from("projects").select("*").eq("organization_id", user.organization_id).order("created_at", { ascending: false });
      setProjects((data || []) as any[]);
    }
    setLoading(false);
  }

  async function createProject() {
    if (!newProject.name.trim()) return;
    const { data } = await supabase.from("projects").insert({
      organization_id: newProject.org_id || user?.organization_id,
      project_name: newProject.name.trim(),
      client_name: newProject.client || null,
      description: newProject.description || null,
      created_by: user?.id,
    }).select().single();
    if (!data.error) {
      setShowModal(false);
      setNewProject({ name: '', client: '', org_id: '', description: '' });
      showToast("success", "Project created");
      loadData();
    }
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
        <label style={styles.label}>Organization</label>
        <select className="input" value={newProject.org_id} onChange={(e) => setNewProject({ ...newProject, org_id: e.target.value })} style={{ marginBottom: '12px' }}>
          <option value="">Default</option>
          {organizations.map((o) => <option key={o.id} value={o.id}>{o.org_name}</option>)}
        </select>
        <label style={styles.label}>Description</label>
        <textarea className="input" rows={3} value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} style={{ marginBottom: '16px' }} />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={createProject}>Create</button>
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
