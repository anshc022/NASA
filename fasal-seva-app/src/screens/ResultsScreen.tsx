import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

const { width: screenWidth } = Dimensions.get('window');

interface ResultsScreenProps {
  navigation: any;
  route: {
    params?: {
      gameResult?: {
        day: number;
        score: number;
        water: number;
        nutrients: number;
        pestLevel: number;
        cropHealth: number;
      };
      finalResult?: {
        yieldScore: number;
        waterEfficiency: number;
        sustainability: number;
        dataUtilization: number;
        educationalProgress: number;
        totalScore: number;
        grade: string;
        achievements: string[];
      }
    };
  };
}

export default function ResultsScreen({ navigation, route }: ResultsScreenProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const legacy = route.params?.gameResult;
  const final = route.params?.finalResult;

  const playAgain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Home');
  };

  const viewTutorial = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Tutorial');
  };

  const getFinalGrade = (score: number) => {
    if (score >= 900) return { grade: 'A+', color: theme.colors.success, emoji: '🏆' };
    if (score >= 800) return { grade: 'A', color: theme.colors.success, emoji: '🌟' };
    if (score >= 700) return { grade: 'B+', color: theme.colors.primary, emoji: '👍' };
    if (score >= 600) return { grade: 'B', color: theme.colors.primary, emoji: '👌' };
    if (score >= 500) return { grade: 'C+', color: theme.colors.warning, emoji: '📈' };
    if (score >= 400) return { grade: 'C', color: theme.colors.warning, emoji: '⚠️' };
    return { grade: 'D', color: theme.colors.error, emoji: '📚' };
  };

  const gradeInfo = final
    ? { grade: final.grade, color: final.totalScore >= 85 ? theme.colors.success : final.totalScore >= 70 ? theme.colors.primary : theme.colors.warning, emoji: final.totalScore >= 90 ? '🏆' : final.totalScore >= 80 ? '🌟' : '📈' }
    : getFinalGrade((legacy?.score ?? 0));

  const getChartConfig = () => ({
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surfaceVariant,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${isDark ? '10, 132, 255' : '0, 122, 255'}, ${opacity})`,
    labelColor: (opacity = 1) => `${theme.colors.text}${Math.round(opacity * 255).toString(16)}`,
    style: {
      borderRadius: theme.borderRadius.lg,
    },
    barPercentage: 0.7,
  });

  const achievementsLegacy = [
    {
      condition: (legacy?.score ?? 0) >= 800,
      icon: 'trophy',
      title: 'Master Farmer',
      description: 'Achieved excellent farming results!',
      color: theme.colors.warning,
    },
    {
      condition: (legacy?.cropHealth ?? 0) >= 80,
      icon: 'leaf',
      title: 'Crop Whisperer',
      description: 'Maintained healthy crops throughout!',
      color: theme.colors.success,
    },
    {
      condition: (legacy ? legacy.pestLevel <= 20 : false),
      icon: 'shield-checkmark',
      title: 'Pest Controller',
      description: 'Effectively managed pest levels!',
      color: theme.colors.info,
    },
    {
      condition: (legacy ? legacy.water >= 60 && legacy.nutrients >= 60 : false),
      icon: 'water',
      title: 'Resource Manager',
      description: 'Balanced water and nutrients perfectly!',
      color: theme.colors.primary,
    },
  ];

  const earnedAchievements = achievementsLegacy.filter(achievement => achievement.condition);

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
              Farm Complete! 🎉
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Your 30-day farming journey has ended
            </Text>
          </View>

          {/* Final Score */}
          <Card variant="glass" style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
                Final Score
              </Text>
              <Text style={[styles.scoreValue, { color: gradeInfo.color }]}>
                {final ? Math.round(final.totalScore) : Math.round(legacy?.score ?? 0)}
              </Text>
            </View>
            <View style={styles.gradeContainer}>
              <Text style={[styles.gradeEmoji]}>{gradeInfo.emoji}</Text>
              <Text style={[styles.gradeText, { color: gradeInfo.color }]}>
                Grade: {final ? final.grade : gradeInfo.grade}
              </Text>
            </View>
          </Card>

          {/* Performance Chart */}
          {final ? (
            <Card variant="default" style={styles.chartCard}>
              <Text style={[styles.chartTitle, { color: theme.colors.text }]}> 
                Multi-Category Performance
              </Text>
              <BarChart
                data={{
                  labels: ['Yield', 'Water', 'Sustain', 'Data', 'Education'],
                  datasets: [{
                    data: [
                      final.yieldScore,
                      final.waterEfficiency,
                      final.sustainability,
                      final.dataUtilization,
                      final.educationalProgress,
                    ]
                  }]
                }}
                width={screenWidth - 100}
                height={220}
                chartConfig={getChartConfig()}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix="%"
              />
            </Card>
          ) : (
            <Card variant="default" style={styles.chartCard}>
              <Text style={[styles.chartTitle, { color: theme.colors.text }]}> 
                Final Farm Status
              </Text>
              <BarChart
                data={{
                  labels: ['Water', 'Nutrients', 'Health', 'Pest'],
                  datasets: [{
                    data: [
                      legacy?.water ?? 0,
                      legacy?.nutrients ?? 0,
                      legacy?.cropHealth ?? 0,
                      100 - (legacy?.pestLevel ?? 0),
                    ]
                  }]
                }}
                width={screenWidth - 100}
                height={220}
                chartConfig={getChartConfig()}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix="%"
              />
            </Card>
          )}

          {/* Detailed Stats */}
          {final ? (
            <Card variant="gradient" style={styles.statsCard}>
              <Text style={[styles.statsTitle, { color: theme.colors.text }]}> 
                Category Breakdown
              </Text>
              <View style={styles.statsList}>
                {[{label: 'Yield', value: final.yieldScore, icon: 'leaf', color: theme.colors.primary},
                  {label: 'Water Efficiency', value: final.waterEfficiency, icon: 'water', color: theme.colors.info},
                  {label: 'Sustainability', value: final.sustainability, icon: 'earth', color: theme.colors.success},
                  {label: 'Data Utilization', value: final.dataUtilization, icon: 'analytics', color: theme.colors.secondary},
                  {label: 'Education', value: final.educationalProgress, icon: 'book', color: theme.colors.warning},
                ].map((row, idx) => (
                  <View key={idx} style={styles.statItem}>
                    <View style={styles.statLeft}>
                      <Ionicons name={row.icon as any} size={20} color={row.color} />
                      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}> 
                        {row.label}
                      </Text>
                    </View>
                    <View style={styles.statRight}>
                      <Text style={[styles.statValue, { color: theme.colors.text }]}>
                        {Math.round(row.value)}%
                      </Text>
                      <View style={[styles.statBar, { backgroundColor: theme.colors.border }]}>
                        <View style={[styles.statBarFill, { backgroundColor: row.color, width: `${Math.round(row.value)}%` }]} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          ) : (
            <Card variant="gradient" style={styles.statsCard}>
              <Text style={[styles.statsTitle, { color: theme.colors.text }]}> 
                Performance Breakdown
              </Text>
              <View style={styles.statsList}>
                {/* legacy layout preserved below */}
              </View>
            </Card>
          )}

          {/* Achievements */}
          {final ? (
            <Card variant="glass" style={styles.achievementsCard}>
              <View style={styles.achievementsHeader}>
                <Ionicons name="trophy" size={24} color={theme.colors.warning} />
                <Text style={[styles.achievementsTitle, { color: theme.colors.text }]}>Achievements</Text>
              </View>
              <View style={styles.achievementsList}>
                {final.achievements.map((a, i) => (
                  <View key={i} style={styles.achievementItem}>
                    <Text style={styles.achievementTitle}>{a.split(' ')[0]}</Text>
                    <Text style={[styles.achievementDescription, { color: theme.colors.textSecondary }]}>{a}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : earnedAchievements.length > 0 && (
            <Card variant="glass" style={styles.achievementsCard}>
              <View style={styles.achievementsHeader}>
                <Ionicons name="trophy" size={24} color={theme.colors.warning} />
                <Text style={[styles.achievementsTitle, { color: theme.colors.text }]}>
                  Achievements Unlocked! 🏆
                </Text>
              </View>
              
              <View style={styles.achievementsList}>
                {earnedAchievements.map((achievement, index) => (
                  <View key={index} style={styles.achievementItem}>
                    <Ionicons name={achievement.icon as any} size={20} color={achievement.color} />
                    <View style={styles.achievementText}>
                      <Text style={[styles.achievementTitle, { color: theme.colors.text }]}>
                        {achievement.title}
                      </Text>
                      <Text style={[styles.achievementDescription, { color: theme.colors.textSecondary }]}>
                        {achievement.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Recommendations */}
          <Card variant="default" style={styles.recommendationsCard}>
            <View style={styles.recommendationsHeader}>
              <Ionicons name="bulb" size={24} color={theme.colors.secondary} />
              <Text style={[styles.recommendationsTitle, { color: theme.colors.text }]}>
                Improvement Tips 💡
              </Text>
            </View>
            
            <View style={styles.recommendationsList}>
              {final ? (
                <>
                  {final.waterEfficiency < 70 && (
                    <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>• 💧 Improve irrigation timing to boost water efficiency</Text>
                  )}
                  {final.sustainability < 75 && (
                    <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>• 🌱 Prefer sustainable inputs and reduce over-application</Text>
                  )}
                  {final.dataUtilization < 70 && (
                    <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>• 📡 Review NASA charts and follow AI guidance more often</Text>
                  )}
                  {final.educationalProgress < 60 && (
                    <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>• 📚 Explore tutorials and tooltips to learn faster</Text>
                  )}
                </>
              ) : (
                <>
                  {(legacy?.water ?? 0) < 60 && (
                    <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>• 💧 Monitor soil moisture more carefully and irrigate when needed</Text>
                  )}
                  {(legacy?.nutrients ?? 0) < 60 && (
                    <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>• 🌱 Improve nutrient management with timely fertilization</Text>
                  )}
                  {(legacy?.pestLevel ?? 100) > 30 && (
                    <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>• 🐛 Implement better pest control strategies</Text>
                  )}
                  {(legacy?.cropHealth ?? 0) < 80 && (
                    <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>• 🏥 Focus on overall crop health management</Text>
                  )}
                  <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>• 📚 Study the tutorial for advanced farming techniques</Text>
                  <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>• 🤖 Follow AI recommendations more closely for better results</Text>
                </>
              )}
            </View>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title="Play Again 🔄"
              onPress={playAgain}
              variant="primary"
              size="large"
              style={styles.playAgainButton}
              icon={<Ionicons name="refresh" size={20} color="#FFFFFF" />}
            />
            
            <Button
              title="Study Tutorial 📖"
              onPress={viewTutorial}
              variant="glass"
              size="medium"
              style={styles.tutorialButton}
              icon={<Ionicons name="book" size={18} color={theme.colors.primary} />}
            />
          </View>
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
  scoreCard: {
    marginBottom: 20,
    alignItems: 'center',
  },
  scoreHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  gradeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  chartCard: {
    marginBottom: 20,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  statsCard: {
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsList: {
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    marginLeft: 8,
  },
  statRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
  },
  achievementsCard: {
    marginBottom: 20,
  },
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  achievementsList: {
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  achievementText: {
    marginLeft: 12,
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  recommendationsCard: {
    marginBottom: 24,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  recommendationsList: {
  },
  recommendationText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  actionButtons: {
  },
  playAgainButton: {
    marginBottom: 8,
  },
  tutorialButton: {
    marginBottom: 20,
  },
});