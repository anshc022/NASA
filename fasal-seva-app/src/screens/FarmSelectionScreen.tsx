import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FarmDataRequest } from '../types/api';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { API_CONFIG } from '../config/api';
import { Toast } from '../components/CustomToast';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

interface FarmSelectionScreenProps {
  navigation: any;
}

const CROP_OPTIONS = [
  'wheat', 'rice', 'corn', 'soybeans', 'cotton', 'sugarcane',
  'potatoes', 'tomatoes', 'onions', 'carrots', 'lettuce'
];

export default function FarmSelectionScreen({ navigation }: FarmSelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [formData, setFormData] = useState<FarmDataRequest>({
    lat: 28.6,
    lon: 77.2,
    start: '20240101',
    end: '20240107',
    crop_type: '',
  });

  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [fetchingLocation, setFetchingLocation] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('lastFarmRequest');
        if (saved) {
          const parsed = JSON.parse(saved);
          setFormData(prev => ({ ...prev, ...parsed }));
          if (parsed.crop_type) setSelectedCrop(parsed.crop_type);
        }
      } catch {}
    })();
  }, []);

  const validateForm = (): boolean => {
    if (!formData.lat || !formData.lon) {
      Alert.alert('Validation Error', 'Please enter valid latitude and longitude');
      return false;
    }

    if (formData.lat < -90 || formData.lat > 90) {
      Alert.alert('Validation Error', 'Latitude must be between -90 and 90');
      return false;
    }

    if (formData.lon < -180 || formData.lon > 180) {
      Alert.alert('Validation Error', 'Longitude must be between -180 and 180');
      return false;
    }

    if (!formData.start || !formData.end) {
      Alert.alert('Validation Error', 'Please enter valid start and end dates');
      return false;
    }

    if (formData.start >= formData.end) {
      Alert.alert('Validation Error', 'End date must be after start date');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    (async () => {
      if (!validateForm()) return;

      const requestData = {
        ...formData,
        crop_type: selectedCrop || undefined,
      };
      await AsyncStorage.setItem('lastFarmRequest', JSON.stringify(requestData)).catch(() => {});

      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) {
          Toast.show('Please login to save your farm', 'error');
          navigation.navigate('Login');
          return;
        }
        const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FARMS}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            farm_name: `Farm ${requestData.lat.toFixed(3)},${requestData.lon.toFixed(3)}`,
            latitude: requestData.lat,
            longitude: requestData.lon,
            crop_type: requestData.crop_type,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          Toast.show(data?.detail || 'Failed to save farm', 'error');
          return;
        }
        Toast.show('Farm saved successfully', 'success');
        navigation.navigate('MyFarms');
      } catch (e) {
        Toast.show('Unable to save farm', 'error');
      }
    })();
  };

  const setPresetLocation = (name: string, lat: number, lon: number) => {
    setFormData(prev => ({ ...prev, lat, lon }));
  };

  const formatDate = (dateStr: string): string => {
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
  };

  const useMyLocation = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show('Location permission denied', 'error');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setFormData(prev => ({
        ...prev,
        lat: Number(loc.coords.latitude.toFixed(6)),
        lon: Number(loc.coords.longitude.toFixed(6)),
      }));
    } catch (e) {
      Toast.show('Unable to get current location', 'error');
    } finally {
      setFetchingLocation(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}> 
      <LinearGradient
        colors={isDark ? ['#000000', '#1C1C1E', '#2C2C2E'] : ['#F2F2F7', '#FFFFFF', '#F9F9F9']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 8) }]}>
            <Button
              title=""
              onPress={() => navigation.goBack()}
              variant="glass"
              size="small"
              icon={<Ionicons name="arrow-back" size={20} color={theme.colors.text} />}
              style={{ paddingHorizontal: 10, paddingVertical: 8 }}
            />
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Select Your Farm</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
            {/* Location Card */}
            <Card variant="glass" style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="location" size={20} color={theme.colors.primary} />
                <Text style={[styles.cardTitle, { color: theme.colors.text, marginLeft: 8 }]}>Farm Location</Text>
              </View>
              <View style={styles.presetRow}>
                <Button title="Delhi, India" onPress={() => setPresetLocation('Delhi, India', 28.6, 77.2)} variant="outline" size="small" />
                <Button title="Iowa, USA" onPress={() => setPresetLocation('Iowa, USA', 41.9, -93.6)} variant="outline" size="small" />
                <Button title="São Paulo" onPress={() => setPresetLocation('São Paulo, Brazil', -23.5, -46.6)} variant="outline" size="small" />
                <Button title={fetchingLocation ? 'Locating…' : 'Use Current'} onPress={useMyLocation} variant="outline" size="small" disabled={fetchingLocation} />
              </View>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.inputLabelThemed, { color: theme.colors.text }]}>Latitude</Text>
                  <TextInput
                    style={[styles.inputThemed, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    value={formData.lat.toString()}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, lat: parseFloat(text) || 0 }))}
                    keyboardType="numeric"
                    placeholder="-90 to 90"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.inputLabelThemed, { color: theme.colors.text }]}>Longitude</Text>
                  <TextInput
                    style={[styles.inputThemed, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    value={formData.lon.toString()}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, lon: parseFloat(text) || 0 }))}
                    keyboardType="numeric"
                    placeholder="-180 to 180"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
              </View>
            </Card>

            {/* Time Period */}
            <Card variant="default" style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="calendar" size={20} color={theme.colors.secondary} />
                <Text style={[styles.cardTitle, { color: theme.colors.text, marginLeft: 8 }]}>Time Period</Text>
              </View>
              <View>
                <Text style={[styles.inputLabelThemed, { color: theme.colors.text }]}>Start Date (YYYYMMDD)</Text>
                <TextInput
                  style={[styles.inputThemed, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  value={formData.start}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, start: text }))}
                  placeholder="20240101"
                  placeholderTextColor={theme.colors.textSecondary}
                  maxLength={8}
                />
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>Formatted: {formatDate(formData.start)}</Text>
              </View>
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.inputLabelThemed, { color: theme.colors.text }]}>End Date (YYYYMMDD)</Text>
                <TextInput
                  style={[styles.inputThemed, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  value={formData.end}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, end: text }))}
                  placeholder="20240107"
                  placeholderTextColor={theme.colors.textSecondary}
                  maxLength={8}
                />
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>Formatted: {formatDate(formData.end)}</Text>
              </View>
            </Card>

            {/* Crop Type */}
            <Card variant="glass" style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="leaf" size={20} color={theme.colors.primary} />
                <Text style={[styles.cardTitle, { color: theme.colors.text, marginLeft: 8 }]}>Crop Type (Optional)</Text>
              </View>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 8 }}>Select for personalized AI recommendations</Text>
              <View style={styles.cropGridRow}>
                {CROP_OPTIONS.map((crop) => (
                  <TouchableOpacity
                    key={crop}
                    style={[
                      styles.chip,
                      { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                      selectedCrop === crop && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                    ]}
                    onPress={() => setSelectedCrop(selectedCrop === crop ? '' : crop)}
                  >
                    <Text style={{ color: selectedCrop === crop ? '#fff' : theme.colors.text, textTransform: 'capitalize', fontSize: 13 }}>
                      {crop}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Note: This screen is for adding a farm; open farms from My Farms */}
          </ScrollView>

          {/* Sticky CTA */}
          <View style={[styles.stickyBar, { backgroundColor: isDark ? 'rgba(28,28,30,0.9)' : 'rgba(255,255,255,0.9)', borderTopColor: theme.colors.border }]}> 
            <Button
              title="Save Farm"
              onPress={handleSubmit}
              variant="primary"
              size="large"
              icon={<Ionicons name="analytics" size={20} color="#fff" />}
              style={{ flex: 1 }}
            />
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scrollView: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 as any, marginBottom: 12 },
  inputLabelThemed: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputThemed: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  cropGridRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});