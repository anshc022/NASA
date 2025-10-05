import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import { Ionicons } from '@expo/vector-icons';
import SimpleCard from '../components/SimpleCard';
import Avatar from '../components/Avatar';
import { router } from 'expo-router';

interface ProfileStats {
  level: number;
  xp: number;
  coins: number;
  totalPlants: number;
  totalHarvests: number;
  totalWaters: number;
  totalFertilizes: number;
  activeScenarios: number;
  efficiency: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
}

export default function ProfileScreenModern({ navigation }: any) {
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');
  const [refreshing, setRefreshing] = useState(false);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const isDark = colorScheme === 'dark';

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Import analytics API to get real data
      const { analyticsAPI } = await import('../services/api');
      
      // Get real analytics data
      const analyticsData = await analyticsAPI.getFarmAnalytics();
      
      // Calculate level and stats from real data
      const level = analyticsData?.user_progress?.level || 1;
      const xp = analyticsData?.user_progress?.xp || 0;
      const totalPlants = analyticsData?.user_stats?.total_plants || 0;
      const totalHarvests = analyticsData?.user_stats?.total_harvests || 0;
      const totalWaters = analyticsData?.user_stats?.total_waters || 0;
      const totalFertilizes = analyticsData?.user_stats?.total_fertilizes || 0;
      const activeScenarios = analyticsData?.user_progress?.total_scenarios || 0;
      const efficiency = analyticsData?.efficiency?.overall_score || 0;
      
      const stats: ProfileStats = {
        level,
        xp,
        coins: user?.coins || 0,
        totalPlants,
        totalHarvests,
        totalWaters,
        totalFertilizes,
        activeScenarios,
        efficiency,
      };

      // Generate achievements based on real data
      const dynamicAchievements: Achievement[] = [
        {
          id: '1',
          title: 'First Harvest',
          description: 'Harvest your first crop',
          icon: 'leaf',
          unlocked: totalHarvests >= 1,
          progress: Math.min(totalHarvests * 100, 100),
        },
        {
          id: '2',
          title: 'Level Master',
          description: 'Reach level 10',
          icon: 'trophy',
          unlocked: level >= 10,
          progress: Math.min((level / 10) * 100, 100),
        },
        {
          id: '3',
          title: 'Plant Expert',
          description: 'Plant 20 crops',
          icon: 'flower',
          unlocked: totalPlants >= 20,
          progress: Math.min((totalPlants / 20) * 100, 100),
        },
        {
          id: '4',
          title: 'Water Master',
          description: 'Water plants 50 times',
          icon: 'water',
          unlocked: totalWaters >= 50,
          progress: Math.min((totalWaters / 50) * 100, 100),
        },
      ];

      setProfileStats(stats);
      setAchievements(dynamicAchievements);
    } catch (error) {
      console.error('Error loading profile data:', error);
      // Fallback to basic user data if API fails
      const level = Math.floor((user?.xp || 0) / 100) + 1;
      setProfileStats({
        level,
        xp: user?.xp || 0,
        coins: user?.coins || 0,
        totalPlants: 0,
        totalHarvests: 0,
        totalWaters: 0,
        totalFertilizes: 0,
        activeScenarios: 0,
        efficiency: 0,
      });
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleMenuPress = (item: string) => {
    if (item === 'Avatar') {
      router.push('/avatar-picker');
    } else {
      Alert.alert('Coming Soon', `${item} feature is coming in the next update!`);
    }
  };

  if (loading || !profileStats) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading Profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unlockedAchievements = achievements.filter(a => a.unlocked).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Header - Simple like home screen */}
        <View style={[styles.welcomeCard, { backgroundColor: colors.surface }]}>
          <View style={styles.profileHeader}>
            <Avatar
              avatarUrl={user?.avatar_url}
              fallbackText={user?.full_name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
              size={80}
              backgroundColor={colors.primary + '20'}
              textColor={colors.primary}
            />
            
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.full_name || user?.username || 'Unknown User'}
              </Text>
              <Text style={[styles.userHandle, { color: colors.textSecondary }]}>
                @{user?.username || 'user'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {user?.email}
              </Text>
            </View>

            <View style={[styles.levelBadge, { backgroundColor: colors.secondary }]}>
              <Text style={styles.levelText}>{profileStats.level}</Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View style={styles.xpContainer}>
            <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>
              Level {profileStats.level} Progress
            </Text>
            <View style={[styles.xpBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.xpFill,
                  {
                    width: `${(profileStats.xp % 100)}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.xpText, { color: colors.textSecondary }]}>
              {profileStats.xp % 100}/100 XP to Level {profileStats.level + 1}
            </Text>
          </View>
        </View>

        {/* Bento Grid - Stats Row 1 */}
        <View style={styles.bentoRow}>
          <View style={styles.bentoLarge}>
            <SimpleCard
              title="Total XP"
              value={profileStats.xp.toLocaleString()}
              icon="trending-up"
              gradient={[colors.gradients.primary[0], colors.gradients.primary[1]]}
            />
          </View>
          <View style={styles.bentoSmall}>
            <SimpleCard
              title="Coins"
              value={profileStats.coins.toLocaleString()}
              icon="logo-bitcoin"
            />
          </View>
        </View>

        {/* Bento Grid - Stats Row 2 */}
        <View style={styles.bentoRow}>
          <View style={styles.bentoSmall}>
            <SimpleCard
              title="Level"
              value={profileStats.level}
              icon="trophy"
              subtitle={`${profileStats.xp} XP`}
            />
          </View>
          <View style={styles.bentoLarge}>
            <SimpleCard
              title="Achievements"
              value={unlockedAchievements}
              icon="medal"
              gradient={[colors.gradients.secondary[0], colors.gradients.secondary[1]]}
              subtitle={`${achievements.length} total`}
            />
          </View>
        </View>

        {/* Farm Stats Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🌱 Farm Statistics
          </Text>
          
          <View style={styles.actionGrid}>
            <SimpleCard
              title="Plants Grown"
              value={profileStats.totalPlants}
              icon="leaf"
              subtitle="crops planted"
              gradient={['#10B981', '#059669']}
            />
            <SimpleCard
              title="Harvests"
              value={profileStats.totalHarvests}
              icon="checkmark-circle"
              subtitle="successful"
              gradient={['#8BC34A', '#689F38']}
            />
          </View>

          <View style={styles.actionGrid}>
            <SimpleCard
              title="Waters"
              value={profileStats.totalWaters}
              icon="water"
              subtitle="times watered"
              gradient={['#06B6D4', '#0891B2']}
            />
            <SimpleCard
              title="Fertilizes"
              value={profileStats.totalFertilizes}
              icon="nutrition"
              subtitle="times fertilized"
              gradient={['#8B5CF6', '#7C3AED']}
            />
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🏅 Recent Achievements
          </Text>
          
          {achievements.slice(0, 3).map((achievement) => (
            <View
              key={achievement.id}
              style={[styles.achievementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.achievementLeft}>
                <View style={[
                  styles.achievementIcon,
                  { 
                    backgroundColor: achievement.unlocked ? colors.primary : colors.border,
                    opacity: achievement.unlocked ? 1 : 0.5,
                  }
                ]}>
                  <Ionicons 
                    name={achievement.icon as any} 
                    size={20} 
                    color={achievement.unlocked ? 'white' : colors.textSecondary} 
                  />
                </View>
                
                <View style={styles.achievementInfo}>
                  <Text style={[styles.achievementTitle, { color: colors.text }]}>
                    {achievement.title}
                  </Text>
                  <Text style={[styles.achievementDesc, { color: colors.textSecondary }]}>
                    {achievement.description}
                  </Text>
                </View>
              </View>

              <View style={styles.achievementRight}>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {Math.round(achievement.progress)}%
                </Text>
                {achievement.unlocked && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ⚙️ Settings
          </Text>
          
          {[
            { icon: 'person-circle-outline', title: 'Edit Profile', action: 'Edit Profile' },
            { icon: 'camera-outline', title: 'Change Avatar', action: 'Avatar' },
            { icon: 'notifications-outline', title: 'Notifications', action: 'Notifications' },
            { icon: 'shield-checkmark-outline', title: 'Privacy', action: 'Privacy' },
            { icon: 'help-circle-outline', title: 'Help & Support', action: 'Help' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleMenuPress(item.action)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  {item.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.surface, borderColor: colors.warning }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={24} color={colors.warning} />
          <Text style={[styles.logoutText, { color: colors.warning }]}>Logout</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          Version 1.0.0
        </Text>
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
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 14,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  levelText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  xpContainer: {
    marginTop: 16,
  },
  xpLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  xpBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
  },
  xpText: {
    fontSize: 12,
    textAlign: 'right',
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  achievementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  achievementIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  achievementDesc: {
    fontSize: 12,
  },
  achievementRight: {
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
});