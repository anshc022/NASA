import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

interface TutorialScreenProps {
  navigation: any;
}

export default function TutorialScreen({ navigation }: TutorialScreenProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const startGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('FarmSelection');
  };

  const tutorialSteps = [
    {
      icon: 'leaf',
      title: 'Welcome to Fasal Seva! 🌱',
      description: 'Learn sustainable farming through an interactive game powered by NASA satellite data and AI recommendations.',
      color: theme.colors.primary,
    },
    {
      icon: 'water',
      title: 'Manage Water Resources 💧',
      description: 'Monitor soil moisture levels and irrigate your crops based on real weather data. Too much or too little water can harm your crops!',
      color: theme.colors.info,
    },
    {
      icon: 'nutrition',
      title: 'Optimize Nutrition 🌱',
      description: 'Add fertilizers to boost crop growth, but be mindful of sustainability. Organic options are better for the environment.',
      color: theme.colors.success,
    },
    {
      icon: 'shield',
      title: 'Control Pests 🐛',
      description: 'Protect your crops from pests and diseases. Use integrated pest management for the best results.',
      color: theme.colors.warning,
    },
    {
      icon: 'analytics',
      title: 'Track Your Progress 📊',
      description: 'Monitor crop health, soil conditions, and your sustainability score. Aim for high yields while maintaining environmental balance.',
      color: theme.colors.accent,
    },
    {
      icon: 'trophy',
      title: 'Achieve Success! 🏆',
      description: 'Complete 30 days of farming to see your final results. Your goal is to maximize both yield and sustainability.',
      color: theme.colors.warning,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={isDark 
          ? ['#000000', '#1C1C1E', '#2C2C2E'] 
          : ['#F2F2F7', '#FFFFFF', '#F9F9F9']
        }
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 8, 16), paddingBottom: 100 }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              How to Play 📚
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Master the art of sustainable farming
            </Text>
          </View>

          {/* Tutorial Steps */}
          {tutorialSteps.map((step, index) => (
            <Card key={index} variant="glass" style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: step.color + '20' }]}>
                  <Text style={[styles.stepNumberText, { color: step.color }]}>
                    {index + 1}
                  </Text>
                </View>
                <Ionicons name={step.icon as any} size={24} color={step.color} />
              </View>
              
              <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
                {step.title}
              </Text>
              
              <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
                {step.description}
              </Text>
            </Card>
          ))}

          {/* Game Mechanics */}
          <Card variant="gradient" style={styles.mechanicsCard}>
            <View style={styles.mechanicsHeader}>
              <Ionicons name="game-controller" size={24} color={theme.colors.primary} />
              <Text style={[styles.mechanicsTitle, { color: theme.colors.text }]}>
                Game Mechanics
              </Text>
            </View>
            
            <View style={styles.mechanicsList}>
              <View style={styles.mechanicItem}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                <Text style={[styles.mechanicText, { color: theme.colors.textSecondary }]}>
                  Each action costs resources and affects your farm
                </Text>
              </View>
              
              <View style={styles.mechanicItem}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                <Text style={[styles.mechanicText, { color: theme.colors.textSecondary }]}>
                  Weather conditions change daily based on NASA data
                </Text>
              </View>
              
              <View style={styles.mechanicItem}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                <Text style={[styles.mechanicText, { color: theme.colors.textSecondary }]}>
                  AI provides smart recommendations for optimal farming
                </Text>
              </View>
              
              <View style={styles.mechanicItem}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                <Text style={[styles.mechanicText, { color: theme.colors.textSecondary }]}>
                  Balance productivity with environmental sustainability
                </Text>
              </View>
            </View>
          </Card>

          {/* Tips */}
          <Card variant="default" style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={24} color={theme.colors.warning} />
              <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>
                Pro Tips 💡
              </Text>
            </View>
            
            <View style={styles.tipsList}>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                • 🌦️ Check weather conditions before taking actions
              </Text>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                • 🤖 Follow AI recommendations for better results
              </Text>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                • ⚖️ Balance is key - avoid overwatering or over-fertilizing
              </Text>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                • 🌱 Sustainable practices lead to higher scores
              </Text>
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                • 📊 Monitor all indicators regularly
              </Text>
            </View>
          </Card>

          {/* Action Button */}
          <Button
            title="Start Your Farm Journey! 🚀"
            onPress={startGame}
            variant="primary"
            size="large"
            style={styles.startButton}
            icon={<Ionicons name="rocket" size={20} color="#FFFFFF" />}
          />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  stepCard: {
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  mechanicsCard: {
    marginBottom: 20,
    marginTop: 8,
  },
  mechanicsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mechanicsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  mechanicsList: {
  },
  mechanicItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mechanicText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  tipsCard: {
    marginBottom: 24,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsList: {
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  startButton: {
    marginBottom: 20,
  },
});