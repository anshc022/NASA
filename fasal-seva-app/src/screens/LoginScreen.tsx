import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Toast } from '../components/CustomToast';
import { API_CONFIG } from '../config/api';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { theme, isDark } = useTheme();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!usernameOrEmail.trim() || !password.trim()) {
      Toast.show('Please fill in all fields', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username_or_email: usernameOrEmail,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save token and user data
        await AsyncStorage.setItem('accessToken', data.access_token);
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        
        Toast.show(`Welcome back, ${data.user.username}! 🎉`, 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Navigate to Home
        navigation.replace('Main');
      } else {
        Toast.show(data.detail || 'Login failed', 'error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Login error:', error);
      Toast.show('Unable to connect to server', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupNavigation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Signup');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <LinearGradient
        colors={isDark 
          ? ['#000000', '#1C1C1E', '#2C2C2E'] 
          : ['#F2F2F7', '#FFFFFF', '#F9F9F9']
        }
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="leaf" size={50} color={theme.colors.primary} />
              </View>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Welcome Back! 🌱
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Login to continue your farming journey
              </Text>
            </View>

            {/* Login Form */}
            <Card variant="glass" style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Username or Email
                </Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }]}>
                  <Ionicons 
                    name="person-outline" 
                    size={20} 
                    color={theme.colors.textSecondary} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="Enter username or email"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={usernameOrEmail}
                    onChangeText={setUsernameOrEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Password
                </Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }]}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={theme.colors.textSecondary} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="Enter password"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Button
                    title=""
                    onPress={() => setShowPassword(!showPassword)}
                    variant="glass"
                    size="small"
                    style={styles.eyeButton}
                    icon={
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color={theme.colors.textSecondary} 
                      />
                    }
                  />
                </View>
              </View>

              {/* Primary CTA moved to sticky bar */}
            </Card>

            {/* Signup Link */}
            <Card variant="default" style={styles.signupCard}>
              <Text style={[styles.signupText, { color: theme.colors.textSecondary }]}>
                Don't have an account?
              </Text>
              <Button
                title="Create Account"
                onPress={handleSignupNavigation}
                variant="outline"
                size="medium"
                style={styles.signupButton}
                icon={<Ionicons name="person-add" size={18} color={theme.colors.primary} />}
              />
            </Card>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                Powered by NASA POWER API 🛰️
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        {/* Sticky CTA */}
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.stickyBar}>
          <Button
            title={loading ? "Logging in..." : "Login"}
            onPress={handleLogin}
            variant="primary"
            size="large"
            disabled={loading}
            loading={loading}
            style={styles.stickyButton}
            icon={!loading && <Ionicons name="log-in" size={20} color="#FFFFFF" />}
          />
        </BlurView>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  eyeButton: {
    width: 40,
    height: 40,
    padding: 0,
    minHeight: 0,
  },
  loginButton: {
    marginTop: 4,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  stickyButton: {},
  signupCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  signupText: {
    fontSize: 14,
    marginBottom: 12,
  },
  signupButton: {
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
