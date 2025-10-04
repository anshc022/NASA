import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Icons
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import FarmDataScreen from '../screens/FarmDataScreen';
import MyFarmsScreen from '../screens/MyFarmsScreen';
import AddFarmScreen from '../screens/AddFarmScreen';
import TutorialScreen from '../screens/TutorialScreen';
import ResultsScreen from '../screens/ResultsScreen';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Calculate responsive tab bar height
  const getTabBarHeight = () => {
    const baseHeight = Platform.OS === 'ios' ? 85 : 65;
    const scale = Math.min(screenWidth / 375, 1.2); // Cap scaling
    return Math.max(baseHeight, baseHeight * scale) + insets.bottom;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: getTabBarHeight(),
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 10),
          paddingTop: Platform.OS === 'ios' ? 12 : 8,
          paddingHorizontal: 20,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          overflow: 'visible',
        },
        tabBarBackground: () => (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: 'hidden',
            }}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 100 : 80}
              tint={isDark ? 'dark' : 'light'}
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: isDark 
                  ? 'rgba(28, 28, 30, 0.85)' 
                  : 'rgba(255, 255, 255, 0.85)',
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: isDark 
                  ? 'rgba(255, 255, 255, 0.12)' 
                  : 'rgba(0, 0, 0, 0.12)',
              }}
            />
          </View>
        ),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Farm':
              iconName = focused ? 'leaf' : 'leaf-outline';
              break;
            case 'Tutorial':
              iconName = focused ? 'book' : 'book-outline';
              break;
            case 'Results':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }

          const iconSize = 24;
          const iconColor = focused ? theme.colors.primary : theme.colors.textSecondary;
          
          return (
            <View style={[
              styles.iconContainer,
              focused && {
                backgroundColor: theme.colors.primary + '15',
              }
            ]}>
              <Ionicons name={iconName} size={iconSize} color={iconColor} />
            </View>
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
          fontFamily: Platform.select({
            ios: 'System',
            android: 'Roboto',
            default: 'System',
          }),
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Farm" 
        component={MyFarmsScreen as any}
        options={{ tabBarLabel: 'Farm' }}
      />
      <Tab.Screen 
        name="Tutorial" 
        component={TutorialScreen}
        options={{ tabBarLabel: 'Tutorial' }}
      />
      <Tab.Screen 
        name="Results" 
        component={ResultsScreen}
        options={{ tabBarLabel: 'Results' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});