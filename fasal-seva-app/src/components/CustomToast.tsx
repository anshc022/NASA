import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';

const { width: screenWidth } = Dimensions.get('window');

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onHide: () => void;
}

export const CustomToast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 15,
          mass: 1,
          stiffness: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          color: theme.colors.success,
          backgroundColor: isDark ? 'rgba(50, 215, 75, 0.1)' : 'rgba(50, 215, 75, 0.1)',
        };
      case 'error':
        return {
          icon: 'close-circle',
          color: theme.colors.error,
          backgroundColor: isDark ? 'rgba(255, 69, 58, 0.1)' : 'rgba(255, 69, 58, 0.1)',
        };
      case 'warning':
        return {
          icon: 'warning',
          color: theme.colors.warning,
          backgroundColor: isDark ? 'rgba(255, 159, 10, 0.1)' : 'rgba(255, 159, 10, 0.1)',
        };
      default:
        return {
          icon: 'information-circle',
          color: theme.colors.info,
          backgroundColor: isDark ? 'rgba(100, 210, 255, 0.1)' : 'rgba(100, 210, 255, 0.1)',
        };
    }
  };

  const config = getToastConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity onPress={hideToast} activeOpacity={0.9}>
        <BlurView
          intensity={80}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.toastContainer,
            {
              backgroundColor: config.backgroundColor,
              borderColor: config.color + '40',
            },
          ]}
        >
          <Ionicons name={config.icon as any} size={20} color={config.color} />
          <Text style={[styles.message, { color: theme.colors.text }]}>
            {message}
          </Text>
          <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
            <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
});

// Toast Manager
class ToastManager {
  private static instance: ToastManager;
  private toastRef: React.RefObject<any> = React.createRef();

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    if (this.toastRef.current) {
      this.toastRef.current.show(message, type);
    }
  }

  setRef(ref: any) {
    this.toastRef.current = ref;
  }
}

export const Toast = ToastManager.getInstance();