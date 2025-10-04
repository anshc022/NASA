import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { API_CONFIG } from '../config/api';
import { Toast } from '../components/CustomToast';

interface Farm {
  id: number;
  farm_name?: string;
  latitude: number;
  longitude: number;
  crop_type?: string;
  farm_size?: string;
  created_at: string;
}

export default function MyFarmsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<Farm[]>([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadFarms();
    });
    loadFarms();
    return unsubscribe;
  }, [navigation]);

  const loadFarms = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FARMS}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Failed to fetch farms');
      setFarms(data);
    } catch (e: any) {
      Toast.show(e.message || 'Unable to load farms', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startWithFarm = (f: Farm) => {
    navigation.navigate('FarmData', {
      farmRequest: {
        lat: f.latitude,
        lon: f.longitude,
        crop_type: f.crop_type || 'wheat',
      },
    });
  };

  const renderItem = ({ item }: { item: Farm }) => (
    <Card variant="default" style={styles.farmCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.farmTitle, { color: theme.colors.text }]}>{item.farm_name || 'My Farm'}</Text>
          <Text style={{ color: theme.colors.textSecondary, marginTop: 4 }}>
            {item.latitude.toFixed(3)}, {item.longitude.toFixed(3)} • {item.crop_type || 'crop?'}
          </Text>
          {item.farm_size && (
            <Text style={{ color: theme.colors.textSecondary, marginTop: 2 }}>Size: {item.farm_size}</Text>
          )}
        </View>
        <Button
          title="Open"
          onPress={() => startWithFarm(item)}
          variant="outline"
          size="small"
          icon={<Ionicons name="open-outline" size={16} color={theme.colors.primary} />}
        />
      </View>
    </Card>
  );


  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[styles.title, { color: theme.colors.text }]}>My Farms</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: 12 as any, marginBottom: 12 }}>
          <Button
            title="Use New Location"
            onPress={() => navigation.navigate('FarmSelection')}
            variant="outline"
            size="small"
            icon={<Ionicons name="navigate" size={16} color={theme.colors.primary} />}
          />
        </View>
        {farms.length === 0 ? (
          <Card variant="glass">
            <Text style={{ color: theme.colors.textSecondary }}>No farms yet. Add your first farm to get started.</Text>
          </Card>
        ) : (
          <FlatList
            data={farms}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  farmCard: { marginBottom: 12 },
  farmTitle: { fontSize: 16, fontWeight: '600' },
});
