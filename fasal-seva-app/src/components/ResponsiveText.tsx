import React from 'react';
import { Text, TextStyle, Dimensions, Platform } from 'react-native';
import { useTheme } from '../theme/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ResponsiveTextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'button';
  color?: string;
  style?: TextStyle;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
}

// Calculate responsive font sizes based on screen dimensions
const getResponsiveFontSize = (baseSize: number): number => {
  const scale = screenWidth / 375; // Base on iPhone 8 width
  const newSize = baseSize * scale;
  
  // Ensure minimum and maximum sizes
  if (newSize < baseSize * 0.8) return baseSize * 0.8;
  if (newSize > baseSize * 1.2) return baseSize * 1.2;
  
  return Math.round(newSize);
};

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
  adjustsFontSizeToFit = false,
}) => {
  const { theme } = useTheme();

  const getFontStyle = (): TextStyle => {
    const baseStyles = {
      h1: {
        fontSize: getResponsiveFontSize(32),
        fontWeight: '700' as const,
        lineHeight: getResponsiveFontSize(38),
        letterSpacing: -0.5,
      },
      h2: {
        fontSize: getResponsiveFontSize(28),
        fontWeight: '600' as const,
        lineHeight: getResponsiveFontSize(34),
        letterSpacing: -0.3,
      },
      h3: {
        fontSize: getResponsiveFontSize(24),
        fontWeight: '600' as const,
        lineHeight: getResponsiveFontSize(30),
        letterSpacing: -0.2,
      },
      h4: {
        fontSize: getResponsiveFontSize(20),
        fontWeight: '600' as const,
        lineHeight: getResponsiveFontSize(26),
        letterSpacing: -0.1,
      },
      body: {
        fontSize: getResponsiveFontSize(16),
        fontWeight: '400' as const,
        lineHeight: getResponsiveFontSize(24),
        letterSpacing: 0,
      },
      caption: {
        fontSize: getResponsiveFontSize(12),
        fontWeight: '400' as const,
        lineHeight: getResponsiveFontSize(16),
        letterSpacing: 0.5,
      },
      button: {
        fontSize: getResponsiveFontSize(16),
        fontWeight: '600' as const,
        lineHeight: getResponsiveFontSize(20),
        letterSpacing: 0.5,
      },
    };

    return {
      ...baseStyles[variant],
      color: color || theme.colors.text,
      fontFamily: Platform.select({
        ios: 'System',
        android: 'Roboto',
        default: 'System',
      }),
    };
  };

  return (
    <Text
      style={[getFontStyle(), style]}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      allowFontScaling={false} // Prevents system font scaling issues
    >
      {children}
    </Text>
  );
};