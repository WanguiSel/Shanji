import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../contexts/AuthContext";
import type { Comment } from "../../types";

function CommentsSection({ projectId, relatedType, relatedId }: { projectId: string; relatedType?: string; relatedId?: string }) {
  const { user } = useAuth();
  const { toasts, showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => { loadComments(); }, []);

  async function loadComments() {
    let query = supabase.from("comments").select("*").eq("project_id", projectId);
    if (relatedType) query = query.eq("related_object_type", relatedType);
    if (relatedId) query = query.eq("related_object_id", relatedId);
    const { data } = await query.order("created_at", { ascending: true });
    setComments((data || []) as Comment[]);
  }

  async function addComment() {
    if (!user || !newComment.trim()) return;
    const { data } = await supabase.from("comments").insert({
      project_id: projectId,
      author_id: user.id,
      content: newComment.trim(),
      related_object_type: relatedType || null,
      related_object_id: relatedId || null,
    }).select().single();
    if (!data.error) {
      setNewComment("");
      showToast("success", "Comment added");
      loadComments();
    }
  }

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>Comments</h3>
      {comments.length === 0 ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No comments yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {comments.map((c) => (
            <div key={c.id} style={{ padding: '12px', background: '#F9FAFB', borderRadius: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                {c.author_id?.slice(0, 8)} · {new Date(c.created_at).toLocaleString()}
              </div>
              <p style={{ fontSize: '14px', margin: 0 }}>{c.content}</p>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          className="input"
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addComment()}
        />
        <button className="btn btn-primary" onClick={addComment}>Post</button>
      </div>
    </div>
  );
}

export default CommentsSection;
