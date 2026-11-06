import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";

function HRPage() {
  const { id } = useParams<{ id: string }>();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("project_members").select("*").eq("project_id", id);
      setMembers(data || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <Loading />;
  return (
    <div>
      <h1>HR / Organization Administration</h1>
      {members.length === 0 ? <Card><EmptyState title="No members" /></Card> : (
        <ul>{members.map((m) => <li key={m.id}>{m.user_id} — {m.role_id}</li>)}</ul>
      )}
    </div>
  );
}
export default HRPage;