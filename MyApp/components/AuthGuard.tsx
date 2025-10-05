import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { router } from 'expo-router';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');

  useEffect(() => {
    // Redirect to splash/login if not authenticated
    if (!isLoading && !user) {
      // Go straight to login to avoid bouncing through splash repeatedly
      router.replace('/(auth)/login');
    }
  }, [user, isLoading]);

  // Show loading indicator while checking authentication
  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: colors.background 
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Don't render children if user is not authenticated
  if (!user) {
    return null;
  }

  return <>{children}</>;
}