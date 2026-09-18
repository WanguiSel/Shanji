import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/Card";

interface ActivityFeedProps {
  projectId?: string;
}

interface ActivityLog {
  id: string;
  project_id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  created_at: string;
}

export default function ActivityFeed({ projectId }: ActivityFeedProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchActivities = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("activity_logs")
          .select(
            "id, project_id, actor_id, action, entity_type, entity_id, description, created_at"
          )
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        if (error) {
          setError(error.message);
          return;
        }

        setActivities(data || []);
      } catch (err) {
        setError("Failed to fetch activities");
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [projectId]);

  if (loading) {
    return <div className="loading">Loading activities...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (activities.length === 0) {
    return (
      <Card>
        <div className="empty">No activity found for this project.</div>
      </Card>
    );
  }

  return (
    <div className="activity-feed">
      {activities.map((activity) => (
        <Card key={activity.id}>
          <div className="activity-item">
            <div className="activity-description">{activity.description}</div>
            <div className="activity-timestamp">
              {new Date(activity.created_at).toLocaleString()}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
