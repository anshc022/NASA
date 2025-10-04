import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'gradient';
  style?: ViewStyle;
  blurIntensity?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
  blurIntensity = 80,
}) => {
  const { theme, isDark } = useTheme();

  const baseStyle: ViewStyle = {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.medium,
  };

  if (variant === 'glass') {
    return (
      <BlurView
        intensity={blurIntensity}
        tint={isDark ? 'dark' : 'light'}
        style={[
          baseStyle,
          {
            backgroundColor: theme.colors.glass,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          },
          style,
        ]}
      >
        {children}
      </BlurView>
    );
  }

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={[
          theme.colors.surface,
          theme.colors.surfaceVariant,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[baseStyle, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        baseStyle,
        {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};