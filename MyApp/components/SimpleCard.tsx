import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';

interface SimpleCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
  onPress?: () => void;
  gradient?: [string, string];
  // Keep emoji for backward compatibility
  emoji?: string;
}

export default function SimpleCard({
  title,
  value,
  icon,
  emoji,
  subtitle,
  onPress,
  gradient,
}: SimpleCardProps) {
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');

  const CardContent = (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        {icon ? (
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <Ionicons name={icon} size={20} color="#FFFFFF" />
          </View>
        ) : (
          <Text style={styles.emoji}>{emoji}</Text>
        )}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
    </View>
  );

  if (gradient && onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        <LinearGradient colors={gradient} style={styles.gradientCard}>
          <View style={styles.header}>
            {icon ? (
              <View style={styles.gradientIconContainer}>
                <Ionicons name={icon} size={20} color="#FFFFFF" />
              </View>
            ) : (
              <Text style={styles.emoji}>{emoji}</Text>
            )}
            <Text style={[styles.title, styles.gradientText]}>{title}</Text>
          </View>
          <Text style={[styles.value, styles.gradientValueText]}>{value}</Text>
          {subtitle && <Text style={[styles.subtitle, styles.gradientSubtitleText]}>{subtitle}</Text>}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
}

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
    height: '100%',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    flex: 1,
    justifyContent: 'center',
  },
  gradientCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  gradientIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Gradient card text styles with better contrast
  gradientText: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gradientValueText: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontWeight: 'bold',
  },
  gradientSubtitleText: {
    color: '#F1F5F9',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});