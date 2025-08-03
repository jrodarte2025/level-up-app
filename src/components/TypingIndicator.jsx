import React from "react";
import { Box, Typography, Fade } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const TypingIndicator = ({ typingUsers = [], postId }) => {
  const theme = useTheme();

  if (!typingUsers || typingUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].displayName} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing...`;
    } else {
      return `${typingUsers[0].displayName} and ${typingUsers.length - 1} others are typing...`;
    }
  };

  return (
    <Fade in={true} timeout={300}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          backgroundColor: theme.palette.action.hover,
          borderRadius: 1,
          mb: 1,
          border: `1px solid ${theme.palette.divider}`,
          '@keyframes pulse': {
            '0%': { opacity: 0.8 },
            '50%': { opacity: 1 },
            '100%': { opacity: 0.8 }
          },
          animation: 'pulse 2s infinite'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 0.25,
            alignItems: 'center'
          }}
        >
          {/* Typing dots animation */}
          <Box
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: theme.palette.primary.main,
              '@keyframes typingDot': {
                '0%, 60%, 100%': {
                  transform: 'translateY(0)',
                  opacity: 0.4
                },
                '30%': {
                  transform: 'translateY(-8px)',
                  opacity: 1
                }
              },
              animation: 'typingDot 1.4s infinite ease-in-out',
              animationDelay: '0s'
            }}
          />
          <Box
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: theme.palette.primary.main,
              animation: 'typingDot 1.4s infinite ease-in-out',
              animationDelay: '0.2s'
            }}
          />
          <Box
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: theme.palette.primary.main,
              animation: 'typingDot 1.4s infinite ease-in-out',
              animationDelay: '0.4s'
            }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontStyle: 'italic',
            fontSize: '0.75rem'
          }}
        >
          {getTypingText()}
        </Typography>
      </Box>
    </Fade>
  );
};

export default TypingIndicator;