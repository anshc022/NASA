import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, Shadows, getThemeColors } from '@/constants/design-system';

interface HeaderProps {
  title?: string;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  showMenu?: boolean;
  showNotification?: boolean;
  rightComponent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  onMenuPress,
  onNotificationPress,
  showMenu = true,
  showNotification = true,
  rightComponent,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);

  const styles = StyleSheet.create({
    container: {
      paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight! + 10,
      paddingBottom: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      ...Shadows.md,
    },
    notificationButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      marginLeft: Spacing.sm,
      ...Shadows.md,
    },
    notificationBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: Colors.error[500],
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
  });

  return (
    <LinearGradient
      colors={isDark ? ['#0F172A', '#1E293B'] : ['#3B82F6', '#2563EB']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {showMenu && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={onMenuPress}
              activeOpacity={0.8}
            >
              <View>
                <View style={{
                  width: 18,
                  height: 2,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 1,
                  marginBottom: 4,
                }} />
                <View style={{
                  width: 18,
                  height: 2,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 1,
                  marginBottom: 4,
                }} />
                <View style={{
                  width: 18,
                  height: 2,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 1,
                }} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.rightSection}>
          {rightComponent}
          {showNotification && (
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={onNotificationPress}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

export default Header;