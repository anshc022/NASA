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

interface FarmSelectionScreenProps {
  navigation: any;
}

const CROP_OPTIONS = [
  'wheat', 'rice', 'corn', 'soybeans', 'cotton', 'sugarcane',
  'potatoes', 'tomatoes', 'onions', 'carrots', 'lettuce'
];

export default function FarmSelectionScreen({ navigation }: FarmSelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<FarmDataRequest>({
    lat: 28.6,
    lon: 77.2,
    start: '20240101',
    end: '20240107',
    crop_type: '',
  });

  const [selectedCrop, setSelectedCrop] = useState<string>('');

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
    if (!validateForm()) return;

    const requestData = {
      ...formData,
      crop_type: selectedCrop || undefined,
    };
    AsyncStorage.setItem('lastFarmRequest', JSON.stringify(requestData)).catch(() => {});
    navigation.navigate('FarmData', { farmRequest: requestData });
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 0) }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Select Your Farm</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Farm Location</Text>
            
            <View style={styles.presetButtons}>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setPresetLocation('Delhi, India', 28.6, 77.2)}
              >
                <Text style={styles.presetButtonText}>Delhi, India</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setPresetLocation('Iowa, USA', 41.9, -93.6)}
              >
                <Text style={styles.presetButtonText}>Iowa, USA</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setPresetLocation('São Paulo, Brazil', -23.5, -46.6)}
              >
                <Text style={styles.presetButtonText}>São Paulo, Brazil</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Latitude</Text>
              <TextInput
                style={styles.input}
                value={formData.lat.toString()}
                onChangeText={(text) => setFormData(prev => ({ ...prev, lat: parseFloat(text) || 0 }))}
                keyboardType="numeric"
                placeholder="Enter latitude (-90 to 90)"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Longitude</Text>
              <TextInput
                style={styles.input}
                value={formData.lon.toString()}
                onChangeText={(text) => setFormData(prev => ({ ...prev, lon: parseFloat(text) || 0 }))}
                keyboardType="numeric"
                placeholder="Enter longitude (-180 to 180)"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Time Period</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Date (YYYYMMDD)</Text>
              <TextInput
                style={styles.input}
                value={formData.start}
                onChangeText={(text) => setFormData(prev => ({ ...prev, start: text }))}
                placeholder="20240101"
                maxLength={8}
              />
              <Text style={styles.dateHelper}>Formatted: {formatDate(formData.start)}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>End Date (YYYYMMDD)</Text>
              <TextInput
                style={styles.input}
                value={formData.end}
                onChangeText={(text) => setFormData(prev => ({ ...prev, end: text }))}
                placeholder="20240107"
                maxLength={8}
              />
              <Text style={styles.dateHelper}>Formatted: {formatDate(formData.end)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌾 Crop Type (Optional)</Text>
            <Text style={styles.sectionSubtitle}>Select for personalized AI recommendations</Text>
            
            <View style={styles.cropGrid}>
              {CROP_OPTIONS.map((crop) => (
                <TouchableOpacity
                  key={crop}
                  style={[
                    styles.cropButton,
                    selectedCrop === crop && styles.cropButtonSelected
                  ]}
                  onPress={() => setSelectedCrop(selectedCrop === crop ? '' : crop)}
                >
                  <Text style={[
                    styles.cropButtonText,
                    selectedCrop === crop && styles.cropButtonTextSelected
                  ]}>
                    {crop}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Ionicons name="analytics" size={24} color="white" />
            <Text style={styles.submitButtonText}>Analyze Farm Data</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  presetButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
    marginRight: 8,
    marginBottom: 8,
  },
  presetButtonText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  dateHelper: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  cropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cropButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    marginRight: 8,
    marginBottom: 8,
  },
  cropButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  cropButtonText: {
    fontSize: 14,
    color: '#333',
    textTransform: 'capitalize',
  },
  cropButtonTextSelected: {
    color: 'white',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});