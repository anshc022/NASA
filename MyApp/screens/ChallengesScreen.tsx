import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SimpleCard from '../components/SimpleCard';
import { challengesAPI } from '../services/api';

interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward_xp: number;
  reward_coins: number;
  completed: boolean;
  challenge_type: string;
  category: string;
  icon: string;
  difficulty?: string;
  estimated_time?: string;
  deadline?: string;
  progress_percentage: number;
}

interface ChallengesSummary {
  total_active: number;
  total_completed: number;
  user_stats: {
    total_plants: number;
    total_waters: number;
    total_fertilizes: number;
    total_harvests: number;
    level: number;
  };
}

export default function ChallengesScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [summary, setSummary] = useState<ChallengesSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const isDark = colorScheme === 'dark';

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const response = await challengesAPI.getChallenges();
      
      if (response.success) {
        setChallenges(response.challenges || []);
        setSummary(response.summary || null);
      } else {
        console.error('Failed to load challenges:', response.error);
        Alert.alert('Error', 'Failed to load challenges. Please try again.');
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      Alert.alert('Error', 'Unable to load challenges. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', 'Daily', 'Weekly', 'Progress', 'Achievement'];

  const filteredChallenges = selectedCategory === 'All' 
    ? challenges 
    : challenges.filter((c: Challenge) => c.category === selectedCategory || c.challenge_type === selectedCategory);

  const activeChallenges = filteredChallenges.filter((c: Challenge) => !c.completed);
  const completedChallenges = filteredChallenges.filter((c: Challenge) => c.completed);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChallenges();
    setRefreshing(false);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return colors.success;
      case 'medium': return colors.warning;
      case 'hard': return '#FF6B6B';
      default: return colors.primary;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'daily': return 'sunny';
      case 'weekly': return 'calendar';
      case 'monthly': return 'trophy';
      case 'farming': return 'leaf';
      case 'sustainability': return 'water';
      case 'achievement': return 'medal';
      case 'consistency': return 'flash';
      default: return 'star';
    }
  };

  const getProgressColor = (progress: number, target: number) => {
    const percentage = (progress / target) * 100;
    if (percentage >= 100) return colors.success;
    if (percentage >= 70) return colors.warning;
    return colors.primary;
  };

  const handleChallengePress = async (challenge: Challenge) => {
    if (challenge.completed) {
      Alert.alert('Already Completed! 🎉', 'You have already completed this challenge!');
      return;
    }

    const progressPercentage = Math.min((challenge.progress / challenge.target) * 100, 100);
    
    if (progressPercentage >= 100) {
      // Challenge is completable
      Alert.alert(
        'Challenge Complete! 🎉',
        `Congratulations! You've completed "${challenge.title}".\n\nReward: ${challenge.reward_xp} XP + ${challenge.reward_coins} Coins`,
        [
          { text: 'Later', style: 'cancel' },
          { 
            text: 'Claim Reward', 
            onPress: async () => {
              try {
                const result = await challengesAPI.completeChallenge(challenge.id);
                if (result.success) {
                  Alert.alert('Reward Claimed!', result.message);
                  await loadChallenges(); // Refresh challenges
                } else {
                  Alert.alert('Error', result.message || 'Failed to claim reward');
                }
              } catch (error) {
                console.error('Error completing challenge:', error);
                Alert.alert('Error', 'Failed to complete challenge. Please try again.');
              }
            }
          }
        ]
      );
    } else {
      // Show progress details
      Alert.alert(
        challenge.title,
        `${challenge.description}\n\nProgress: ${challenge.progress}/${challenge.target} (${Math.round(progressPercentage)}%)\nReward: ${challenge.reward_xp} XP + ${challenge.reward_coins} Coins${challenge.estimated_time ? `\nEstimated time: ${challenge.estimated_time}` : ''}`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const renderChallenge = (challenge: Challenge, index: number) => {
    const progressPercentage = Math.min((challenge.progress / challenge.target) * 100, 100);
    const isCompletable = progressPercentage >= 100 && !challenge.completed;
    
    return (
      <TouchableOpacity
        key={challenge.id}
        style={[
          styles.challengeCard,
          { 
            backgroundColor: colors.surface,
            borderColor: isCompletable ? colors.success : colors.border,
            borderWidth: isCompletable ? 2 : 1,
          }
        ]}
        onPress={() => handleChallengePress(challenge)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isCompletable 
            ? [colors.success + '20', colors.success + '10'] 
            : [colors.primary + '10', colors.surface]
          }
          style={styles.challengeGradient}
        >
          <View style={styles.challengeHeader}>
            <View style={styles.challengeIconContainer}>
              <View style={[styles.challengeIcon, { backgroundColor: colors.primary }]}>
                <Ionicons 
                  name={getCategoryIcon(challenge.category) as any} 
                  size={20} 
                  color="white" 
                />
              </View>
              
              {challenge.difficulty && (
                <View style={[
                  styles.difficultyBadge, 
                  { backgroundColor: getDifficultyColor(challenge.difficulty) }
                ]}>
                  <Text style={styles.difficultyText}>
                    {challenge.difficulty}
                  </Text>
                </View>
              )}
            </View>

            {isCompletable && (
              <View style={[styles.completableBadge, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.completableText}>Ready!</Text>
              </View>
            )}
          </View>

          <View style={styles.challengeContent}>
            <Text style={[styles.challengeTitle, { color: colors.text }]}>
              {challenge.title}
            </Text>
            <Text style={[styles.challengeDescription, { color: colors.textSecondary }]}>
              {challenge.description}
            </Text>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  Progress: {challenge.progress}/{challenge.target}
                </Text>
                <Text style={[styles.progressPercentage, { color: getProgressColor(challenge.progress, challenge.target) }]}>
                  {Math.round(progressPercentage)}%
                </Text>
              </View>
              
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercentage}%`,
                      backgroundColor: getProgressColor(challenge.progress, challenge.target),
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.rewardSection}>
              <View style={styles.rewardItem}>
                <Ionicons name="trophy" size={16} color={colors.warning} />
                <Text style={[styles.rewardText, { color: colors.textSecondary }]}>
                  {challenge.reward_xp} XP
                </Text>
              </View>
              <View style={styles.rewardItem}>
                <Ionicons name="logo-bitcoin" size={16} color={colors.warning} />
                <Text style={[styles.rewardText, { color: colors.textSecondary }]}>
                  {challenge.reward_coins} Coins
                </Text>
              </View>
              {challenge.estimated_time && (
                <View style={styles.rewardItem}>
                  <Ionicons name="time" size={16} color={colors.textSecondary} />
                  <Text style={[styles.rewardText, { color: colors.textSecondary }]}>
                    {challenge.estimated_time}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading Challenges...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={[styles.welcomeCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>
            🎯 Your Challenges
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
            Complete challenges to earn XP and coins!
          </Text>
        </View>

        {/* Category Filter */}
        <View style={styles.categorySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📂 Categories
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScrollView}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor: selectedCategory === category ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: selectedCategory === category ? 'white' : colors.text,
                    },
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🔥 Active Challenges ({activeChallenges.length})
            </Text>
            {activeChallenges.map((challenge, index) => renderChallenge(challenge, index))}
          </View>
        )}

        {/* Completed Challenges */}
        {completedChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ✅ Completed Challenges ({completedChallenges.length})
            </Text>
            {completedChallenges.slice(0, 5).map((challenge, index) => renderChallenge(challenge, index))}
          </View>
        )}

        {/* Empty State */}
        {challenges.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              No Challenges Available
            </Text>
            <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
              Keep farming to unlock new challenges!
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  welcomeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  bentoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  bentoLarge: {
    flex: 2,
  },
  bentoSmall: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  categoryScrollView: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  challengeCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  challengeGradient: {
    padding: 16,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  challengeIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  challengeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  completableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completableText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  challengeContent: {
    gap: 12,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  challengeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  rewardSection: {
    flexDirection: 'row',
    gap: 16,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
});