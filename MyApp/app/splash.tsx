import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import { router } from 'expo-router';

export default function SplashScreen() {
	const { user, isLoading } = useAuth();
	const colorScheme = useColorScheme();
	const colors = getThemeColors(colorScheme === 'dark');

	useEffect(() => {
		// Once auth loading is done, decide where to go
		if (!isLoading) {
			if (user) {
				// Go to main app
				router.replace('/(tabs)');
			} else {
				// Go to login
				router.replace('/(auth)/login');
			}
		}
	}, [user, isLoading]);

	return (
		<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
			<ActivityIndicator size="large" color={colors.primary} />
			<Text style={{ color: colors.textSecondary, marginTop: 12 }}>Preparing your farm...</Text>
		</View>
	);
}
