import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { useToast } from "../../hooks/useToast";

function MessagesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUserId, setOtherUserId] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadConversations() {
    if (!user?.id) return;
    const { data: parts } = await supabase.from("dm_participants").select("conversation_id").eq("user_id", user.id);
    const ids = (parts || []).map((p: any) => p.conversation_id);
    if (ids.length === 0) { setConversations([]); setLoading(false); return; }
    const { data } = await supabase.from("dm_conversations").select("*").in("id", ids).order("updated_at", { ascending: false });
    setConversations(data || []);
    setLoading(false);
  }

  async function loadMessages(convId: string) {
    const { data } = await supabase.from("dm_messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    setMessages(data || []);
  }

  useEffect(() => { loadConversations(); }, [user?.id]);
  useEffect(() => { if (selected) loadMessages(selected); }, [selected]);

  async function createConversation() {
    if (!otherUserId.trim()) return;
    const { data, error } = await supabase.rpc("create_dm_conversation", { user_a: user?.id, user_b: otherUserId.trim() });
    if (error) { showToast("error", error.message); return; }
    setOtherUserId("");
    showToast("success", "Conversation ready");
    await loadConversations();
    setSelected(data);
  }

  async function sendMessage() {
    if (!selected || !newMessage.trim() || !user?.id) return;
    const { error } = await supabase.from("dm_messages").insert({
      conversation_id: selected,
      sender_id: user.id,
      content: newMessage.trim(),
    });
    if (error) { showToast("error", error.message); return; }
    setNewMessage("");
    loadMessages(selected);
  }

  if (loading) return <Loading />;
  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Private one-to-one conversations</p>
        </div>
      </header>
      <section className="section">
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input className="input" placeholder="Other user ID" value={otherUserId} onChange={(e) => setOtherUserId(e.target.value)} />
            <button className="btn btn-primary" onClick={createConversation}>New Conversation</button>
          </div>
        </div>
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "var(--space-4)" }}>
        <div className="card">
          {conversations.length === 0 ? <EmptyState title="No conversations" message="Start a conversation." /> : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {conversations.map((c) => (
                <li key={c.id}>
                  <button className="btn btn-ghost" style={{ width: "100%", textAlign: "left" }} onClick={() => setSelected(c.id)}>
                    {c.id.slice(0, 8)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          {!selected ? <EmptyState title="Select a conversation" message="Choose a conversation to view messages." /> : (
            <div>
              <div style={{ maxHeight: "400px", overflowY: "auto", marginBottom: "var(--space-3)" }}>
                {messages.map((m) => (
                  <div key={m.id} style={{ marginBottom: "var(--space-2)" }}>
                    <div className="t-xs text-muted">{m.sender_id}</div>
                    <div>{m.content}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <input className="input" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Message" />
                <button className="btn btn-primary" onClick={sendMessage}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessagesPage;
