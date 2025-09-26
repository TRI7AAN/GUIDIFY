/**
 * GUIDIFY Theme Configuration
 * 
 * This file centralizes all theme variables for the application.
 * It follows the dark + neon green aesthetic as specified in the requirements.
 */

export const theme = {
  colors: {
    // Background colors
    background: {
      primary: '#0D0C1D',      // Deep space blue (very dark)
      secondary: '#12131A',    // Slightly lighter dark for contrast
      card: 'rgba(255, 255, 255, 0.05)', // Glass card background
    },
    
    // Text colors
    text: {
      primary: '#F0F8FF',     // Cyber white for main text
      secondary: '#D0BFFF',    // Lucid lavender for secondary text
      accent: '#39FF14',       // Neon green for accents and highlights
    },
    
    // Brand colors
    brand: {
      primary: '#39FF14',      // Neon green primary brand color
      secondary: '#D0BFFF',    // Lucid lavender secondary brand color
    },
    
    // UI element colors
    ui: {
      border: 'rgba(255, 255, 255, 0.1)', // Glass border
      hover: 'rgba(57, 255, 20, 0.2)',     // Hover state with neon green
      focus: 'rgba(57, 255, 20, 0.4)',     // Focus state with neon green
      shadow: '0 0 15px rgba(57, 255, 20, 0.5), 0 0 30px rgba(57, 255, 20, 0.3)', // Neon glow shadow
    },
    
    // Status colors
    status: {
      success: '#39FF14',      // Success state (neon green)
      error: '#FF3366',        // Error state (neon red)
      warning: '#FFCC00',      // Warning state (neon yellow)
      info: '#00CCFF',         // Info state (neon blue)
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      primary: '"Sora", sans-serif',
      secondary: '"Inter", sans-serif',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
    },
  },
  
  // Spacing
  spacing: {
    xs: '0.25rem',      // 4px
    sm: '0.5rem',       // 8px
    md: '1rem',         // 16px
    lg: '1.5rem',       // 24px
    xl: '2rem',         // 32px
    '2xl': '2.5rem',    // 40px
    '3xl': '3rem',      // 48px
  },
  
  // Border radius
  borderRadius: {
    sm: '0.25rem',      // 4px
    md: '0.5rem',       // 8px
    lg: '1rem',         // 16px
    xl: '1.5rem',       // 24px
    full: '9999px',     // Circular
  },
  
  // Animations
  animation: {
    fast: '0.2s',
    medium: '0.3s',
    slow: '0.5s',
  },
  
  // Z-index
  zIndex: {
    base: 1,
    dropdown: 10,
    sticky: 100,
    fixed: 200,
    modal: 300,
    popover: 400,
    tooltip: 500,
  },
  
  // Breakpoints for responsive design
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
    glow: '0 0 15px rgba(57, 255, 20, 0.5), 0 0 30px rgba(57, 255, 20, 0.3)',
    glowStrong: '0 0 25px rgba(57, 255, 20, 0.7), 0 0 50px rgba(57, 255, 20, 0.5)',
  },
};

// CSS variables string for global styles
export const cssVariables = `
  :root {
    /* Colors */
    --deep-space-blue: ${theme.colors.background.primary};
    --emerald-neon: ${theme.colors.brand.primary};
    --lucid-lavender: ${theme.colors.brand.secondary};
    --cyber-white: ${theme.colors.text.primary};
    --glass-bg: ${theme.colors.background.card};
    --glass-border: ${theme.colors.ui.border};
    
    /* Typography */
    --font-primary: ${theme.typography.fontFamily.primary};
    --font-secondary: ${theme.typography.fontFamily.secondary};
    
    /* Animations */
    --animation-fast: ${theme.animation.fast};
    --animation-medium: ${theme.animation.medium};
    --animation-slow: ${theme.animation.slow};
    
    /* Shadows */
    --shadow-glow: ${theme.shadows.glow};
    --shadow-glow-strong: ${theme.shadows.glowStrong};
  }
`;

export default theme;