import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Heart, MessageCircle, Pencil, Trash } from "lucide-react";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link } from "react-router-dom";

const Comment = ({
  comment,
  onReply,
  onLike,
  onEdit,
  onDelete,
  isEditing,
  editedText,
  setEditedText,
  onSubmitEdit,
  suppressReplies = false,
  replyCount = 0,
  depth = 0,
  userId
}) => {
  const theme = useTheme();


  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!comment?.id || !comment?.postId) return;
    const user = getAuth().currentUser;
    if (!user) return;

    const userId = user.uid || user.email;
    const reactionsRef = collection(db, "posts", comment.postId, "comments", comment.id, "reactions");

    const unsubscribe = onSnapshot(reactionsRef, (snapshot) => {
      setLikeCount(snapshot.size);
      const liked = snapshot.docs.some((doc) => doc.id === userId);
      setIsLiked(liked);
    });

    return () => unsubscribe();
  }, [comment?.id, comment?.postId]);

  const timestamp = comment.timestamp?.seconds
    ? new Date(comment.timestamp.seconds * 1000).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <Box sx={{ mb: 3, pb: 2, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        {comment.headshotUrl && (
          <img
            src={comment.headshotUrl}
            alt={comment.displayName || "User avatar"}
            style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
          />
        )}
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, fontSize: "0.875rem", color: theme.palette.text.primary }}
          >
            {comment.displayName || "Unknown user"}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary }}
          >
            {timestamp}
          </Typography>
        </Box>
      </Box>
      {isEditing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitEdit();
          }}
        >
          <input
            type="text"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              fontSize: "0.95rem",
              borderRadius: "8px",
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary
            }}
          />
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <button
              type="submit"
              style={{
                padding: "0.35rem 0.75rem",
                backgroundColor: "#1e2d5f",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 500,
                cursor: "pointer"
              }}
            >
              Update
            </button>
          </Box>
        </form>
      ) : (
        <Typography variant="body1" sx={{ mt: 1, color: theme.palette.text.primary, lineHeight: 1.65 }}>
          {comment.text}
        </Typography>
      )}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 1.25,
          fontSize: "0.85rem",
          color: theme.palette.text.secondary,
        }}
      >
        <Box sx={{ display: "flex", gap: 2 }}>
          {depth < 1 && (
            <button onClick={() => onReply(comment)}>
              <MessageCircle style={{ width: 16, height: 16, marginRight: 4 }} /> Reply
            </button>
          )}
          <button onClick={() => onLike(comment.id)}>
            <Heart
              style={{
                width: 16,
                height: 16,
                marginRight: 4,
                stroke: isLiked ? "#ef4444" : theme.palette.text.secondary,
                fill: isLiked ? "#ef4444" : "none"
              }}
            />
            {likeCount}
          </button>
          {comment.userId === userId && (
            <>
              <button
                onClick={() => onEdit(comment)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: theme.palette.text.secondary
                }}
                onMouseEnter={e => (e.currentTarget.style.color = theme.palette.primary.main)}
                onMouseLeave={e => (e.currentTarget.style.color = theme.palette.text.secondary)}
                title="Edit"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => onDelete(comment)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#ef4444"
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#dc2626")}
                onMouseLeave={e => (e.currentTarget.style.color = "#ef4444")}
                title="Delete"
              >
                <Trash size={16} />
              </button>
            </>
          )}
        </Box>

        {replyCount > 0 && (
          <Link
            to={`/post/${comment.postId}/comment/${comment.id}`}
            style={{
              fontSize: "0.8rem",
              color: theme.palette.primary.main,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              textDecoration: "none"
            }}
          >
            <MessageCircle size={14} /> View thread ({replyCount})
          </Link>
        )}
      </Box>
      {!suppressReplies && comment.replies?.length > 0 && depth < 1 && (
        <Box
          sx={{
            mt: 2,
            pl: 2,
            borderLeft: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.default,
            borderRadius: 1
          }}
        >
          {comment.replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onLike={onLike}
              onEdit={onEdit}
              onDelete={onDelete}
              isEditing={isEditing && reply.id === comment.id}
              editedText={editedText}
              setEditedText={setEditedText}
              onSubmitEdit={onSubmitEdit}
              suppressReplies={suppressReplies}
              depth={depth + 1}
              replyCount={reply.replyCount}
              userId={userId}
            />
          ))}
        </Box>
      )}
      {depth === 1 && (
        <Typography variant="caption" sx={{ fontSize: "0.75rem", color: theme.palette.text.secondary, mb: 0.5 }}>
          Replying to {comment.replyingToName || "a comment"}:
        </Typography>
      )}
      {depth === 0 && (
        <Box sx={{ mb: 6 }} />
      )}
    </Box>
  );
};

export default Comment;