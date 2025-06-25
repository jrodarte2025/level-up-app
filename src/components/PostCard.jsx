import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { Link } from "react-router-dom";
import { MessageCircle, Heart, Link as LinkIcon } from "lucide-react";
import { Paper, Typography, Box, Divider, Chip } from "@mui/material";

const PostCard = ({ post, onCommentClick, onLikeClick, onEditClick }) => {
  const [imageError, setImageError] = React.useState(false);

  const date = post.timestamp?.seconds
    ? new Date(post.timestamp.seconds * 1000).toLocaleDateString()
    : "";

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
            {(post.role || "")
              .split("-")
              .filter(Boolean)
              .map((role) => (
                <Chip
                  key={role}
                  label={role.charAt(0).toUpperCase() + role.slice(1)}
                  size="small"
                  sx={{ fontSize: "0.7rem", textTransform: "capitalize" }}
                />
              ))}
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
      <Divider sx={{ mt: 2.5, mb: 1.25 }} />
      <Box display="flex" gap={2} alignItems="center" sx={{ mt: 2, opacity: 0.7 }}>
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
            "&:hover": { color: "primary.main" },
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
        <Box
          component="button"
          onClick={() => onLikeClick(post.id)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            border: "none",
            background: "none",
            color: "text.secondary",
            cursor: "pointer",
            "&:hover": { color: "error.main" },
          }}
        >
          <Heart
            size={18}
            style={{
              fill: post.isLiked ? "#ef4444" : "none",
              stroke: post.isLiked ? "#ef4444" : "currentColor"
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: (theme) => theme.palette.text.secondary }}
          >
            {post.reactionCount || 0}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default PostCard;