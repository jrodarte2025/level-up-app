// src/theme.js
import { createTheme } from '@mui/material/styles';

// Level Up Cincinnati Brand Colors
const brandColors = {
  primary: {
    blue: '#18264E',
    coral: '#F15F5E',
  },
  secondary: {
    softBlue: '#6B7BA8',
    lightCoral: '#FFA69E',
  },
  accent: {
    mutedGray: '#d8d9df',
    teal: '#4CAFB6',
  },
  functional: {
    success: '#10b981',
  },
  neutral: {
    deepGray: '#111827',
    mediumGray: '#4b5563',
    lightGray: '#9ca3af',
    offWhite: '#f3f4f6',
    white: '#ffffff',
  },
};

export const getTheme = (mode = 'light') => createTheme({
  palette: {
    mode,
    primary: {
      main: brandColors.primary.blue,
      contrastText: brandColors.neutral.white,
    },
    secondary: {
      main: brandColors.primary.coral,
      contrastText: brandColors.neutral.white,
    },
    success: {
      main: brandColors.functional.success,
    },
    ...(mode === 'light'
      ? {
          background: {
            default: brandColors.neutral.offWhite,
            paper: brandColors.neutral.white,
          },
          text: {
            primary: brandColors.neutral.deepGray,
            secondary: brandColors.neutral.mediumGray,
          },
        }
      : {
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
          text: {
            primary: '#ffffff',
            secondary: '#bbbbbb',
          },
        }),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});