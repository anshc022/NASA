import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import { useAuth } from '../contexts/AuthContext';
import { achievementsAPI } from '../services/api';
import { router } from 'expo-router';
import Avatar from './Avatar';

interface DrawerContentProps {
  navigation?: any;
}

const DrawerContent: React.FC<DrawerContentProps> = ({ navigation }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);
  const { user, logout, refreshUser } = useAuth();
  
  const [achievementStats, setAchievementStats] = useState({
    unlockedCount: 0,
    totalCount: 0,
  });

  useEffect(() => {
    loadAchievementStats();
  }, []);

  const loadAchievementStats = async () => {
    try {
      const response = await achievementsAPI.getAchievements();
      if (response.summary) {
        setAchievementStats({
          unlockedCount: response.summary.unlocked_count || 0,
          totalCount: response.summary.total_count || 0,
        });
      }
    } catch (error) {
      console.error('Error loading achievement stats:', error);
    }
  };

  useEffect(() => {
    // Refresh to pull normalized PNG avatar_url from backend
    refreshUser?.().catch(() => {});
  }, []);

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'home-outline' as keyof typeof Ionicons.glyphMap,
      route: '/(tabs)',
      description: 'Farm overview & stats',
    },
    {
      id: 'farm',
      title: 'My Farm',
      icon: 'leaf-outline' as keyof typeof Ionicons.glyphMap,
      route: '/farm',
      description: 'Manage your crops',
    },
    {
      id: 'challenges',
      title: 'Challenges',
      icon: 'trophy-outline' as keyof typeof Ionicons.glyphMap,
      route: '/challenges',
      description: 'Complete missions',
    },
    {
      id: 'achievements', 
      title: 'Achievements',
      icon: 'medal-outline' as keyof typeof Ionicons.glyphMap,
      route: '/achievements',
      description: `${achievementStats.unlockedCount}/${achievementStats.totalCount} unlocked`,
    },
    {
      id: 'explore',
      title: 'Explore',
      icon: 'compass-outline' as keyof typeof Ionicons.glyphMap,
      route: '/(tabs)/explore',
      description: 'Discover new features',
    },
  ];

  const userLevel = Math.floor((user?.xp || 0) / 100) + 1;

  const handleMenuPress = (item: any) => {
    if (item.route) {
      router.push(item.route);
    }
    
    if (navigation?.closeDrawer) {
      navigation.closeDrawer();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Section with Gradient */}
      <LinearGradient
        colors={isDark 
          ? [colors.gradients.navbar[0], colors.gradients.navbar[1]] 
          : [colors.gradients.navbar[0], colors.gradients.navbar[1]]
        }
        style={styles.header}
      >
        <View style={styles.profileSection}>
          {/* Avatar */}
          <TouchableOpacity
            onPress={() => router.push('/avatar-picker')}
            activeOpacity={0.8}
          >
            <Avatar
              avatarUrl={user?.avatar_url}
              fallbackText={user?.full_name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || '🚀'}
              size={80}
              backgroundColor={isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)'}
              textColor="#FFFFFF"
            />
            <View style={[styles.editAvatarBadge, { backgroundColor: colors.secondary }]}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          {/* User Info */}
          <Text style={styles.userName}>
            {user?.full_name || user?.username || 'Space Farmer'}
          </Text>
          
          {/* User Stats */}
          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <Ionicons name="diamond" size={16} color={colors.secondary} />
              <Text style={styles.statText}>{user?.coins?.toLocaleString() || '0'}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={16} color={colors.success} />
              <Text style={styles.statText}>Lv.{userLevel}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Navigation Menu */}
      <View style={[
        styles.content, 
        { 
          backgroundColor: isDark ? colors.surface : colors.background
        }
      ]}>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.menuContainer}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              NAVIGATION
            </Text>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem, 
                  { 
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    borderWidth: isDark ? 0 : 1,
                    ...colors.shadows.sm
                  }
                ]}
                onPress={() => handleMenuPress(item)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconContainer, 
                  { 
                    backgroundColor: isDark 
                      ? colors.primary + '25' 
                      : colors.primary + '15'
                  }
                ]}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>
                    {item.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[
          styles.footer, 
          { 
            borderTopColor: colors.border,
            backgroundColor: isDark ? colors.surface : colors.background
          }
        ]}>
          <TouchableOpacity 
            style={[
              styles.logoutButton, 
              { 
                backgroundColor: colors.warning,
                ...colors.shadows.sm
              }
            ]} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  userStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingTop: 24,
  },
  menuContainer: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    borderTopWidth: 1,
    marginTop: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default DrawerContent;