import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { API_CONFIG } from '../config/api';
import { Toast } from '../components/CustomToast';

export default function AddFarmScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [farmName, setFarmName] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lon, setLon] = useState<string>('');
  const [cropType, setCropType] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const useMyLocation = async () => {
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show('Location permission denied', 'error');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(String(loc.coords.latitude.toFixed(6)));
      setLon(String(loc.coords.longitude.toFixed(6)));
    } catch (e: any) {
      Toast.show('Unable to get location', 'error');
    } finally {
      setFetchingLocation(false);
    }
  };

  const saveFarm = async () => {
    if (!lat || !lon) {
      Toast.show('Please set latitude and longitude (or use Current Location)', 'error');
      return;
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FARMS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          farm_name: farmName || undefined,
          latitude: Number(lat),
          longitude: Number(lon),
          crop_type: cropType || undefined,
          farm_size: farmSize || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Failed to save farm');
      Toast.show('Farm saved', 'success');
      navigation.replace('MyFarms');
    } catch (e: any) {
      Toast.show(e.message || 'Unable to save farm', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={{ padding: 16 }}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Add Farm</Text>
        <Card variant="glass" style={{ marginTop: 12 }}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Farm Name</Text>
          <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="e.g., Home Field" placeholderTextColor={theme.colors.textSecondary}
            value={farmName} onChangeText={setFarmName} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Latitude *</Text>
              <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} keyboardType="numeric"
                placeholder="e.g., 28.6139" placeholderTextColor={theme.colors.textSecondary}
                value={lat} onChangeText={setLat} />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Longitude *</Text>
              <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} keyboardType="numeric"
                placeholder="e.g., 77.2090" placeholderTextColor={theme.colors.textSecondary}
                value={lon} onChangeText={setLon} />
            </View>
          </View>

          <Button
            title={fetchingLocation ? 'Getting Location…' : 'Use Current Location'}
            onPress={useMyLocation}
            variant="outline"
            size="small"
            icon={fetchingLocation ? undefined : <Ionicons name="locate" size={16} color={theme.colors.primary} />}
            disabled={fetchingLocation}
            style={{ marginTop: 8, marginBottom: 8 }}
          />

          <Text style={[styles.label, { color: theme.colors.text }]}>Crop Type</Text>
          <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="e.g., wheat" placeholderTextColor={theme.colors.textSecondary}
            value={cropType} onChangeText={setCropType} />

          <Text style={[styles.label, { color: theme.colors.text }]}>Farm Size</Text>
          <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="e.g., 2 acres" placeholderTextColor={theme.colors.textSecondary}
            value={farmSize} onChangeText={setFarmSize} />

          <Button
            title={loading ? 'Saving…' : 'Save Farm'}
            onPress={saveFarm}
            variant="primary"
            size="large"
            style={{ marginTop: 12 }}
            disabled={loading}
            icon={!loading ? <Ionicons name="save" size={18} color="#fff" /> : undefined}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  label: { marginTop: 8, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
});
