import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface WelcomeBonusModalProps {
  visible: boolean;
  onClaim: () => void;
  onClose: () => void;
  loading?: boolean;
}

export const WelcomeBonusModal: React.FC<WelcomeBonusModalProps> = ({
  visible,
  onClaim,
  onClose,
  loading = false,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <LinearGradient
          colors={isDark ? ['#0F172A', '#1E293B', '#0F172A'] : ['#1E3A8A', '#2563EB', '#0EA5E9']}
          style={styles.card}
        >
          <View style={styles.iconContainer}>
            <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.iconBubble}>
              <Text style={styles.iconText}>💰</Text>
            </LinearGradient>
          </View>

          <Text style={styles.title}>Claim Your Welcome Bonus!</Text>
          <Text style={styles.subtitle}>
            Kickstart your NASA Farm journey with 1000 bonus coins. Use them to plant premium crops
            and accelerate your growth.
          </Text>

          <TouchableOpacity
            style={styles.claimButton}
            activeOpacity={0.9}
            onPress={onClaim}
            disabled={loading}
          >
            <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.claimButtonGradient}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.claimContent}>
                  <Ionicons name="rocket" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.claimText}>Claim 1000 Coins</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={onClose} disabled={loading}>
            <Text style={styles.skipText}>Maybe later</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBubble: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  iconText: {
    fontSize: 42,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(241, 245, 249, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  claimButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  claimButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  claimText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  skipButton: {
    alignItems: 'center',
  },
  skipText: {
    color: 'rgba(241, 245, 249, 0.8)',
    fontSize: 16,
  },
});

export default WelcomeBonusModal;
