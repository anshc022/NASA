import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../theme/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Toast } from '../components/CustomToast';
import { API_CONFIG } from '../config/api';

interface SignupScreenProps {
  navigation: any;
}

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const usernameHint = useMemo(() => {
    if (!username.trim()) return '';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (checkingUsername) return 'Checking availability…';
    if (usernameAvailable === true) return 'Username is available';
    if (usernameAvailable === false) return 'Username is already taken';
    return '';
  }, [username, checkingUsername, usernameAvailable]);

  useEffect(() => {
    // Debounced availability check
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const value = username.trim().toLowerCase();
    if (!value || value.length < 3) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }
    setCheckingUsername(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/auth/username-available?username=${encodeURIComponent(value)}`);
        const data = await res.json();
        setUsernameAvailable(Boolean(data?.available));
      } catch (e) {
        // Network errors: do not block signup; just clear state
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSignup = async () => {
    // Validation
    if (!email.trim() || !username.trim() || !password.trim()) {
      Toast.show('Please fill in all required fields', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!validateEmail(email)) {
      Toast.show('Please enter a valid email address', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (username.length < 3) {
      Toast.show('Username must be at least 3 characters', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (password.length < 6) {
      Toast.show('Password must be at least 6 characters', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (password !== confirmPassword) {
      Toast.show('Passwords do not match', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      // Get selected language from storage
      const language = await AsyncStorage.getItem('selectedLanguage') || 'en';

  const response = await fetch(`${API_CONFIG.BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
          password: password,
          full_name: fullName.trim() || null,
          language: language,
        }),
      });

      const data = await response.json();

  if (response.ok) {
        // Save token and user data
        await AsyncStorage.setItem('accessToken', data.access_token);
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        
        Toast.show(`Welcome, ${data.user.username}! 🎉`, 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Navigate to Home
        navigation.replace('Main');
      } else {
        // Friendly messages for common errors
        if (response.status === 409) {
          const msg = (data?.detail || '').toLowerCase();
          if (msg.includes('email')) {
            Toast.show('This email is already registered', 'error');
          } else if (msg.includes('username')) {
            Toast.show('This username is already taken', 'error');
          } else {
            Toast.show('Email or username already registered', 'error');
          }
        } else if (response.status === 400) {
          Toast.show(data.detail || 'Invalid signup details', 'error');
        } else {
          Toast.show(data.detail || 'Signup failed', 'error');
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Signup error:', error);
      Toast.show('Unable to connect to server', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginNavigation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Login');
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
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="leaf" size={50} color={theme.colors.primary} />
              </View>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Create Account 🌱
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Join Fasal Seva farming community
              </Text>
            </View>

            {/* Signup Form */}
            <Card variant="glass" style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Email Address *
                </Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }]}>
                  <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color={theme.colors.textSecondary} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="your.email@example.com"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}> 
                  Username *
                </Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }]}>
                  <Ionicons 
                    name="person-outline" 
                    size={20} 
                    color={usernameAvailable === false ? '#ef4444' : usernameAvailable === true ? '#22c55e' : theme.colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="Choose a username"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {!!usernameHint && (
                  <Text
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color:
                        checkingUsername
                          ? theme.colors.textSecondary
                          : usernameAvailable === false
                          ? '#ef4444'
                          : usernameAvailable === true
                          ? '#22c55e'
                          : theme.colors.textSecondary,
                    }}
                  >
                    {usernameHint}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Full Name (Optional)
                </Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }]}>
                  <Ionicons 
                    name="person-circle-outline" 
                    size={20} 
                    color={theme.colors.textSecondary} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="Your full name"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Password *
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
                    placeholder="At least 6 characters"
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

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>
                  Confirm Password *
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
                    placeholder="Re-enter password"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <Button
                    title=""
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    variant="glass"
                    size="small"
                    style={styles.eyeButton}
                    icon={
                      <Ionicons 
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color={theme.colors.textSecondary} 
                      />
                    }
                  />
                </View>
              </View>

              <Button
                title={loading ? "Creating Account..." : "Create Account"}
                onPress={handleSignup}
                variant="primary"
                size="large"
                disabled={loading}
                loading={loading}
                style={styles.signupButton}
                icon={!loading && <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
              />
            </Card>

            {/* Login Link */}
            <Card variant="default" style={styles.loginCard}>
              <Text style={[styles.loginText, { color: theme.colors.textSecondary }]}>
                Already have an account?
              </Text>
              <Button
                title="Login"
                onPress={handleLoginNavigation}
                variant="outline"
                size="medium"
                style={styles.loginButton}
                icon={<Ionicons name="log-in" size={18} color={theme.colors.primary} />}
              />
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
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
    marginBottom: 24,
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
    marginBottom: 16,
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
  signupButton: {
    marginTop: 8,
  },
  loginCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    fontSize: 14,
    marginBottom: 12,
  },
  loginButton: {
    width: '100%',
  },
});
