import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Drawer } from 'expo-router/drawer';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { GameProvider, useGame } from '../contexts/GameContext';
import { ThemeProvider as AppThemeProvider, useColorScheme } from '../contexts/ThemeContext';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import WelcomeBonusModal from '../components/welcome-bonus-modal';
import DrawerContent from '../components/DrawerContent';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { user, isLoading, claimWelcomeBonus } = useAuth();
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  const isAuthenticated = !!user;

  // Note: We don't force-redirect here; the Splash screen and AuthGuard handle routing.

  // Show bonus modal after authentication
  useEffect(() => {
    if (user && !user.welcome_bonus_claimed) {
      // Small delay to let the UI settle
      setTimeout(() => setShowBonusModal(true), 1000);
    }
  }, [user]);

  const handleClaimBonus = async () => {
    setClaimLoading(true);
    try {
      await claimWelcomeBonus();
      setShowBonusModal(false);
    } catch (error: any) {
      // Error handling is done in the claimWelcomeBonus function
      console.error('Failed to claim bonus:', error);
    } finally {
      setClaimLoading(false);
    }
  };

  const colorScheme = useColorScheme();

  // Show loading or splash while authentication is being checked
  if (isLoading) {
    return null; // Let the splash screen handle loading state
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Drawer
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: 'slide',
          swipeEnabled: isAuthenticated,
          drawerStyle: {
            width: '85%',
          },
        }}
      >
        <Drawer.Screen name="splash" options={{ headerShown: false, swipeEnabled: false }} />
        <Drawer.Screen name="(auth)" options={{ headerShown: false, swipeEnabled: false }} />
        <Drawer.Screen name="(tabs)" options={{ headerShown: false }} />
      </Drawer>
      <StatusBar style="auto" />
      <Toast />
      <WelcomeBonusModal
        visible={showBonusModal && !!user && !user.welcome_bonus_claimed}
        onClose={() => setShowBonusModal(false)}
        onClaim={handleClaimBonus}
        loading={claimLoading}
      />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <AuthProvider>
          <GameProvider>
            <RootLayoutNav />
          </GameProvider>
        </AuthProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}
