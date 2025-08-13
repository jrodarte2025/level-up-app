import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import { MessageCircle, Heart, Link as LinkIcon } from "lucide-react";
import { Paper, Typography, Box, Divider, Chip } from "@mui/material";
import ReactionBar from "./ReactionBar";
import EmojiPicker from "./EmojiPicker";

const PostCard = ({ post, onCommentClick, onLikeClick, onEmojiReaction, onEditClick }) => {
  const [imageError, setImageError] = React.useState(false);
  const [commentImageErrors, setCommentImageErrors] = React.useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const addReactionButtonRef = useRef(null);

  const date = post.timestamp?.seconds
    ? new Date(post.timestamp.seconds * 1000).toLocaleDateString()
    : "";

  // Process reactions for ReactionBar
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

  // Convert post reactions to format expected by ReactionBar
  const processedReactions = {};
  const userReactions = {};
  
  if (post.reactions) {
    Object.entries(post.reactions).forEach(([emoji, count]) => {
      const key = getEmojiKey(emoji);
      processedReactions[key] = count;
    });
  }

  const handleEmojiClick = (emojiKey, emoji) => {
    if (onEmojiReaction) {
      onEmojiReaction(post.id, emojiKey, emoji);
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        mb: 3,
        p: 3,
        borderRadius: 2,
        transition: "background-color 0.2s, box-shadow 0.2s",
        "&:hover": {
          backgroundColor: (theme) => theme.palette.action.hover,
          boxShadow: 3,
          cursor: "pointer",
        },
        boxShadow: 1,
        border: "1px solid",
        borderColor: (theme) => theme.palette.divider,
      }}
    >
      {post.type && (
        <Chip
          label={post.type}
          size="small"
          sx={{
            mb: 1,
            backgroundColor: "#FCD8CE",
            color: "#D23F3F",
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "capitalize"
          }}
        />
      )}
      {post.title && (
        <Box sx={{ mt: 2.5 }}>
          <Typography
            variant="body1"
            fontWeight={600}
            gutterBottom
            sx={{ lineHeight: 1.4, color: (theme) => theme.palette.text.primary }}
          >
            {post.title}
          </Typography>
        </Box>
      )}
      {post.body && (
        <Box sx={{ mt: post.title ? 1.25 : 0 }}>
          {/* Check if content is HTML (new posts) or Markdown (legacy posts) */}
          {post.body.includes('<') && post.body.includes('>') ? (
            <Box
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(post.body, {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3'],
                  ALLOWED_ATTR: ['href', 'target', 'rel']
                })
              }}
              sx={{
                '& p': {
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  lineHeight: 1.65,
                  marginBottom: '1em',
                  color: (theme) => theme.palette.text.primary,
                  wordBreak: 'break-word',
                },
                '& strong, & b': {
                  fontWeight: 600,
                },
                '& em, & i': {
                  fontStyle: 'italic',
                },
                '& a': {
                  color: '#1e40af',
                  textDecoration: 'underline',
                  '&:hover': {
                    color: '#1e3a8a',
                  },
                },
                '& ul, & ol': {
                  paddingLeft: '1.5rem',
                  margin: '0.5em 0',
                },
                '& li': {
                  marginBottom: '0.25em',
                },
                '& blockquote': {
                  borderLeft: '3px solid #e5e7eb',
                  marginLeft: 0,
                  marginRight: 0,
                  paddingLeft: '1rem',
                  color: '#6b7280',
                  fontStyle: 'italic',
                },
                '& pre': {
                  backgroundColor: '#f3f4f6',
                  borderRadius: '0.375rem',
                  color: '#111827',
                  fontFamily: 'monospace',
                  fontSize: '0.875em',
                  padding: '0.75rem 1rem',
                  overflowX: 'auto',
                },
                '& code': {
                  backgroundColor: '#f3f4f6',
                  borderRadius: '0.25rem',
                  color: '#111827',
                  fontFamily: 'monospace',
                  fontSize: '0.875em',
                  padding: '0.125rem 0.25rem',
                },
                '& h1, & h2, & h3': {
                  fontWeight: 600,
                  lineHeight: 1.3,
                  marginTop: '1em',
                  marginBottom: '0.5em',
                },
                '& h1': { fontSize: '1.5rem' },
                '& h2': { fontSize: '1.25rem' },
                '& h3': { fontSize: '1.125rem' },
              }}
            />
          ) : (
            /* Fallback for legacy Markdown posts */
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize]}
              components={{
                h1: () => null,
                h2: () => null,
                p: ({ node, ...props }) => (
                  <Typography
                    component="p"
                    sx={{
                      fontSize: {
                        xs: "0.9rem",
                        sm: "1rem",
                        md: "1rem"
                      },
                      lineHeight: 1.65,
                      mb: 1.5,
                      color: (theme) => theme.palette.text.primary,
                      wordBreak: "break-word"
                    }}
                    {...props}
                  />
                ),
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#1e40af",
                      textDecoration: "underline"
                    }}
                  />
                ),
                strong: ({ node, ...props }) => (
                  <strong style={{ fontWeight: 600 }}>{props.children}</strong>
                ),
                em: ({ node, ...props }) => (
                  <em style={{ fontStyle: "italic" }}>{props.children}</em>
                )
              }}
            >
              {post.body}
            </ReactMarkdown>
          )}
        </Box>
      )}
      {post.link && (
        <Box sx={{ mt: 1 }}>
          <Typography
            component="a"
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: "inline-block",
              color: "#1e2a78",
              fontWeight: 500,
              textDecoration: "underline",
              fontSize: "0.95rem",
              wordBreak: "break-word"
            }}
          >
            {post.link}
          </Typography>
        </Box>
      )}
      {post.imageUrl && (
        <Box sx={{ mt: 1.5 }}>
          <img
            src={post.imageUrl}
            alt="Post attachment"
            style={{
              width: "100%",
              maxHeight: "500px",
              objectFit: "cover",
              borderRadius: "12px"
            }}
          />
        </Box>
      )}
      <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1.25 }}>
        {post.headshotUrl && !imageError ? (
          <img
            src={post.headshotUrl}
            alt={post.displayName}
            onError={() => setImageError(true)}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              objectFit: "cover"
            }}
          />
        ) : (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#374151"
            }}
          >
            {post.displayName?.charAt(0) || "?"}
          </Box>
        )}
        <Box>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontSize: "0.8rem" }}
          >
            {post.displayName || "Unknown User"} · {date}
          </Typography>
          <Box sx={{ mt: 0.5, mb: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {post.role === "coach-board" ? (
              <Chip
                label="Coach + Board"
                size="small"
                sx={{ fontSize: "0.7rem" }}
              />
            ) : post.role ? (
              <Chip
                label={post.role.charAt(0).toUpperCase() + post.role.slice(1)}
                size="small"
                sx={{ fontSize: "0.7rem", textTransform: "capitalize" }}
              />
            ) : null}
            {post.alumni && (
              <Chip
                label="Alumni"
                size="small"
                color="info"
                sx={{ fontSize: "0.7rem", textTransform: "capitalize" }}
              />
            )}
          </Box>
        </Box>
      </Box>
      {/* Comment Previews */}
      {post.recentComments && post.recentComments.length > 0 && (
        <Box sx={{ mt: { xs: 2, sm: 2.5 }, mb: 1.25 }}>
          <Divider sx={{ mb: { xs: 1.5, sm: 2 } }} />
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary', 
              fontWeight: 600, 
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              mb: { xs: 1, sm: 1.5 },
              display: 'block'
            }}
          >
            Recent Comments
          </Typography>
          {post.recentComments.map((comment, index) => (
            <Box
              key={comment.id}
              sx={{
                mb: index < post.recentComments.length - 1 ? { xs: 1, sm: 1.5 } : 0,
                p: { xs: 1, sm: 1.5 },
                backgroundColor: (theme) => theme.palette.action.hover,
                borderRadius: 1,
                borderLeft: '3px solid',
                borderLeftColor: (theme) => theme.palette.primary.main,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: (theme) => theme.palette.action.selected,
                  transform: 'translateX(2px)'
                },
                '&:active': {
                  transform: 'translateX(1px)',
                  backgroundColor: (theme) => theme.palette.action.selected,
                }
              }}
              onClick={() => onCommentClick(post.id)}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: { xs: 0.5, sm: 1 }, 
                mb: 0.5,
                flexWrap: { xs: 'wrap', sm: 'nowrap' }
              }}>
                {comment.headshotUrl && !commentImageErrors[comment.id] ? (
                  <img
                    src={comment.headshotUrl}
                    alt={comment.displayName}
                    onError={() => {
                      setCommentImageErrors(prev => ({ ...prev, [comment.id]: true }));
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: '#1e2a78',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      color: 'white',
                      flexShrink: 0
                    }}
                  >
                    {comment.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </Box>
                )}
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: { xs: '120px', sm: '160px' }
                  }}
                >
                  {comment.displayName || 'Unknown User'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: { xs: '0.65rem', sm: '0.7rem' },
                    flexShrink: 0
                  }}
                >
                  {comment.timestamp?.seconds
                    ? new Date(comment.timestamp.seconds * 1000).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric'
                      })
                    : ''}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: '0.8rem', sm: '0.85rem' },
                  lineHeight: 1.4,
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: { xs: 3, sm: 2 },
                  WebkitBoxOrient: 'vertical',
                  pl: { xs: 3, sm: 3.5 },
                  wordBreak: 'break-word'
                }}
              >
                {comment.text}
              </Typography>
            </Box>
          ))}
          {post.commentCount > post.recentComments.length && (
            <Box
              sx={{
                mt: 1,
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onClick={() => onCommentClick(post.id)}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'primary.main',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                View {post.commentCount - post.recentComments.length} more comments
              </Typography>
            </Box>
          )}
        </Box>
      )}
      
      <Divider sx={{ mt: post.recentComments && post.recentComments.length > 0 ? 1.25 : 2.5, mb: 1.25 }} />
      <Box display="flex" gap={2} alignItems="center" sx={{ mt: 2 }}>
        {/* Emoji Reactions */}
        <ReactionBar
          reactions={processedReactions}
          userReactions={userReactions}
          onReactionClick={handleEmojiClick}
          onAddReaction={() => setShowEmojiPicker(true)}
          commentId={post.id}
          addButtonRef={addReactionButtonRef}
        />
        
        <Box
          component="button"
          onClick={() => onCommentClick(post.id)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            border: "none",
            background: "none",
            color: "text.secondary",
            cursor: "pointer",
            opacity: 0.7,
            transition: "opacity 0.2s",
            "&:hover": { 
              color: "primary.main",
              opacity: 1
            },
          }}
        >
          <MessageCircle size={18} />
          <Typography
            variant="caption"
            sx={{ color: (theme) => theme.palette.text.secondary }}
          >
            {post.commentCount || 0}
          </Typography>
        </Box>
      </Box>
      
      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={showEmojiPicker}
        onEmojiSelect={handleEmojiClick}
        onClose={() => setShowEmojiPicker(false)}
        anchorEl={addReactionButtonRef.current}
        userReactions={userReactions}
      />
    </Box>
  );
};

export default PostCard;