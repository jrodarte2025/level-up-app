import React, { useState, useRef, useEffect } from "react";
import { Box, Typography, IconButton, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Send, X } from "lucide-react";
import { useTyping } from "../contexts/TypingContext";

const CommentInput = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = "Write a comment...",
  isSubmitting = false,
  replyTo = null,
  replyToUser = null,
  replyToText = null,
  autoFocus = false,
  maxRows = 8,
  minRows = 1,
  postId
}) => {
  const theme = useTheme();
  const textareaRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [rows, setRows] = useState(minRows);
  const { startTyping, stopTyping } = useTyping();

  // Auto-focus when needed
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      // For mobile, scroll into view
      setTimeout(() => {
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [autoFocus]);

  // Auto-expand textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      
      const lineHeight = parseInt(window.getComputedStyle(textareaRef.current).lineHeight);
      const paddingTop = parseInt(window.getComputedStyle(textareaRef.current).paddingTop);
      const paddingBottom = parseInt(window.getComputedStyle(textareaRef.current).paddingBottom);
      
      const contentHeight = textareaRef.current.scrollHeight - paddingTop - paddingBottom;
      const newRows = Math.max(minRows, Math.min(maxRows, Math.ceil(contentHeight / lineHeight)));
      
      setRows(newRows);
      
      // Set the actual height to prevent jumping
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value, minRows, maxRows]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() || isSubmitting) return;
    
    // Stop typing indicator when submitting
    if (postId) {
      stopTyping(postId);
    }
    
    onSubmit(e);
  };

  const handleChange = (newValue) => {
    onChange(newValue);
    
    // Start typing indicator when user types
    if (postId && newValue.trim()) {
      startTyping(postId);
    } else if (postId && !newValue.trim()) {
      stopTyping(postId);
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (desktop) or with modifier key on mobile
    if (e.key === 'Enter' && !e.shiftKey) {
      // On mobile, require cmd/ctrl for submit to allow natural line breaks
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (!isMobile || e.metaKey || e.ctrlKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    }
    
    // Cancel reply on Escape
    if (e.key === 'Escape' && replyTo) {
      if (postId) {
        stopTyping(postId);
      }
      onCancel?.();
    }
  };

  const handleFocus = () => {
    setFocused(true);
    // Ensure keyboard doesn't cover input on mobile
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      setTimeout(() => {
        window.scrollTo(0, window.scrollY + 100);
      }, 300);
    }
  };

  return (
    <Box sx={{ position: 'relative', mb: 2 }}>
      {replyTo && (
        <Box sx={{ 
          fontSize: "0.875rem", 
          mb: 1.5, 
          p: 1.5,
          backgroundColor: theme.palette.action.hover,
          borderRadius: 1,
          borderLeft: `4px solid ${theme.palette.primary.main}`,
          color: theme.palette.text.primary,
          position: 'relative'
        }}>
          <IconButton
            size="small"
            onClick={onCancel}
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              color: theme.palette.text.secondary,
              '&:hover': {
                color: theme.palette.error.main
              }
            }}
          >
            <X size={16} />
          </IconButton>
          <Typography variant="body2" sx={{ mb: 0.5, pr: 3 }}>
            Replying to <strong>{replyToUser}</strong>
          </Typography>
          {replyToText && (
            <Typography variant="caption" sx={{ 
              color: theme.palette.text.secondary, 
              fontStyle: 'italic',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              pr: 3
            }}>
              "{replyToText}"
            </Typography>
          )}
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        <Box sx={{ 
          position: 'relative',
          backgroundColor: theme.palette.background.paper,
          borderRadius: focused ? 2 : '24px',
          border: `2px solid ${focused ? theme.palette.primary.main : theme.palette.divider}`,
          transition: 'all 0.2s ease',
          overflow: 'hidden'
        }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={() => {
              setFocused(false);
              // Stop typing indicator when losing focus
              if (postId) {
                stopTyping(postId);
              }
            }}
            placeholder={placeholder}
            disabled={isSubmitting}
            rows={rows}
            style={{
              width: '100%',
              padding: focused ? '12px 48px 12px 16px' : '12px 48px 12px 20px',
              fontSize: '1rem',
              lineHeight: '1.5',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              color: theme.palette.text.primary,
              fontFamily: theme.typography.fontFamily,
              resize: 'none',
              transition: 'padding 0.2s ease',
              WebkitAppearance: 'none',
              // Better mobile text input
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            }}
          />
          
          <IconButton
            onClick={handleSubmit}
            disabled={!value.trim() || isSubmitting}
            sx={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              backgroundColor: value.trim() && !isSubmitting ? theme.palette.primary.main : 'transparent',
              color: value.trim() && !isSubmitting ? '#fff' : theme.palette.text.disabled,
              '&:hover': {
                backgroundColor: value.trim() && !isSubmitting ? theme.palette.primary.dark : 'transparent',
              },
              '&:disabled': {
                backgroundColor: 'transparent',
              },
              transition: 'all 0.2s ease',
              width: 32,
              height: 32
            }}
          >
            {isSubmitting ? (
              <CircularProgress size={18} sx={{ color: theme.palette.primary.main }} />
            ) : (
              <Send size={18} />
            )}
          </IconButton>
        </Box>

        {/* Mobile hint */}
        {focused && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block', 
              mt: 0.5, 
              color: theme.palette.text.secondary,
              fontSize: '0.75rem'
            }}
          >
            Tip: Use Shift+Enter for new line
          </Typography>
        )}
      </form>
    </Box>
  );
};

export default CommentInput;