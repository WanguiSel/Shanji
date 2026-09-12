import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { StatusBadge } from "../../components/StatusBadge";

function TasksPage() {
  const { id } = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [id]);

  const loadTasks = async () => {
    if (!id) return;
    const { data: wpData } = await supabase.from("workplans").select("id").eq("project_id", id);
    if (!wpData?.length) {
      setTasks([]);
      setLoading(false);
      return;
    }
    const wpIds = wpData.map((w) => w.id);
    const { data } = await supabase.from("workplan_items").select("*").in("workplan_id", wpIds).order("sort_order");
    setTasks((data || []) as any[]);
    setLoading(false);
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1>Tasks</h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Workplan execution and tracking</p>
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
                    <span>Status: <StatusBadge status={task.status} /></span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: task.progress === 100 ? '#059669' : '#6B7280' }}>
                    {task.progress || 0}% complete
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

export default TasksPage;