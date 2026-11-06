import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";

function ArchivePage() {
  const { id } = useParams<{ id: string }>();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("projects").select("*").not("archived_at", "is", null);
      setProjects(data || []);
      setLoading(false);
    })();
  }, [id]);

  async function restoreProject(projectId: string) {
    if (!confirm("Restore this project?")) return;
    const { error } = await supabase.from("projects").update({ archived_at: null, archived_by: null }).eq("id", projectId);
    if (error) alert(error.message);
    else setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }
  return (
    <div>
      <h1>Archive</h1>
      {projects.length === 0 ? <Card><EmptyState title="No archived projects" /></Card> : (
        <ul>{projects.map((p) => <li key={p.id}>{p.project_name} <button onClick={() => restoreProject(p.id)}>Restore</button></li>)}</ul>
      )}
    </div>
  );
}
export default ArchivePage;