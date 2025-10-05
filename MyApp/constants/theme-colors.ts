// 🌞 Light Mode & 🌙 Dark Mode Color System
export const Colors = {
  // Light Mode Colors
  light: {
    background: '#F0F8FF',        // Alice Blue - Soft, calming for farming vibes
    surface: '#FFFFFF',           // Pure white for cards
    primary: '#4CAF50',           // Fresh Green - Represents crops, action buttons
    secondary: '#FFC107',         // Amber - Reward elements, XP coins, badges
    navbar: '#1976D2',            // Blue - Space / NASA theme
    textPrimary: '#1E1E1E',       // Dark Gray - High readability
    textSecondary: '#555555',     // For hints or small info
    warning: '#FF5722',           // Deep Orange - For errors or low crop health
    success: '#8BC34A',           // Light Green - Crop thriving feedback
    border: '#E3F2FD',            // Light blue border
    shadow: '#000000',            // Black shadows for depth
  },
  
  // Dark Mode Colors
  dark: {
    background: '#121212',        // Almost Black - Classic dark mode base
    surface: '#1E1E1E',           // Dark surface for cards
    primary: '#81C784',           // Soft Green - Stands out on dark background
    secondary: '#FFD54F',         // Soft Amber - Rewards, badges pop out
    navbar: '#2196F3',            // Bright Blue - NASA / space touch
    textPrimary: '#FFFFFF',       // High contrast on dark background
    textSecondary: '#B0B0B0',     // Less important info
    warning: '#FF7043',           // Orange - Crop issues or mistakes
    success: '#AED581',           // Light Green - Crop thriving feedback
    border: '#333333',            // Dark borders
    shadow: '#222222',            // Lighter shadows for card depth
  },
  
  // Gradient Colors
  gradients: {
    light: {
      primary: ['#4CAF50', '#388E3C'],      // Light green gradient
      secondary: ['#FFC107', '#FF8F00'],     // Amber gradient
      background: ['#F0F8FF', '#E3F2FD'],   // Light blue gradient
      navbar: ['#1976D2', '#1565C0'],       // Blue gradient
      success: ['#8BC34A', '#689F38'],      // Success gradient
    },
    dark: {
      primary: ['#81C784', '#66BB6A'],      // Dark green gradient
      secondary: ['#FFD54F', '#FFCA28'],     // Dark amber gradient
      background: ['#121212', '#1E1E1E'],   // Dark gradient
      navbar: ['#2196F3', '#1976D2'],       // Dark blue gradient
      success: ['#AED581', '#9CCC65'],      // Dark success gradient
    },
  },
};

// Spacing System
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
};

// Typography System
export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
};

// Shadow System
export const Shadows = {
  light: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  dark: {
    sm: {
      shadowColor: '#222222',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#222222',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#222222',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

// Theme Colors Helper
export const getThemeColors = (isDark: boolean) => {
  const theme = isDark ? Colors.dark : Colors.light;
  const gradients = isDark ? Colors.gradients.dark : Colors.gradients.light;
  const shadows = isDark ? Shadows.dark : Shadows.light;
  
  return {
    // Core Colors
    background: theme.background,
    surface: theme.surface,
    primary: theme.primary,
    secondary: theme.secondary,
    navbar: theme.navbar,
    
    // Text Colors
    text: theme.textPrimary,
    textSecondary: theme.textSecondary,
    
    // State Colors
    success: theme.success,
    warning: theme.warning,
    
    // Layout Colors
    border: theme.border,
    shadow: theme.shadow,
    
    // Gradients
    gradients,
    
    // Shadows
    shadows,
    
    // Card Colors with proper contrast
    card: theme.surface,
    cardBorder: theme.border,
    
    // Input Colors
    input: isDark ? '#2C2C2C' : '#F8F9FA',
    inputBorder: isDark ? '#404040' : '#E0E0E0',
    placeholder: isDark ? '#888888' : '#666666',
    
    // Button States
    buttonPrimary: theme.primary,
    buttonSecondary: theme.secondary,
    buttonDisabled: isDark ? '#404040' : '#E0E0E0',
    
    // Status Colors
    online: theme.success,
    offline: isDark ? '#666666' : '#999999',
    loading: isDark ? '#FFD54F' : '#FFC107',
  };
};