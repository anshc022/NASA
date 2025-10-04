import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Toast } from '../components/CustomToast';
import { API_CONFIG } from '../config/api';
import { useTheme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ResponsiveText } from '../components/ResponsiveText';

interface HomeScreenProps {
  navigation: any;
}

interface WelcomeResponse {
  message: string;
  status: string;
  timestamp: string;
}

interface UserData {
  id: number;
  username: string;
  full_name?: string;
  email: string;
  language: string;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { theme, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [welcomeData, setWelcomeData] = useState<WelcomeResponse | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyTip] = useState("Monitor soil moisture levels regularly for optimal crop health!");

  useEffect(() => {
    loadUserData();
    loadWelcomeData();
  }, []);

  const loadUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const user = JSON.parse(userDataString);
        setUserData(user);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadWelcomeData = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ROOT}`);
      const data = await response.json();
      setWelcomeData(data);
      Toast.show('System connected successfully', 'success');
    } catch (error) {
      console.error('Error loading welcome data:', error);
      Toast.show('Unable to connect to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('userData');
    
    Toast.show('Logged out successfully', 'success');
    const tabNavigation = navigation.getParent?.();
    const rootNavigation = tabNavigation?.getParent?.() ?? tabNavigation ?? navigation;

    rootNavigation?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

  const speakTip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Speech.speak(dailyTip, {
      language: 'en',
      pitch: 1.0,
      rate: 0.8,
    });
  };

  const startFarming = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Farm');
  };

  const openTutorial = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Tutorial');
  };

  const openMyFarms = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('MyFarms');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}> 
        <View style={[styles.loadingContainer, { paddingTop: Math.max(insets.top, 12) }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading Fasal Seva...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
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
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top + 8, 16) }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <ResponsiveText variant="h3" color={theme.colors.text}>
                नमस्ते, {userData?.full_name || userData?.username || 'Farmer'}! 🌱
              </ResponsiveText>
              <ResponsiveText variant="h1" color={theme.colors.primary}>
                Fasal Seva
              </ResponsiveText>
              <ResponsiveText variant="body" color={theme.colors.textSecondary}>
                NASA Farm Navigator Edition
              </ResponsiveText>
            </View>
            <View style={{ paddingTop: Platform.OS === 'ios' ? 8 : 0, marginRight: 6 }}>
              <Button
                title=""
                onPress={toggleTheme}
                variant="glass"
                size="small"
                style={[styles.themeButton, { paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 }]}
                icon={
                  <Ionicons 
                    name={isDark ? 'sunny' : 'moon'} 
                    size={20} 
                    color={theme.colors.text} 
                  />
                }
              />
              <Button
                title=""
                onPress={handleLogout}
                variant="glass"
                size="small"
                style={[styles.themeButton, { paddingHorizontal: 12, paddingVertical: 10 }]}
                icon={
                  <Ionicons 
                    name="log-out-outline" 
                    size={20} 
                    color={theme.colors.error} 
                  />
                }
              />
            </View>
          </View>

          {/* Status Card */}
          <Card variant="glass" style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
              <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                System Status
              </Text>
            </View>
            <Text style={[styles.statusMessage, { color: theme.colors.textSecondary }]}>
              {welcomeData?.message || 'NASA Farm Navigator is ready!'}
            </Text>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
              <Text style={[styles.statusText, { color: theme.colors.success }]}>
                Connected
              </Text>
            </View>
          </Card>

          {/* Daily Tip Card */}
          <Card variant="gradient" style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="bulb" size={24} color={theme.colors.warning} />
              <Text style={[styles.tipTitle, { color: theme.colors.text }]}>
                Daily Farming Tip
              </Text>
              <Button
                title=""
                onPress={speakTip}
                variant="glass"
                size="small"
                icon={
                  <Ionicons 
                    name="volume-high" 
                    size={16} 
                    color={theme.colors.primary} 
                  />
                }
              />
            </View>
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              {dailyTip}
            </Text>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title="Start Farming 🚜"
              onPress={startFarming}
              variant="primary"
              size="large"
              style={styles.primaryButton}
              icon={<Ionicons name="leaf" size={20} color="#FFFFFF" />}
            />
            
            <Button
              title="How to Play 📚"
              onPress={openTutorial}
              variant="glass"
              size="medium"
              style={styles.secondaryButton}
              icon={<Ionicons name="help-circle" size={18} color={theme.colors.primary} />}
            />

            <Button
              title="My Farms 📍"
              onPress={openMyFarms}
              variant="outline"
              size="medium"
              style={[styles.secondaryButton, { marginTop: 10 }]}
              icon={<Ionicons name="location" size={18} color={theme.colors.primary} />}
            />
          </View>

          {/* Features Grid */}
          <View style={styles.featuresGrid}>
            <Card variant="default" style={styles.featureCard}>
              <Ionicons name="globe" size={32} color={theme.colors.primary} />
              <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
                NASA Data
              </Text>
              <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                Real-time satellite weather data
              </Text>
            </Card>

            <Card variant="default" style={styles.featureCard}>
              <Ionicons name="bulb" size={32} color={theme.colors.secondary} />
              <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
                AI Advisor
              </Text>
              <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                Smart farming recommendations
              </Text>
            </Card>

            <Card variant="default" style={styles.featureCard}>
              <Ionicons name="game-controller" size={32} color={theme.colors.accent} />
              <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
                Game Mode
              </Text>
              <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                Learn through interactive play
              </Text>
            </Card>

            <Card variant="default" style={styles.featureCard}>
              <Ionicons name="analytics" size={32} color={theme.colors.success} />
              <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
                Analytics
              </Text>
              <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                Track your farming progress
              </Text>
            </Card>
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
    paddingBottom: 100, // Space for bottom tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },

  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  statusCard: {
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tipCard: {
    marginBottom: 24,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  actionButtons: {
    marginBottom: 32,
  },
  primaryButton: {
    marginBottom: 12,
  },
  secondaryButton: {
    marginBottom: 8,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '47%',
    marginBottom: 4,
    alignItems: 'center',
    paddingVertical: 20,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});