'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Comment, CommentEntityType } from '@/types';
import { MessageSquare, Send, MoreHorizontal, Edit2, Trash2, Reply } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface CommentsProps {
  entityType: CommentEntityType;
  entityId: string;
  teamId?: string;
}

export function Comments({ entityType, entityId, teamId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const supabase = createClient();

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true });

    if (data) {
      // Organize into threads
      const topLevel = data.filter(c => !c.parent_id);
      const withReplies = topLevel.map(comment => ({
        ...comment,
        replies: data.filter(c => c.parent_id === comment.id),
      }));
      setComments(withReplies);
    }
    setLoading(false);
  }, [supabase, entityType, entityId]);

  useEffect(() => {
    fetchComments();

    // Subscribe to new comments
    const channel = supabase
      .channel(`comments-${entityType}-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `entity_id=eq.${entityId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, entityType, entityId, fetchComments]);

  const handleSubmit = async (parentId?: string) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from('comments').insert({
      entity_type: entityType,
      entity_id: entityId,
      team_id: teamId,
      user_id: user.id,
      content: content.trim(),
      parent_id: parentId || null,
    });

    if (!error) {
      if (parentId) {
        setReplyContent('');
        setReplyingTo(null);
      } else {
        setNewComment('');
      }
      fetchComments();
    }
    setSubmitting(false);
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    await supabase
      .from('comments')
      .update({ content: editContent.trim(), edited_at: new Date().toISOString() })
      .eq('id', commentId);

    setEditingId(null);
    setEditContent('');
    fetchComments();
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    await supabase.from('comments').delete().eq('id', commentId);
    fetchComments();
  };

  if (loading) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--text-muted)' }}>
        Loading comments...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      <div className="flex gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <MessageSquare className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => handleSubmit()}
              disabled={!newComment.trim() || submitting}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              <Send className="w-4 h-4" />
              Comment
            </button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      {comments.length === 0 ? (
        <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              editingId={editingId}
              editContent={editContent}
              replyingTo={replyingTo}
              replyContent={replyContent}
              onStartEdit={(id, content) => {
                setEditingId(id);
                setEditContent(content);
              }}
              onCancelEdit={() => {
                setEditingId(null);
                setEditContent('');
              }}
              onEditChange={setEditContent}
              onSaveEdit={handleEdit}
              onDelete={handleDelete}
              onStartReply={setReplyingTo}
              onCancelReply={() => {
                setReplyingTo(null);
                setReplyContent('');
              }}
              onReplyChange={setReplyContent}
              onSubmitReply={() => handleSubmit(comment.id)}
              submitting={submitting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  editingId: string | null;
  editContent: string;
  replyingTo: string | null;
  replyContent: string;
  onStartEdit: (id: string, content: string) => void;
  onCancelEdit: () => void;
  onEditChange: (content: string) => void;
  onSaveEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStartReply: (id: string) => void;
  onCancelReply: () => void;
  onReplyChange: (content: string) => void;
  onSubmitReply: () => void;
  submitting: boolean;
  isReply?: boolean;
}

function CommentItem({
  comment,
  editingId,
  editContent,
  replyingTo,
  replyContent,
  onStartEdit,
  onCancelEdit,
  onEditChange,
  onSaveEdit,
  onDelete,
  onStartReply,
  onCancelReply,
  onReplyChange,
  onSubmitReply,
  submitting,
  isReply = false,
}: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isEditing = editingId === comment.id;
  const isReplying = replyingTo === comment.id;

  return (
    <div className={isReply ? 'ml-10' : ''}>
      <div className="flex gap-3 group">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold"
          style={{ background: isReply ? 'var(--text-muted)' : 'var(--accent)' }}
        >
          {comment.user?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              {comment.user?.email || 'User'}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.edited_at && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(edited)</span>
            )}
          </div>

          {isEditing ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => onEditChange(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-1 rounded text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => onSaveEdit(comment.id)}
                  className="px-3 py-1 rounded text-sm font-medium"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
              {comment.content}
            </p>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isReply && (
                <button
                  onClick={() => onStartReply(comment.id)}
                  className="flex items-center gap-1 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Reply className="w-3 h-3" />
                  Reply
                </button>
              )}
              <button
                onClick={() => onStartEdit(comment.id, comment.content)}
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-xs text-red-500"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          )}

          {/* Reply Input */}
          {isReplying && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => onReplyChange(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                autoFocus
              />
              <button
                onClick={onCancelReply}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={onSubmitReply}
                disabled={!replyContent.trim() || submitting}
                className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                Reply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              editingId={editingId}
              editContent={editContent}
              replyingTo={replyingTo}
              replyContent={replyContent}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onEditChange={onEditChange}
              onSaveEdit={onSaveEdit}
              onDelete={onDelete}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onReplyChange={onReplyChange}
              onSubmitReply={onSubmitReply}
              submitting={submitting}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}
