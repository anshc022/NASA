import React, { useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from './src/theme/ThemeProvider';
import AppNavigator from './src/navigation/AppNavigator';
import { ToastProvider, initializeToast } from './src/components/ToastProvider';

export default function App() {
  const toastRef = useRef<any>(null);

  useEffect(() => {
    initializeToast(toastRef);
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <AppNavigator />
          <ToastProvider ref={toastRef} />
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
