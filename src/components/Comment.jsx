import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Heart, MessageCircle, Pencil, Trash, Smile } from "lucide-react";
import { Box, Typography, Collapse } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import EmojiPicker from "./EmojiPicker";
import ReactionBar from "./ReactionBar";

const Comment = ({
  comment,
  onReply,
  onLike,
  onEmojiReaction,
  onEdit,
  onDelete,
  isEditing,
  editedText,
  setEditedText,
  onSubmitEdit,
  replyCount = 0,
  depth = 0,
  maxDepth = 4,
  userId,
  isNew = false
}) => {
  const theme = useTheme();


  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [reactions, setReactions] = useState({});
  const [userReactions, setUserReactions] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReplyPreview, setShowReplyPreview] = useState(false);
  const commentAddReactionButtonRef = useRef(null);

  useEffect(() => {
    if (!comment?.id || !comment?.postId) return;
    const user = getAuth().currentUser;
    if (!user) return;

    const userId = user.uid || user.email;
    const reactionsRef = collection(db, "posts", comment.postId, "comments", comment.id, "reactions");

    const unsubscribe = onSnapshot(reactionsRef, (snapshot) => {
      const reactionCounts = {};
      const userReactionStatus = {};
      let heartCount = 0;
      let userLikedHeart = false;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const emoji = data.emoji || "❤️";
        const reactionUserId = doc.id;
        
        // Handle legacy heart reactions and new emoji system
        if (emoji === "❤️") {
          heartCount++;
          if (reactionUserId === userId) {
            userLikedHeart = true;
          }
        }
        
        // Map emoji to key for new system
        const emojiKey = getEmojiKey(emoji);
        reactionCounts[emojiKey] = (reactionCounts[emojiKey] || 0) + 1;
        
        if (reactionUserId === userId) {
          userReactionStatus[emojiKey] = true;
        }
      });

      setLikeCount(heartCount);
      setIsLiked(userLikedHeart);
      setReactions(reactionCounts);
      setUserReactions(userReactionStatus);
    });

    return () => unsubscribe();
  }, [comment?.id, comment?.postId]);

  const getEmojiKey = (emoji) => {
    const emojiMap = {
      "👍": "thumbs_up",
      "❤️": "heart",
      "😂": "laughing",
      "😮": "wow",
      "😢": "sad",
      "🔥": "fire",
      "👏": "clap",
      "🎉": "celebration"
    };
    return emojiMap[emoji] || "heart";
  };

  const timestamp = comment.timestamp?.seconds
    ? new Date(comment.timestamp.seconds * 1000).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const handleEmojiReaction = (emojiKey, emoji) => {
    if (onEmojiReaction) {
      onEmojiReaction(comment.id, emojiKey, emoji);
    }
  };

  const handleReplyClick = () => {
    setShowReplyPreview(true);
    setTimeout(() => {
      setShowReplyPreview(false);
      onReply(comment);
    }, 300);
  };

  return (
    <Box sx={{ 
      mb: depth === 0 ? 3 : 2, 
      pb: 2, 
      borderBottom: depth === 0 ? `1px solid ${theme.palette.divider}` : 'none',
      backgroundColor: isNew 
        ? `${theme.palette.success.main}15` 
        : depth > 0 
          ? `${theme.palette.action.hover}20` 
          : 'transparent',
      borderRadius: depth > 0 ? 1 : 0,
      p: depth > 0 ? 1.5 : 0,
      border: isNew ? `2px solid ${theme.palette.success.main}40` : 'none',
      transition: 'all 0.3s ease-in-out',
      transform: isNew ? 'scale(1.02)' : 'scale(1)',
      animation: isNew ? 'slideInNew 0.5s ease-out' : 'none',
      '@keyframes slideInNew': {
        '0%': {
          opacity: 0,
          transform: 'translateY(-10px) scale(0.95)',
        },
        '100%': {
          opacity: 1,
          transform: 'translateY(0) scale(1.02)',
        }
      }
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
          <Box sx={{ position: 'relative' }}>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmitEdit();
                }
                if (e.key === "Escape") {
                  setEditedText(comment.text);
                  onEdit(null);
                }
              }}
              autoFocus
              style={{
                width: "100%",
                minHeight: "60px",
                padding: "0.75rem 1rem",
                fontSize: "0.95rem",
                lineHeight: "1.5",
                borderRadius: "8px",
                border: `2px solid ${theme.palette.primary.main}`,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                resize: "vertical",
                fontFamily: theme.typography.fontFamily,
                outline: "none",
                WebkitAppearance: 'none',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
              }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <button
              type="submit"
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#1e2d5f",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 500,
                fontSize: "0.875rem",
                cursor: "pointer",
                touchAction: "manipulation"
              }}
            >
              Update
            </button>
            <button
              type="button"
              onClick={() => {
                setEditedText(comment.text);
                onEdit(null);
              }}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "transparent",
                color: theme.palette.text.secondary,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: "6px",
                fontWeight: 500,
                fontSize: "0.875rem",
                cursor: "pointer",
                touchAction: "manipulation"
              }}
            >
              Cancel
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
      
      {/* Emoji Reactions Bar */}
      <ReactionBar
        reactions={reactions}
        userReactions={userReactions}
        onReactionClick={handleEmojiReaction}
        onAddReaction={() => setShowEmojiPicker(true)}
        commentId={comment.id}
        addButtonRef={commentAddReactionButtonRef}
      />
      
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
            <Box sx={{ position: 'relative' }}>
              <button 
                onClick={handleReplyClick}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: theme.palette.text.secondary,
                  display: "flex",
                  alignItems: "center",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  padding: "6px 10px",
                  marginLeft: "-10px",
                  borderRadius: "6px",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => (e.currentTarget.style.color = theme.palette.primary.main)}
                onMouseLeave={e => (e.currentTarget.style.color = theme.palette.text.secondary)}
                onTouchStart={e => (e.currentTarget.style.backgroundColor = theme.palette.action.hover)}
                onTouchEnd={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <MessageCircle style={{ width: 16, height: 16, marginRight: 4 }} /> Reply
              </button>
              
              {/* Reply Preview */}
              <Collapse in={showReplyPreview} timeout={200}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    mt: 0.5,
                    p: 1.5,
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    minWidth: 200,
                    maxWidth: 300,
                    boxShadow: theme.shadows[4],
                    zIndex: 1000
                  }}
                >
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
                    Replying to {comment.displayName}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mt: 0.5, 
                      fontSize: '0.8rem',
                      color: theme.palette.text.primary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {comment.text}
                  </Typography>
                </Box>
              </Collapse>
            </Box>
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
              fontWeight: 500,
              padding: "6px 10px",
              marginLeft: "-10px",
              borderRadius: "6px",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={e => (e.currentTarget.style.color = isLiked ? "#dc2626" : "#ef4444")}
            onMouseLeave={e => (e.currentTarget.style.color = isLiked ? "#ef4444" : theme.palette.text.secondary)}
            onTouchStart={e => (e.currentTarget.style.backgroundColor = theme.palette.action.hover)}
            onTouchEnd={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Heart
              style={{
                width: 16,
                height: 16,
                marginRight: 4,
                stroke: isLiked ? "#ef4444" : "currentColor",
                fill: isLiked ? "#ef4444" : "none",
                transition: "all 0.2s ease"
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
                  color: theme.palette.text.secondary,
                  padding: "6px",
                  marginLeft: "-6px",
                  borderRadius: "6px",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => (e.currentTarget.style.color = theme.palette.primary.main)}
                onMouseLeave={e => (e.currentTarget.style.color = theme.palette.text.secondary)}
                onTouchStart={e => (e.currentTarget.style.backgroundColor = theme.palette.action.hover)}
                onTouchEnd={e => (e.currentTarget.style.backgroundColor = "transparent")}
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
                  color: "#ef4444",
                  padding: "6px",
                  marginLeft: "-6px",
                  borderRadius: "6px",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#dc2626")}
                onMouseLeave={e => (e.currentTarget.style.color = "#ef4444")}
                onTouchStart={e => (e.currentTarget.style.backgroundColor = "#ef444420")}
                onTouchEnd={e => (e.currentTarget.style.backgroundColor = "transparent")}
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
      
      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={showEmojiPicker}
        onEmojiSelect={handleEmojiReaction}
        onClose={() => setShowEmojiPicker(false)}
        anchorEl={commentAddReactionButtonRef.current}
        userReactions={userReactions}
      />
    </Box>
  );
};

export default Comment;