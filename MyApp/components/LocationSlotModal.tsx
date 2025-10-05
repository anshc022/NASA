import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { farmAPI } from '../services/api';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';

interface LocationSlot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  crop_type?: string;
  farm_size?: number;
  climate_data?: any;
  isActive: boolean;
}

const PRESET_LOCATIONS = [
  { name: "Punjab, India", lat: 31.1471, lon: 75.3412, climate: "Wheat Belt" },
  { name: "Iowa, USA", lat: 42.0308, lon: -93.6319, climate: "Corn Belt" },
  { name: "São Paulo, Brazil", lat: -23.5505, lon: -46.6333, climate: "Coffee Region" },
  { name: "Punjab, Pakistan", lat: 30.3753, lon: 69.3451, climate: "Cotton Belt" },
  { name: "Uttar Pradesh, India", lat: 26.8467, lon: 80.9462, climate: "Sugar Belt" },
  { name: "California, USA", lat: 36.7783, lon: -119.4179, climate: "Fruit Valley" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (slot: LocationSlot) => void;
}

export default function LocationSlotModal({ visible, onClose, onSelectLocation }: Props) {
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');
  
  const [locations, setLocations] = useState<LocationSlot[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Add new location form
  const [newLocation, setNewLocation] = useState({
    name: '',
    latitude: '',
    longitude: '',
    crop_type: 'wheat',
    farm_size: 10,
  });

  useEffect(() => {
    if (visible) {
      loadExistingFarms();
    }
  }, [visible]);

  const loadExistingFarms = async () => {
    try {
      setIsLoading(true);
      const response = await farmAPI.listFarms();
      
      const farmSlots: LocationSlot[] = response.map((farm: any) => ({
        id: farm.id,
        name: farm.farm_name,
        latitude: farm.latitude,
        longitude: farm.longitude,
        crop_type: farm.crop_type,
        farm_size: farm.farm_size,
        isActive: true,
      }));
      
      setLocations(farmSlots);
    } catch (error) {
      console.error('Failed to load farms:', error);
      // If no farms exist, show empty state
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.name || !newLocation.latitude || !newLocation.longitude) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create farm using existing API
      const response = await farmAPI.createFarm({
        farm_name: newLocation.name,
        latitude: parseFloat(newLocation.latitude),
        longitude: parseFloat(newLocation.longitude),
        crop_type: newLocation.crop_type,
        farm_size: newLocation.farm_size?.toString() || '10',
      });

      // Get NASA climate data for this location (use recent but safe date range)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 3); // 3 days ago to account for NASA data lag
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30); // Get 30 days of recent data
      
      // Format dates as YYYYMMDD for NASA API
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0].replace(/-/g, '');
      };
      
      let climateData = null;
      try {
        climateData = await farmAPI.getFarmData({
          lat: parseFloat(newLocation.latitude),
          lon: parseFloat(newLocation.longitude),
          start: formatDate(startDate), // Format: YYYYMMDD
          end: formatDate(endDate),
          crop_type: newLocation.crop_type,
        });
      } catch (climateError) {
        console.warn('Could not fetch NASA climate data:', climateError);
        // Continue without climate data - the location will still work
      }

      const newSlot: LocationSlot = {
        id: response.id,
        name: newLocation.name,
        latitude: parseFloat(newLocation.latitude),
        longitude: parseFloat(newLocation.longitude),
        crop_type: newLocation.crop_type,
        farm_size: newLocation.farm_size,
        climate_data: climateData,
        isActive: true,
      };

      setLocations([...locations, newSlot]);
      setShowAddForm(false);
      setNewLocation({ name: '', latitude: '', longitude: '', crop_type: 'wheat', farm_size: 10 });
      
      Alert.alert('Success', 'Farm location added with NASA climate data!');
    } catch (error) {
      console.error('Failed to add location:', error);
      Alert.alert('Error', 'Failed to add farm location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetLocation = (preset: typeof PRESET_LOCATIONS[0]) => {
    setNewLocation({
      name: preset.name,
      latitude: preset.lat.toString(),
      longitude: preset.lon.toString(),
      crop_type: 'wheat',
      farm_size: 10,
    });
  };

  const handleSelectLocation = async (location: LocationSlot) => {
    try {
      // Get fresh NASA data for selected location (use safe date range)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 3); // 3 days ago to account for NASA data lag
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30); // Get 30 days of recent data
      
      // Format dates as YYYYMMDD for NASA API
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0].replace(/-/g, '');
      };
      
      const climateData = await farmAPI.getFarmData({
        lat: location.latitude,
        lon: location.longitude,
        start: formatDate(startDate),
        end: formatDate(endDate),
        crop_type: location.crop_type,
      });

      onSelectLocation({
        ...location,
        climate_data: climateData,
      });
    } catch (error) {
      console.error('Failed to get climate data:', error);
      onSelectLocation(location);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              🌍 Select Farm Location
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose a location with real NASA climate data for optimal farming
          </Text>

          <ScrollView style={styles.content}>
            {/* Existing Farm Locations */}
            {locations.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Your Farm Locations
                </Text>
                {locations.map((location) => (
                  <TouchableOpacity
                    key={location.id}
                    style={[styles.locationCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => handleSelectLocation(location)}
                  >
                    <View style={styles.locationInfo}>
                      <Text style={[styles.locationName, { color: colors.text }]}>
                        🌱 {location.name}
                      </Text>
                      <Text style={[styles.locationDetails, { color: colors.textSecondary }]}>
                        📍 {location.latitude.toFixed(2)}, {location.longitude.toFixed(2)}
                      </Text>
                      <Text style={[styles.locationDetails, { color: colors.textSecondary }]}>
                        🌾 {location.crop_type} • {location.farm_size} acres
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Add New Location Section */}
            {!showAddForm ? (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowAddForm(true)}
              >
                <Ionicons name="add" size={24} color="white" />
                <Text style={styles.addButtonText}>Add New Farm Location</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Add New Location
                </Text>
                
                {/* Preset Locations */}
                <Text style={[styles.presetTitle, { color: colors.textSecondary }]}>
                  Quick Select (Preset Locations):
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                  {PRESET_LOCATIONS.map((preset, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.presetCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => handlePresetLocation(preset)}
                    >
                      <Text style={[styles.presetName, { color: colors.text }]}>{preset.name}</Text>
                      <Text style={[styles.presetClimate, { color: colors.textSecondary }]}>{preset.climate}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Manual Entry Form */}
                <View style={styles.form}>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    placeholder="Farm Name (e.g., My Farm in Punjab)"
                    placeholderTextColor={colors.textSecondary}
                    value={newLocation.name}
                    onChangeText={(text) => setNewLocation({...newLocation, name: text})}
                  />
                  
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.halfInput, { borderColor: colors.border, color: colors.text }]}
                      placeholder="Latitude"
                      placeholderTextColor={colors.textSecondary}
                      value={newLocation.latitude}
                      onChangeText={(text) => setNewLocation({...newLocation, latitude: text})}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.halfInput, { borderColor: colors.border, color: colors.text }]}
                      placeholder="Longitude"
                      placeholderTextColor={colors.textSecondary}
                      value={newLocation.longitude}
                      onChangeText={(text) => setNewLocation({...newLocation, longitude: text})}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.cancelButton, { borderColor: colors.border }]}
                      onPress={() => setShowAddForm(false)}
                    >
                      <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.saveButton, { backgroundColor: colors.primary }]}
                      onPress={handleAddLocation}
                      disabled={isLoading}
                    >
                      <Text style={styles.saveButtonText}>
                        {isLoading ? 'Adding...' : 'Add Location'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Info Section */}
            <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.infoTitle, { color: colors.primary }]}>
                🛰️ NASA Data Integration
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Each location uses real NASA POWER data for temperature, rainfall, and climate conditions to affect crop growth in your game!
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    maxHeight: '90%',
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  content: {
    maxHeight: 500,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationDetails: {
    fontSize: 12,
    marginBottom: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  presetTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  presetScroll: {
    marginBottom: 16,
  },
  presetCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 120,
  },
  presetName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  presetClimate: {
    fontSize: 10,
  },
  form: {
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 16,
  },
});