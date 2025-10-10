// src/brandColors.js
// Level Up Cincinnati Brand Color Palette
//
// USAGE GUIDELINES:
// - Primary Colors (60% of design): Use for headlines, primary text, navigation, primary buttons, major sections
// - Secondary Colors (30% of design): Use for secondary backgrounds, card backgrounds, borders, less prominent UI
// - Accent Colors (10% of design): Use sparingly for visual interest and special highlights
// - Functional Colors: Use for specific states (success, error, warning)
// - Neutrals: Foundation colors for text and backgrounds

export const brandColors = {
  primary: {
    blue: '#18264E',      // Primary Blue - Trust & professionalism (headlines, nav, primary buttons)
    coral: '#F15F5E',     // Primary Coral - Energy & warmth (CTAs, links, active states, hover)
  },
  secondary: {
    softBlue: '#6B7BA8',     // Soft Blue - Secondary backgrounds, borders, less prominent UI
    lightCoral: '#FFA69E',   // Light Coral - Hover states, secondary accents, softer highlights
  },
  accent: {
    mutedGray: '#d8d9df',    // Muted Blue-Gray - Subtle backgrounds, dividers, muted elements
    teal: '#4CAFB6',         // Accent Teal - Fresh accents, special highlights, complementary color
  },
  functional: {
    success: '#10b981',      // Success Green - Success messages, achievements, positive indicators
  },
  neutral: {
    deepGray: '#111827',     // Deep Gray - Body text, primary content
    mediumGray: '#4b5563',   // Medium Gray - Secondary text, captions, labels
    lightGray: '#9ca3af',    // Light Gray - Placeholder text, disabled states, tertiary content
    offWhite: '#f3f4f6',     // Off White - Section backgrounds, alternating content areas
    white: '#ffffff',        // Pure White - Main backgrounds, card surfaces
  },
};

// CSS Variable names for use in styled-components or inline styles
export const brandColorVars = {
  primary: {
    blue: 'var(--brand-primary-blue)',
    coral: 'var(--brand-primary-coral)',
  },
  secondary: {
    softBlue: 'var(--brand-soft-blue)',
    lightCoral: 'var(--brand-light-coral)',
  },
  accent: {
    mutedGray: 'var(--brand-muted-gray)',
    teal: 'var(--brand-accent-teal)',
  },
  functional: {
    success: 'var(--brand-success)',
  },
  neutral: {
    deepGray: 'var(--brand-deep-gray)',
    mediumGray: 'var(--brand-medium-gray)',
    lightGray: 'var(--brand-light-gray)',
    offWhite: 'var(--brand-off-white)',
    white: 'var(--brand-white)',
  },
};

// Helper function to get color with opacity
export const withOpacity = (color, opacity) => {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default brandColors;
