import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import FarmSelectionScreen from '../screens/FarmSelectionScreen';
import FarmDataScreen from '../screens/FarmDataScreen';
import ResultsScreen from '../screens/ResultsScreen';
import MyFarmsScreen from '../screens/MyFarmsScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const welcomeStatus = await AsyncStorage.getItem('hasSeenWelcome');
      const token = await AsyncStorage.getItem('accessToken');
      
      setHasSeenWelcome(welcomeStatus === 'true');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={
        !hasSeenWelcome ? 'Welcome' : !isAuthenticated ? 'Login' : 'Main'
      }
    >
      {/* Welcome & Auth Screens */}
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      
      {/* Main App with Bottom Tabs */}
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      
      {/* Other Screens */}
      <Stack.Screen name="FarmSelection" component={FarmSelectionScreen} />
      <Stack.Screen name="FarmData" component={FarmDataScreen} />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="MyFarms" component={MyFarmsScreen} />
    </Stack.Navigator>
  );
}