import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import Toast from 'react-native-toast-message';
import ThemeToggle from '../components/ThemeToggle';

export default function NewLoginScreen() {
  const colorScheme = useColorScheme();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!usernameOrEmail || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please fill in all fields',
      });
      return;
    }

    setLoading(true);
    try {
      await login(usernameOrEmail, password);
      Toast.show({
        type: 'success',
        text1: 'Welcome back! 🎉',
        text2: 'Ready to grow your NASA farm?',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Theme Toggle */}
      <View style={styles.themeToggleContainer}>
        <ThemeToggle size="medium" />
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.logoContainer, { borderColor: colors.border }]}>
                <Text style={styles.logoEmoji}>🚀</Text>
                <Text style={styles.logoEmojiSmall}>🌱</Text>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                Welcome Back! 👋
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Sign in to continue your farming journey
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Username/Email Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Username or Email
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.inputBorder }]}>
                  <Ionicons 
                    name="person-outline" 
                    size={20} 
                    color={colors.placeholder} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Enter your username or email"
                    placeholderTextColor={colors.placeholder}
                    value={usernameOrEmail}
                    onChangeText={setUsernameOrEmail}
                    autoCapitalize="none"
                    autoComplete="username"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Password
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.inputBorder }]}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={colors.placeholder} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.placeholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color={colors.placeholder} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, colors.shadows.md, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.gradients.primary[0], colors.gradients.primary[1]]}
                  style={styles.loginGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Don't have an account?
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/signup')}
                style={styles.signupButton}
              >
                <Text style={[styles.signupButtonText, { color: colors.primary }]}>
                  Sign Up 🚀
                </Text>
              </TouchableOpacity>
            </View>

            {/* NASA Credit */}
            <View style={styles.nasaCredit}>
              <Text style={[styles.creditText, { color: colors.placeholder }]}>
                Powered by NASA Earth Data 🛰️
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  themeToggleContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  logoEmoji: {
    fontSize: 32,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  logoEmojiSmall: {
    fontSize: 24,
    position: 'absolute',
    bottom: 12,
    left: 12,
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
    lineHeight: 22,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 4,
  },
  footerText: {
    fontSize: 14,
  },
  signupButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  signupButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nasaCredit: {
    alignItems: 'center',
  },
  creditText: {
    fontSize: 12,
    textAlign: 'center',
  },
});