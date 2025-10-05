import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import { achievementsAPI } from '../services/api';
import SimpleCard from '../components/SimpleCard';
import ThemeToggle from '../components/ThemeToggle';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

export default function NewDashboardScreen() {
  const { user } = useAuth();
  const { challenges, dailyStreak } = useGame();
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');
  const navigation = useNavigation();
  
  const [achievementStats, setAchievementStats] = useState({
    unlockedCount: 0,
    totalCount: 0,
    completionPercentage: 0
  });

  const level = Math.floor((user?.xp || 0) / 100) + 1;
  const activeChallenges = challenges.filter((c) => !c.completed).length;

  useEffect(() => {
    loadAchievementStats();
  }, []);

  // Refresh achievement stats when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadAchievementStats();
    }, [])
  );

  const loadAchievementStats = async () => {
    try {
      const response = await achievementsAPI.getAchievements();
      if (response.summary) {
        setAchievementStats({
          unlockedCount: response.summary.unlocked_count || 0,
          totalCount: response.summary.total_count || 0,
          completionPercentage: response.summary.completion_percentage || 0
        });
      }
    } catch (error) {
      console.error('Error loading achievement stats:', error);
    }
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header with Drawer Button */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.drawerButton, { backgroundColor: colors.card }]}
          onPress={openDrawer}
          activeOpacity={0.7}
        >
          <View style={styles.hamburgerLines}>
            <View style={[styles.line, { backgroundColor: colors.primary }]} />
            <View style={[styles.line, { backgroundColor: colors.primary }]} />
            <View style={[styles.line, { backgroundColor: colors.primary }]} />
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerSpacer} />
        
        <View style={styles.headerRight}>
          <ThemeToggle size="small" />
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
            activeOpacity={0.7}
          >
            <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Simple Welcome */}
        <View style={[styles.welcomeCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>
            Welcome back, {user?.full_name || user?.username || 'Farmer'}
          </Text>
        </View>

        {/* Bento Grid - First Row */}
        <View style={styles.bentoRow}>
          <View style={styles.bentoLarge}>
            <SimpleCard
              title="Total Coins"
              value={user?.coins?.toLocaleString() || '0'}
              icon="logo-bitcoin"
              gradient={isDark ? ['#F97316', '#EA580C'] : ['#F59E0B', '#D97706']}
              onPress={() => router.push('/profile')}
            />
          </View>
          <View style={styles.bentoSmall}>
            <SimpleCard
              title="Level"
              value={level}
              icon="trophy"
              subtitle={`${user?.xp || 0} XP`}
            />
          </View>
        </View>

        {/* Bento Grid - Second Row */}
        <View style={styles.bentoRow}>
          <View style={styles.bentoSmall}>
            <SimpleCard
              title="Streak"
              value={dailyStreak}
              icon="flame"
            />
          </View>
          <View style={styles.bentoLarge}>
            <SimpleCard
              title="Achievements"
              value={`${achievementStats.unlockedCount}/${achievementStats.totalCount}`}
              icon="medal"
              subtitle={`${Math.round(achievementStats.completionPercentage)}% complete`}
              gradient={isDark ? ['#A855F7', '#9333EA'] : ['#8B5CF6', '#7C3AED']}
              onPress={() => router.push('/achievements')}
            />
          </View>
        </View>

        {/* Action Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
          </Text>
          
          <View style={styles.actionGrid}>
            <SimpleCard
              title="My Farm"
              value="Manage"
              icon="leaf"
              subtitle="Check your crops"
              gradient={['#10B981', '#059669']}
              onPress={() => router.push('/farm')}
            />
            <SimpleCard
              title="Challenges"
              value={activeChallenges}
              icon="flag"
              subtitle="active tasks"
              gradient={['#3B82F6', '#2563EB']}
              onPress={() => router.push('/challenges')}
            />
          </View>

          <View style={styles.actionGrid}>
            <SimpleCard
              title="Analytics"
              value="View"
              icon="analytics"
              subtitle="Track progress"
              onPress={() => router.push('/analytics')}
            />
            <SimpleCard
              title="NASA Learn"
              value="Explore"
              icon="rocket"
              subtitle="New lessons"
              onPress={() => router.push('/education')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Custom Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  drawerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hamburgerLines: {
    width: 20,
    height: 14,
    justifyContent: 'space-between',
  },
  line: {
    width: '100%',
    height: 2,
    borderRadius: 1,
  },
  headerSpacer: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileButton: {
    marginLeft: 8,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Welcome Section
  welcomeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Bento Grid Layout
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    height: 120,
  },
  bentoLarge: {
    flex: 2,
  },
  bentoSmall: {
    flex: 1,
  },

  // Content Styles
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100, // Extra padding for tab bar
  },

  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
});