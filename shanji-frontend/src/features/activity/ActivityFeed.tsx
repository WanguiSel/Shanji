import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";

function ActivityFeed() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch activities for projects the user has access to
      const { data: userProjects } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id);

      if (!userProjects?.length) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const projectIds = userProjects.map((p) => p.project_id);

      // Get activities from user projects
      let activitiesQuery = supabase
        .from("activity_logs")
        .select("*")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });

      // If user is admin/project_manager, also get activities from organization projects
      if (user.organization_id) {
        const { data: orgProjects } = await supabase
          .from("projects")
          .select("id")
          .eq("organization_id", user.organization_id);

        if (orgProjects?.length) {
          const orgProjectIds = orgProjects.map((p) => p.id);
          const orgActivities = await supabase
            .from("activity_logs")
            .select("*")
            .in("project_id", orgProjectIds)
            you'd need to continue with the restCajas
