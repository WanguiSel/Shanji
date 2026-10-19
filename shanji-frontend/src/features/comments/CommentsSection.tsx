
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import type { Comment } from "../../types";

type CommentsSectionProps = {
  projectId: string;
  relatedType?: string;
  relatedId?: string;
};

function CommentsSection({ projectId, relatedType, relatedId }: CommentsSectionProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Shared accessors used by both CommentsSection and CommentItem.
  const canPostComment = () => {
    if (!user) return false;
    return true;
  };

  const canCommentOnTask = (taskId: string) => {
    if (!user) return false;
    return false;
  };

  const canEditComment = (target: Comment) => {
    if (!user) return false;
    return target.author_id === user.id;
  };

  const canDeleteComment = (target: Comment) => {
    if (!user) return false;
    return target.author_id === user.id;
  };

  const extractMentions = (content: string) => {
    const mentionRegex = /@([a-zA-Z0-9@._-]+)/g;
    const matches = content.match(mentionRegex) || [];
    return matches.map((m) => m.replace(/^@/, ""));
  };
  const loadComments = async () => {
    if (!projectId) return;
    setLoading(true);
    let data: Comment[] | null = null;
    let error: any = null;
    try {
      const { data: d, error: e } = await supabase
        .from("comments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      data = d;
      error = e;
    } catch (caught) {
      error = caught;
    }
    if (!error && data) {
      setComments(data as Comment[]);
    } else {
      setComments((data || []) as Comment[]);
    }
    setLoading(false);
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;
    const mentionUsers = extractMentions(newComment);
    let inserted: any = null;
    let insertError: any = null;
    try {
      const { data: d, error: e } = await supabase
        .from("comments")
        .insert({
          project_id: projectId,
          author_id: user.id,
          content: newComment.trim(),
          related_object_type: relatedType || null,
          related_object_id: relatedId || null,
          mentions: mentionUsers,
        })
        .select()
        .single();
      inserted = d;
      insertError = e;
    } catch (caught) {
      insertError = caught;
    }
    if (!insertError && inserted) {
      setNewComment("");
      showToast("success", "Comment added");
      await loadComments();
      for (const mentionedUser of mentionUsers) {
        await createMentionNotification(mentionedUser, inserted.id, projectId, newComment);
      }
    } else {
      showToast("error", insertError?.message || "Failed to add comment");
    }
  };

  const createMentionNotification = async (mentionedUser: string, commentId: string, projectIdLocal: string, commentContent: string) => {
    const { data: userData } = await supabase
      .from("Profiles")
      .select("id")
      .eq("email", mentionedUser)
      .maybeSingle();
    if (userData?.id && userData.id !== user?.id) {
      const mentionSnippet = commentContent.substring(0, 100);
      const message = "You were mentioned in a comment: " + mentionSnippet + (commentContent.length > 100 ? "..." : "");
      const { error: richError } = await supabase.from("notifications").insert({
        user_id: userData.id,
        type: "mention",
        title: "You were mentioned in a comment",
        message,
        data: {
          comment_id: commentId,
          project_id: projectIdLocal,
          related_object_type: relatedType || "comment",
          related_object_id: relatedId || commentId,
        },
        created_at: new Date().toISOString(),
      });
      if (richError) {
        await supabase.from("notifications").insert({
          user_id: userData.id,
          project_id: projectIdLocal,
          type: "mention",
          title: "You were mentioned in a comment",
          message,
          created_at: new Date().toISOString(),
        });
      }
    }
  };

  const addReply = async (parentCommentId: string) => {
    if (!user || !replyContent.trim()) return;
    const parentComment = comments.find((c) => c.id === parentCommentId);
    if (!parentComment) return;
    const mentionUsers = extractMentions(replyContent);
    let inserted: any = null;
    let insertError: any = null;
    try {
      const { data: d, error: e } = await supabase
        .from("comments")
        .insert({
          project_id: projectId,
          author_id: user.id,
          content: replyContent.trim(),
          related_object_type: parentComment.related_object_type || null,
          related_object_id: parentComment.related_object_id || null,
          parent_id: parentCommentId,
          mentions: mentionUsers,
        })
        .select()
        .single();
      inserted = d;
      insertError = e;
    } catch (caught) {
      insertError = caught;
    }
    if (!insertError && inserted) {
      setReplyContent("");
      setReplyingTo(null);
      showToast("success", "Reply added");
      await loadComments();
      for (const mentionedUser of mentionUsers) {
        await createMentionNotification(mentionedUser, inserted.id, projectId, replyContent);
      }
    } else {
      showToast("error", insertError?.message || "Failed to add reply");
    }
  };

  const updateComment = async (commentId: string, updates: Partial<Comment>) => {
    let updateError: any = null;
    try {
      const { error: e } = await supabase
        .from("comments")
        .update(updates)
        .eq("id", commentId)
        .select()
        .single();
      updateError = e;
    } catch (caught) {
      updateError = caught;
    }
    if (!updateError) {
      showToast("success", "Comment updated");
      await loadComments();
      return true;
    } else {
      showToast("error", updateError?.message || "Failed to update comment");
      return false;
    }
  };

  const deleteComment = async (commentId: string) => {
    let deleteError: any = null;
    try {
      const { error: e } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);
      deleteError = e;
    } catch (caught) {
      deleteError = caught;
    }
    if (!deleteError) {
      showToast("success", "Comment deleted");
      await loadComments();
      return true;
    } else {
      showToast("error", "Failed to delete comment");
      return false;
    }
  };

  useEffect(() => {
    loadComments();
  }, [projectId, relatedType, relatedId]);

  if (loading) return <div className="loading-dot">{/* loading placeholder */}</div>;

  return (
    <div>
      <h3 style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Comments
        {canPostComment() && (
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ fontSize: "14px", padding: "4px 12px" }}
          >
            + New Comment
          </button>
        )}
      </h3>

      {comments.length === 0 ? (
        <p style={{ color: "#9CA3AF", fontSize: "14px" }}>No comments yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canEdit={canEditComment(comment)}
              canDelete={canDeleteComment(comment)}
              onUpdate={updateComment}
              onDelete={deleteComment}
              onReply={setReplyingTo}
              canCommentOnTask={canCommentOnTask}
              canModifyComment={canPostComment}
            />
          ))}
        </div>
      )}

      {canPostComment() && !replyingTo && (
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <input
            className="input"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
          />
          <button className="btn btn-primary" onClick={handleAddComment}>Post</button>
        </div>
      )}

      {replyingTo && (
        <div style={{ marginTop: "16px", padding: "12px", background: "#F9FAFB", borderRadius: "8px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: "13px", marginBottom: "8px" }}>Replying to comment...</div>
          <textarea
            className="input"
            rows={3}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write your reply..."
            style={{ marginBottom: "12px" }}
          />
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={() => setReplyingTo(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => addReply(replyingTo)}>Reply</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, canEdit, canDelete, onUpdate, onDelete, onReply, canCommentOnTask, canModifyComment }: {
  comment: Comment;
  canEdit: boolean;
  canDelete: boolean;
  onUpdate: (id: string, updates: Partial<Comment>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onReply: (id: string) => void;
  canCommentOnTask: (taskId: string) => boolean;
  canModifyComment: (commentId: string) => boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);

  const handleSave = async () => {
    const success = await onUpdate(comment.id, { content: editContent });
    if (success) setIsEditing(false);
  };

  const getMentionedUsers = (content: string) => {
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const matches = content.match(mentionRegex) || [];
    return matches.map((m) => m.substring(1));
  };

  return (
    <div style={{ padding: "12px", background: "#F9FAFB", borderRadius: "8px", border: "1px solid #E5E7EB" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600 }}>
          {comment.author_id?.slice(0, 8)} · {new Date(comment.created_at).toLocaleString()}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {comment.related_object_type && comment.related_object_id && (
            <span style={{ fontSize: "11px", color: "#6B7280", background: "#F3F4F6", padding: "2px 6px", borderRadius: "4px" }}>
              {comment.related_object_type} #{comment.related_object_id?.slice(0, 4)}
            </span>
          )}
          {comment.parent_id && (
            <span style={{ fontSize: "11px", color: "#6B7280", fontStyle: "italic" }}>Reply</span>
          )}
        </div>
      </div>

      {isEditing ? (
        <div>
          <textarea
            className="input"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{ marginBottom: "8px", minHeight: "60px" }}
          />
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button className="btn btn-sm btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
            <button className="btn btn-sm btn-primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: "14px", margin: 0 }}>{comment.content}</p>
          {comment.mentions && comment.mentions.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <span style={{ fontSize: "11px", color: "#F59E0B" }}>Mentions: </span>
              {comment.mentions?.map((mention, index) => (
                <span key={index} style={{ fontSize: "11px", color: "#F59E0B", fontWeight: 600 }}>
                  @{mention}{index < comment.mentions!.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: "12px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {!comment.parent_id && canModifyComment(comment.id) && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => onReply(comment.id)}
            style={{ fontSize: "11px" }}
          >
            Reply
          </button>
        )}
        {canEdit && !comment.parent_id && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setIsEditing(true)}
            style={{ fontSize: "11px" }}
          >
            Edit
          </button>
        )}
        {canDelete && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => onDelete(comment.id)}
            style={{ fontSize: "11px", color: "#DC2626", borderColor: "#FECACA" }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default CommentsSection;
