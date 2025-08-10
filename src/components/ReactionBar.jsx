import React, { useState, useEffect } from "react";
import { Box, Typography, Chip, Fade } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Plus } from "lucide-react";
import "./animations.css";

const EMOJI_MAP = {
  thumbs_up: "👍",
  heart: "❤️",
  laughing: "😂",
  wow: "😮",
  sad: "😢",
  fire: "🔥",
  clap: "👏",
  celebration: "🎉"
};

const ReactionBar = ({ 
  reactions = {}, 
  userReactions = {}, 
  onReactionClick, 
  onAddReaction,
  disabled = false,
  commentId,
  addButtonRef
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [animatingReactions, setAnimatingReactions] = useState(new Set());

  // Convert reactions object to array with counts
  const reactionArray = Object.entries(reactions)
    .filter(([key, count]) => count > 0)
    .map(([key, count]) => ({
      key,
      emoji: EMOJI_MAP[key] || "❓",
      count,
      isUserReaction: userReactions[key] || false
    }))
    .sort((a, b) => b.count - a.count); // Sort by count, most popular first

  if (reactionArray.length === 0) {
    return (
      <Box
        sx={{
          minHeight: 24,
          display: 'flex',
          alignItems: 'center',
          mt: 0
        }}
      >
        <Chip
          ref={addButtonRef}
          icon={<Plus size={12} />}
          label="React"
          size="small"
          variant="outlined"
          onClick={onAddReaction}
          disabled={disabled}
          sx={{
            height: 24,
            fontSize: '0.7rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            borderColor: theme.palette.divider,
            color: theme.palette.text.secondary,
            opacity: 0.7,
            transition: 'opacity 0.2s',
            '&:hover': {
              opacity: 1,
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
              backgroundColor: `${theme.palette.primary.main}08`
            }
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        mt: 0,
        alignItems: 'center'
      }}
    >
      {reactionArray.map((reaction) => (
        <Chip
          key={reaction.key}
          className="reaction-button"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography 
                component="span" 
                sx={{ 
                  fontSize: '0.8rem',
                  animation: animatingReactions.has(reaction.key) ? 'reactionPop 0.3s ease-in-out' : 'none'
                }}
              >
                {reaction.emoji}
              </Typography>
              <Typography 
                component="span" 
                sx={{ 
                  fontSize: '0.7rem',
                  fontWeight: reaction.isUserReaction ? 600 : 400,
                  color: reaction.isUserReaction 
                    ? theme.palette.primary.main 
                    : theme.palette.text.secondary,
                  animation: animatingReactions.has(reaction.key) ? 'reactionCountIncrement 0.3s ease-in-out' : 'none'
                }}
              >
                {reaction.count}
              </Typography>
            </Box>
          }
          size="small"
          variant={reaction.isUserReaction ? "filled" : "outlined"}
          onClick={() => {
            setAnimatingReactions(prev => new Set(prev).add(reaction.key));
            setTimeout(() => {
              setAnimatingReactions(prev => {
                const newSet = new Set(prev);
                newSet.delete(reaction.key);
                return newSet;
              });
            }, 300);
            onReactionClick(reaction.key, reaction.emoji);
          }}
          disabled={disabled}
          sx={{
            height: 24,
            cursor: disabled ? 'not-allowed' : 'pointer',
            backgroundColor: reaction.isUserReaction 
              ? `${theme.palette.primary.main}20` 
              : 'transparent',
            borderColor: reaction.isUserReaction 
              ? theme.palette.primary.main 
              : theme.palette.divider,
            color: reaction.isUserReaction 
              ? theme.palette.primary.main 
              : theme.palette.text.secondary,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: reaction.isUserReaction 
                ? `${theme.palette.primary.main}30`
                : `${theme.palette.primary.main}08`,
              borderColor: theme.palette.primary.main,
              transform: 'scale(1.05)'
            },
            '&:active': {
              transform: 'scale(0.95)'
            }
          }}
        />
      ))}
      
      {/* Add reaction button */}
      <Fade in={isHovered || reactionArray.length > 0} timeout={200}>
        <Chip
          ref={addButtonRef}
          icon={<Plus size={12} />}
          size="small"
          variant="outlined"
          onClick={onAddReaction}
          disabled={disabled}
          sx={{
            height: 24,
            minWidth: 32,
            cursor: disabled ? 'not-allowed' : 'pointer',
            borderColor: theme.palette.divider,
            color: theme.palette.text.secondary,
            opacity: isHovered ? 1 : 0.6,
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
              backgroundColor: `${theme.palette.primary.main}08`,
              opacity: 1,
              transform: 'scale(1.05)'
            }
          }}
        />
      </Fade>
    </Box>
  );
};

export default ReactionBar;