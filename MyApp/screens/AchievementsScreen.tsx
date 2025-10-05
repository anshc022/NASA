import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import { achievementsAPI } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at?: string;
  reward_xp: number;
  reward_coins: number;
  progress: number;
}

interface AchievementsSummary {
  unlocked_count: number;
  total_count: number;
  completion_percentage: number;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function AchievementsScreen() {
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [summary, setSummary] = useState<AchievementsSummary | null>(null);

  const isDark = colorScheme === 'dark';

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const response = await achievementsAPI.getAchievements();
      
      if (response.achievements) {
        setAchievements(response.achievements);
        setSummary(response.summary);
      } else {
        Alert.alert('Error', 'Failed to load achievements. Please try again.');
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
      Alert.alert('Error', 'Unable to load achievements. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAchievements();
    setRefreshing(false);
  };

  const checkForNewAchievements = async () => {
    try {
      const response = await achievementsAPI.checkAchievements();
      if (response.newly_unlocked && response.newly_unlocked.length > 0) {
        const newlyUnlocked = response.newly_unlocked;
        Alert.alert(
          '🎉 New Achievement Unlocked!',
          `You've unlocked: ${newlyUnlocked.map((a: any) => a.title).join(', ')}`,
          [{ text: 'Awesome!', onPress: () => loadAchievements() }]
        );
      } else {
        Alert.alert('All Caught Up!', 'No new achievements available right now.');
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
      Alert.alert('Error', 'Failed to check for new achievements.');
    }
  };

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const lockedAchievements = achievements.filter((a) => !a.unlocked);

  const renderAchievement = (achievement: Achievement) => {
    const isUnlocked = achievement.unlocked;
    const progressPercentage = achievement.progress;

    return (
      <TouchableOpacity
        key={achievement.id}
        style={[
          styles.achievementCard,
          { 
            backgroundColor: colors.surface,
            borderColor: isUnlocked ? colors.success : colors.border,
            borderWidth: isUnlocked ? 2 : 1,
          }
        ]}
        activeOpacity={0.7}
        onPress={() => {
          if (isUnlocked && achievement.unlocked_at) {
            Alert.alert(
              `${achievement.title} 🎉`,
              `${achievement.description}\n\nReward: ${achievement.reward_xp} XP + ${achievement.reward_coins} Coins\n\nUnlocked: ${new Date(achievement.unlocked_at).toLocaleDateString()}`
            );
          } else {
            Alert.alert(
              achievement.title,
              `${achievement.description}\n\nProgress: ${progressPercentage}%\nReward: ${achievement.reward_xp} XP + ${achievement.reward_coins} Coins`
            );
          }
        }}
      >
        <Text style={[
          styles.achievementIcon, 
          !isUnlocked && styles.achievementIconLocked,
          { opacity: isUnlocked ? 1 : 0.4 }
        ]}>
          {achievement.icon}
        </Text>
        
        <Text style={[
          styles.achievementTitle, 
          { color: isUnlocked ? colors.text : colors.textSecondary }
        ]}>
          {achievement.title}
        </Text>
        
        <Text style={[
          styles.achievementDescription,
          { color: colors.textSecondary }
        ]}>
          {achievement.description}
        </Text>

        {/* Progress bar for locked achievements */}
        {!isUnlocked && progressPercentage > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    backgroundColor: colors.primary,
                    width: `${progressPercentage}%`
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {progressPercentage}%
            </Text>
          </View>
        )}

        {/* Reward display */}
        <View style={styles.rewardContainer}>
          <View style={[styles.rewardBadge, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="star" size={12} color={colors.primary} />
            <Text style={[styles.rewardText, { color: colors.primary }]}>
              {achievement.reward_xp} XP
            </Text>
          </View>
          <View style={[styles.rewardBadge, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="logo-bitcoin" size={12} color={colors.warning} />
            <Text style={[styles.rewardText, { color: colors.warning }]}>
              {achievement.reward_coins}
            </Text>
          </View>
        </View>

        {isUnlocked && achievement.unlocked_at && (
          <Text style={[styles.unlockedDate, { color: colors.success }]}>
            Unlocked: {new Date(achievement.unlocked_at).toLocaleDateString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Achievements 🏆</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {summary?.unlocked_count || 0} / {summary?.total_count || 0} Unlocked 
            {summary?.completion_percentage ? ` (${Math.round(summary.completion_percentage)}%)` : ''}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.checkButton, { backgroundColor: colors.primary }]}
          onPress={checkForNewAchievements}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
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
        {/* Unlocked Achievements */}
        {unlockedAchievements.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Unlocked ✨ ({unlockedAchievements.length})
            </Text>
            <View style={styles.achievementsGrid}>
              {unlockedAchievements.map(renderAchievement)}
            </View>
          </View>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              In Progress 🔒 ({lockedAchievements.length})
            </Text>
            <View style={styles.achievementsGrid}>
              {lockedAchievements.map(renderAchievement)}
            </View>
          </View>
        )}

        {achievements.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>🏆</Text>
            <Text style={[styles.emptyStateText, { color: colors.text }]}>
              No achievements yet!
            </Text>
            <Text style={[styles.emptyStateDescription, { color: colors.textSecondary }]}>
              Start farming to unlock your first achievements!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  checkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  achievementIconLocked: {
    opacity: 0.4,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  achievementDescription: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  rewardContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  rewardText: {
    fontSize: 10,
    fontWeight: '600',
  },
  unlockedDate: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
