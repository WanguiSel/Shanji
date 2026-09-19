import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/Card";
import { Loading, EmptyState } from "../../components/Loading";
import { useToast } from "../../hooks/useToast";
import type { Comment } from "../../types";

function CommentsSection({ projectId, relatedType, relatedId }: { projectId: string; relatedType?: string; relatedId?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const loadComments = async () => {
    if (!projectId) return;
    setLoading(true);
    let query = supabase
      .from("comments")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (relatedType) query = query.eq("related_object_type", relatedType);
    if (relatedId) query = query.eq("related_object_id", relatedId);

    const { data, error } = await query;
    if (error) {
      showToast("error", "Failed to load comments");
      return;
    }
    setComments((data || []) as Comment[]);
    setLoading(false);
  };

  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const matches = content.match(mentionRegex) || [];
    return matches.map((m) => m.substring(1)); // Remove @ symbol
  };

  const canPostComment = () => {
    if (!user) return false;
    if (!projectId) return false;
    
    const projectRoles = user.project_roles || {};
    if (projectRoles[projectId]) {
      return true;
    }
    
    if (relatedType && relatedId) {
      if (relatedType === "workplan_item") {
        return canCommentOnTask(relatedId);
      }
    }
    
    return projectRoles[projectId]?.includes("admin");
  };

  const canCommentOnTask = (taskId: string) => {
    if (!user) return false;
    const projectRoles = user.project_roles || {};
    if (projectRoles[projectId]) {
      if (projectRoles[projectId] === "admin" || projectRoles[projectId] === "project_manager") return true;
    }
    
    const task = comments.find((c) => c.related_object_id === taskId && c.related_object_type === "workplan_item");
    if (task) {
      if (task.author_id === user.id) return true;
      if (task.responsible_user_id === user.id) return true;
    }
    
    return false;
  };

  const canEditComment = (comment: Comment) => {
    if (!user) return false;
    return comment.author_id === user.id;
  };

  const canDeleteComment = (comment: Comment) => {
    if (!user) return false;
    return comment.author_id === user.id;
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    const mentionUsers = extractMentions(newComment);
    const commentData = {
      project_id: projectId,
      author_id: user.id,
      content: newComment.trim(),
      related_object_type: relatedType || null,
      related_object_id: relatedId || null,
      mentions: mentionUsers,
    };

    const { data, error } = await supabase
      .from("comments")
      .insert(commentData)
      .select()
      .single();

    if (!error && data) {
      setNewComment("");
      showToast("success", "Comment added");
      await loadComments();
      
      for (const mentionedUser of mentionUsers) {
        await createMentionNotification(mentionedUser, data.id, projectId, newComment);
      }
    }
  };

  const createMentionNotification = async (mentionedUser: string, commentId: string, projectId: string, commentContent: string) => {
    const { data: userData } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", mentionedUser)
      .single();

    if (userData?.id && userData.id !== user?.id) {
      await supabase.from("notifications").insert({
        user_id: userData.id,
        type: "mention",
        title: "You were mentioned in a comment",
        message: `You were mentioned in a comment: "${commentContent.substring(0, 100)}..."`,
        data: {
          comment_id: commentId,
          project_id: projectId,
          related_object_type: relatedType || "comment",
          related_object_id: relatedId || commentId,
        },
        created_at: new Date().toISOString(),
      });
    }
  };

  const addReply = async (parentCommentId: string) => {
    if (!user || !replyContent.trim()) return;

    const parentComment = comments.find((c) => c.id === parentCommentId);
    if (!parentComment) return;

    const mentionUsers = extractMentions(replyContent);
    const replyData = {
      project_id: projectId,
      author_id: user.id,
      content: replyContent.trim(),
      related_object_type: parentComment.related_object_type || null,
      related_object_id: parentComment.related_object_id || null,
      parent_id: parentCommentId,
      mentions: mentionUsers,
    };

    const { data, error } = await supabase
      .from("comments")
      .insert(replyData)
      .select()
      .single();

    if (!error && data) {
      setReplyContent("");
      setReplyingTo(null);
      showToast("success", "Reply added");
      await loadComments();
      
      for (const mentionedUser of mentionUsers) {
        await createMentionNotification(mentionedUser, data.id, projectId, replyContent);
      }
    }
  };

  const updateComment = async (commentId: string, updates: Partial<Comment>) => {
    const { error } = await supabase
      .from("comments")
      .update(updates)
      .eq("id", commentId)
      .select()
      .single();

    if (!error) {
      showToast("success", "Comment updated");
      await loadComments();
      return true;
    } else {
      showToast("error", "Failed to update comment");
      return false;
    }
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (!error) {
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

  if (loading) return <Loading />;

  return (
    <div>
      <h3 style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Comments
        {canPostComment() && (
            <button
              className="btn btn-primary"
              onClick={() => showToast("info", "Type your comment below and submit")}
              style={{ fontSize: '14px', padding: '4px 12px' }}
            >
              + New Comment
            </button>
        )}
      </h3>

      {comments.length === 0 ? (
        <p style={{ color: '#9CA3AF', fontSize: '14px' }}>No comments yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canEdit={canEditComment(comment)}
              canDelete={canDeleteComment(comment)}
              onUpdate={updateComment}
              onDelete={deleteComment}
              onReply={setReplyingTo}
            />
          ))}
        </div>
      )}

      {canPostComment() && !replyingTo && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <input
            className="input"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
          />
          <button className="btn btn-primary" onClick={handleAddComment}>Post</button>
        </div>
      )}

      {replyingTo && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '13px', marginBottom: '8px' }}>Replying to comment...</div>
          <textarea
            className="input"
            rows={3}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write your reply..."
            style={{ marginBottom: '12px' }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setReplyingTo(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => addReply(replyingTo)}>Reply</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, canEdit, canDelete, onUpdate, onDelete, onReply }: {
  comment: Comment;
  canEdit: boolean;
  canDelete: boolean;
  onUpdate: (id: string, updates: Partial<Comment>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onReply: (id: string) => void;
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
    <div style={{ padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600 }}>
          {comment.author_id?.slice(0, 8)} • {new Date(comment.created_at).toLocaleString()}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {comment.related_object_type && comment.related_object_id && (
            <span style={{ fontSize: '11px', color: '#6B7280', background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
              {comment.related_object_type} #{comment.related_object_id?.slice(0, 4)}
            </span>
          )}
          {comment.parent_id && (
            <span style={{ fontSize: '11px', color: '#6B7280', fontStyle: 'italic' }}>Reply</span>
          )}
        </div>
      </div>

      {isEditing ? (
        <div>
          <textarea
            className="input"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{ marginBottom: '8px', minHeight: '60px' }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn btn-sm btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
            <button className="btn btn-sm btn-primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '14px', margin: 0 }}>{comment.content}</p>
          {comment.mentions && comment.mentions.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: '#F59E0B' }}>Mentions: </span>
              {comment.mentions?.map((mention, index) => (
                <span key={index} style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 600 }}>
                  @{mention}{index < comment.mentions!.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {!comment.parent_id && canPostComment() && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => onReply(comment.id)}
            style={{ fontSize: '11px' }}
          >
            Reply
          </button>
        )}
        {canEdit && !comment.parent_id && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setIsEditing(true)}
            style={{ fontSize: '11px' }}
          >
            Edit
          </button>
        )}
        {canDelete && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => onDelete(comment.id)}
            style={{ fontSize: '11px', color: '#DC2626', borderColor: '#FECACA' }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default CommentsSection;

function canPostComment(): boolean {
  const { user } = useAuth();
  const { id: projectId, relatedType, relatedId } = useParams<{ id: string; relatedType?: string; relatedId?: string }>();

  if (!user || !projectId) return false;

  const projectRoles = user.project_roles || {};
  if (projectRoles[projectId]) {
    return true;
  }

  if (relatedType && relatedId) {
    if (relatedType === "workplan_item") {
      return canCommentOnTask(relatedId);
    }
  }

  return projectRoles[projectId]?.includes("admin");
}

function canCommentOnTask(taskId: string): boolean {
  const { user } = useAuth();
  const { id: projectId } = useParams<{ id: string }>();

  if (!user || !projectId) return false;

  const projectRoles = user.project_roles || {};
  if (projectRoles[projectId]) {
    if (projectRoles[projectId] === "admin" || projectRoles[projectId] === "project_manager") return true;
  }

  return false;
}

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' },
};