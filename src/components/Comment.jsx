import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Heart, MessageCircle, Pencil, Trash } from "lucide-react";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

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
  replyCount = 0,
  depth = 0,
  maxDepth = 4,
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
    <Box sx={{ 
      mb: depth === 0 ? 3 : 2, 
      pb: 2, 
      borderBottom: depth === 0 ? `1px solid ${theme.palette.divider}` : 'none',
      backgroundColor: depth > 0 ? `${theme.palette.action.hover}20` : 'transparent',
      borderRadius: depth > 0 ? 1 : 0,
      p: depth > 0 ? 1.5 : 0
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        {comment.headshotUrl && (
          <img
            src={comment.headshotUrl}
            alt={comment.displayName || "User avatar"}
            style={{ 
              width: depth > 0 ? 28 : 32, 
              height: depth > 0 ? 28 : 32, 
              borderRadius: "50%", 
              objectFit: "cover",
              border: depth > 0 ? `2px solid ${theme.palette.primary.main}40` : 'none'
            }}
          />
        )}
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ 
              fontWeight: 600, 
              fontSize: depth > 0 ? "0.8rem" : "0.875rem", 
              color: theme.palette.text.primary 
            }}
          >
            {comment.displayName || "Unknown user"}
          </Typography>
          {/* Show reply context if this comment is a reply */}
          {comment.replyToUser && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.text.secondary,
                fontSize: "0.7rem",
                display: 'block',
                mt: 0.25
              }}
            >
              <span style={{ color: theme.palette.primary.main }}>@{comment.replyToUser}</span>
              {comment.replyToText && (
                <span style={{ fontStyle: 'italic' }}> · "{comment.replyToText}"</span>
              )}
            </Typography>
          )}
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
          {comment.replyToUser && depth > 0 && (
            <Typography 
              component="span" 
              sx={{ 
                color: theme.palette.primary.main, 
                fontWeight: 500,
                mr: 0.5
              }}
            >
              @{comment.replyToUser}
            </Typography>
          )}
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
          {depth < maxDepth - 1 && (
            <button 
              onClick={() => onReply(comment)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: theme.palette.text.secondary,
                display: "flex",
                alignItems: "center",
                fontSize: "0.8rem",
                fontWeight: 500
              }}
              onMouseEnter={e => (e.currentTarget.style.color = theme.palette.primary.main)}
              onMouseLeave={e => (e.currentTarget.style.color = theme.palette.text.secondary)}
            >
              <MessageCircle style={{ width: 16, height: 16, marginRight: 4 }} /> Reply
            </button>
          )}
          <button 
            onClick={() => onLike(comment.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isLiked ? "#ef4444" : theme.palette.text.secondary,
              display: "flex",
              alignItems: "center",
              fontSize: "0.8rem",
              fontWeight: 500
            }}
            onMouseEnter={e => (e.currentTarget.style.color = isLiked ? "#dc2626" : "#ef4444")}
            onMouseLeave={e => (e.currentTarget.style.color = isLiked ? "#ef4444" : theme.palette.text.secondary)}
          >
            <Heart
              style={{
                width: 16,
                height: 16,
                marginRight: 4,
                stroke: isLiked ? "#ef4444" : "currentColor",
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

        {/* Reply count indicator - only show for top-level comments with replies */}
        {depth === 0 && replyCount > 0 && (
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.75rem",
              color: theme.palette.primary.main,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5
            }}
          >
            <MessageCircle size={12} /> {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Comment;