import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";

function WorkplanPage() {
  const { id } = useParams<{ id: string }>();
  const [workplan, setWorkplan] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkplan = async () => {
    if (!id) return;
    const { data: wpData } = await supabase
      .from("workplans")
      .select("*, projects(project_name)")
      .eq("id", id)
      .single();
    if (wpData) {
      setWorkplan(wpData as any);
      loadTasks(wpData.id);
    }
    setLoading(false);
  };

  const loadTasks = async (workplanId: string) => {
    const { data } = await supabase
      .from("workplan_items")
      .select("*")
      .eq("workplan_id", workplanId)
      .order("sort_order");
    setTasks((data || []) as any[]);
  };

  useEffect(() => {
    loadWorkplan();
  }, [id]);

  if (loading) return <Loading />;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '24px' }}>← Back</button>
      <div style={{ marginBottom: '32px' }}>
        <h1>{workplan?.projects?.project_name || 'Workplan'}</h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>{workplan?.title}</p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div><span style={{ fontSize: '13px', color: '#6B7280' }}>Version:</span> <span style={{ fontWeight: 600 }}>{workplan?.version}</span></div>
          <div><span style={{ fontSize: '13px', color: '#6B7280' }}>Status:</span> <span style={{ fontWeight: 600 }}>{workplan?.status}</span></div>
          <div><span style={{ fontSize: '13px', color: '#6B7280' }}>Approved by:</span> <span style={{ fontWeight: 600 }}>{workplan?.approved_by ? workplan.approved_by.slice(0, 8) : 'Not approved'}</span></div>
        </div>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Tasks</h2>
        <button className="btn btn-primary" onClick={() => navigate(`/projects/${workplan?.project_id}/tasks/new`)}>+ New Task</button>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <EmptyState title="No tasks yet" message="Create your first task to start tracking work." />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tasks.map((task: any) => (
            <Card key={task.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{task.task_title}</h3>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                    <span>Priority: {task.priority}</span>
                    <span style={{ margin: '0 8px' }}>•</span>
                    <span>Due: {task.end_date ? new Date(task.end_date).toLocaleDateString() : 'Not set'}</span>
                    <span style={{ margin: '0 8px' }}>•</span>
                    <span>Status: {task.status}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: task.progress === 100 ? '#059669' : '#6B7280' }}>
                    {task.progress || 0}% complete
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => navigate(`/projects/${workplan?.project_id}/tasks/${task.id}/edit`)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default WorkplanPage;