import React, { useState, useRef, useEffect } from "react";
import { Box, Fade, Paper, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import "./animations.css";

const EMOJI_OPTIONS = [
  { emoji: "👍", name: "thumbs up", key: "thumbs_up" },
  { emoji: "❤️", name: "heart", key: "heart" },
  { emoji: "😂", name: "laughing", key: "laughing" },
  { emoji: "😮", name: "wow", key: "wow" },
  { emoji: "😢", name: "sad", key: "sad" },
  { emoji: "🔥", name: "fire", key: "fire" },
  { emoji: "👏", name: "clap", key: "clap" },
  { emoji: "🎉", name: "celebration", key: "celebration" }
];

const EmojiPicker = ({ 
  isOpen, 
  onEmojiSelect, 
  onClose, 
  anchorEl,
  userReactions = {},
  disabled = false
}) => {
  const theme = useTheme();
  const pickerRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && anchorEl && pickerRef.current) {
      const anchorRect = anchorEl.getBoundingClientRect();
      const pickerRect = pickerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = anchorRect.top - pickerRect.height - 8;
      let left = anchorRect.left + (anchorRect.width / 2) - (pickerRect.width / 2);

      // Adjust if picker would go off screen
      if (top < 8) {
        top = anchorRect.bottom + 8;
      }
      if (left < 8) {
        left = 8;
      }
      if (left + pickerRect.width > viewportWidth - 8) {
        left = viewportWidth - pickerRect.width - 8;
      }

      setPosition({ top, left });
    }
  }, [isOpen, anchorEl]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Fade in={isOpen} timeout={200}>
      <Paper
        ref={pickerRef}
        className="emoji-picker-container"
        elevation={8}
        sx={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 9999,
          borderRadius: 2,
          p: 1.5,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          minWidth: 280,
          maxWidth: 320
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 1,
            color: theme.palette.text.secondary,
            fontWeight: 600,
            fontSize: '0.75rem'
          }}
        >
          Quick Reactions
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0.5
          }}
        >
          {EMOJI_OPTIONS.map((option) => {
            const isSelected = userReactions[option.key];
            return (
              <Box
                key={option.key}
                component="button"
                onClick={() => {
                  if (!disabled) {
                    onEmojiSelect(option.key, option.emoji);
                    onClose();
                  }
                }}
                disabled={disabled}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 1,
                  borderRadius: 1.5,
                  border: 'none',
                  backgroundColor: isSelected 
                    ? `${theme.palette.primary.main}20` 
                    : 'transparent',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  minHeight: 48,
                  opacity: disabled ? 0.5 : 1,
                  '&:hover': {
                    backgroundColor: disabled 
                      ? 'transparent' 
                      : isSelected 
                        ? `${theme.palette.primary.main}30`
                        : theme.palette.action.hover,
                    transform: disabled ? 'none' : 'scale(1.1)'
                  },
                  '&:active': {
                    transform: disabled ? 'none' : 'scale(0.95)'
                  }
                }}
              >
                <Typography
                  sx={{
                    fontSize: '1.25rem',
                    lineHeight: 1,
                    mb: 0.25
                  }}
                >
                  {option.emoji}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.6rem',
                    color: theme.palette.text.secondary,
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {option.name}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>
    </Fade>
  );
};

export default EmojiPicker;