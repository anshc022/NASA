import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  interpolateColor 
} from 'react-native-reanimated';

interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export default function ThemeToggle({ size = 'medium', style }: ThemeToggleProps) {
  const { colorScheme, themeMode, toggleTheme } = useTheme();
  const isDark = colorScheme === 'dark';

  const sizes = {
    small: { container: 32, icon: 16 },
    medium: { container: 40, icon: 20 },
    large: { container: 48, icon: 24 },
  };

  const colors = {
    light: {
      background: '#F1F5F9',
      border: '#E2E8F0',
      icon: '#64748B',
    },
    dark: {
      background: '#334155',
      border: '#475569',
      icon: '#F1F5F9',
    },
  };

  const currentColors = isDark ? colors.dark : colors.light;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withSpring(
        interpolateColor(
          isDark ? 1 : 0,
          [0, 1],
          [colors.light.background, colors.dark.background]
        )
      ),
      borderColor: withSpring(
        interpolateColor(
          isDark ? 1 : 0,
          [0, 1],
          [colors.light.border, colors.dark.border]
        )
      ),
    };
  });

  const handleToggle = () => {
    toggleTheme();
  };

  return (
    <TouchableOpacity
      onPress={handleToggle}
      style={[styles.container, style]}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.button,
          {
            width: sizes[size].container,
            height: sizes[size].container,
            borderRadius: sizes[size].container / 2,
          },
          animatedStyle,
        ]}
      >
        <Ionicons
          name={
            themeMode === 'system' 
              ? 'phone-portrait-outline' 
              : isDark 
                ? 'moon' 
                : 'sunny'
          }
          size={sizes[size].icon}
          color={currentColors.icon}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});