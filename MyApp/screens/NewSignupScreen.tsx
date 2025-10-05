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

export default function NewSignupScreen() {
  const colorScheme = useColorScheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signup } = useAuth();

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

  const handleSignup = async () => {
    if (!username || !email || !password || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please fill in all fields',
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Password Mismatch',
        text2: 'Passwords do not match',
      });
      return;
    }

    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Weak Password',
        text2: 'Password must be at least 6 characters',
      });
      return;
    }

    setLoading(true);
    try {
      await signup({ username, email, password });
      Toast.show({
        type: 'success',
        text1: 'Welcome to NASA Farm! 🎉',
        text2: 'Your account has been created successfully',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Signup Failed',
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
                <Text style={styles.logoEmoji}>🌱</Text>
                <Text style={styles.logoEmojiSmall}>🚀</Text>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                Join NASA Farm! 🌾
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Create your account and start farming with NASA data
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Username Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Username
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Ionicons 
                    name="person-outline" 
                    size={20} 
                    color={colors.placeholder} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Choose a username"
                    placeholderTextColor={colors.placeholder}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoComplete="username-new"
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Email Address
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color={colors.placeholder} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.placeholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Password
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={colors.placeholder} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Create a password (min 6 chars)"
                    placeholderTextColor={colors.placeholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password-new"
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

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Confirm Password
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Ionicons 
                    name="shield-checkmark-outline" 
                    size={20} 
                    color={colors.placeholder} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Confirm your password"
                    placeholderTextColor={colors.placeholder}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color={colors.placeholder} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Signup Button */}
              <TouchableOpacity
                style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, '#059669']}
                  style={styles.signupGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.signupButtonText}>Create Account</Text>
                      <Ionicons name="rocket-outline" size={20} color="#ffffff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Already have an account?
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                style={styles.loginButton}
              >
                <Text style={[styles.loginButtonText, { color: colors.primary }]}>
                  Sign In 👋
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
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    paddingHorizontal: 12,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
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
  signupButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  signupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 4,
  },
  footerText: {
    fontSize: 14,
  },
  loginButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  loginButtonText: {
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