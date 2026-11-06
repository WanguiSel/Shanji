import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { useToast } from "../../hooks/useToast";

function DMPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("create_dm_conversation", { user_a: (await supabase.auth.getUser()).data.user?.id, user_b: id });
      if (error) { showToast("error", error.message); setLoading(false); return; }
      setConversationId(data);
      const { data: msgs } = await supabase.from("dm_messages").select("*").eq("conversation_id", data).order("created_at");
      setMessages(msgs || []);
      setLoading(false);
    })();
  }, [id]);

  async function sendMessage() {
    if (!conversationId || !body.trim()) return;
    const { error } = await supabase.from("dm_messages").insert({ conversation_id: conversationId, sender_id: (await supabase.auth.getUser()).data.user?.id, body: body.trim() });
    if (error) showToast("error", error.message);
    else {
      setBody("");
      const { data } = await supabase.from("dm_messages").select("*").eq("conversation_id", conversationId).order("created_at");
      setMessages(data || []);
    }
  }

  if (loading) return <Loading />;
  return (
    <div>
      <h1>Direct Messages</h1>
      {messages.length === 0 ? <Card><EmptyState title="No messages" /></Card> : (
        <ul>{messages.map((m) => <li key={m.id}>{m.body}</li>)}</ul>
      )}
      <div>
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
export default DMPage;