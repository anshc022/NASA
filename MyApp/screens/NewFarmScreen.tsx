import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import SimpleCard from '../components/SimpleCard';
import LocationSlotModal from '../components/LocationSlotModal';
import ScenarioModal from '../components/ScenarioModal';

export default function NewFarmScreen() {
  const { user } = useAuth();
  const { crops, plantCrop, harvestCrop, waterCrop, fertilizeCrop, loadFarmData, isLoading, error, climateBonus, setClimateBonus } = useGame();
  const colorScheme = useColorScheme();
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ row: number; col: number } | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [selectedCropForScenarios, setSelectedCropForScenarios] = useState<{ id: string; name: string } | null>(null);
  const colors = getThemeColors(colorScheme === 'dark');
  const isDark = colorScheme === 'dark';

  const cropOptions = [
    { id: 'tomato', name: 'Tomato', emoji: '🍅', icon: 'nutrition' as const, cost: 50, time: 30, color: '#EF4444', description: 'Fast growing, high value' },
    { id: 'wheat', name: 'Wheat', emoji: '🌾', icon: 'leaf' as const, cost: 30, time: 60, color: '#F59E0B', description: 'Reliable crop, good profit' },
    { id: 'corn', name: 'Corn', emoji: '🌽', icon: 'flower' as const, cost: 80, time: 90, color: '#EAB308', description: 'Expensive but rewarding' },
    { id: 'carrot', name: 'Carrot', emoji: '🥕', icon: 'triangle' as const, cost: 40, time: 45, color: '#FB923C', description: 'Root vegetable, steady growth' },
    { id: 'potato', name: 'Potato', emoji: '🥔', icon: 'ellipse' as const, cost: 35, time: 75, color: '#A3A3A3', description: 'Underground crop, long lasting' },
    { id: 'lettuce', name: 'Lettuce', emoji: '🥬', icon: 'leaf-outline' as const, cost: 25, time: 25, color: '#22C55E', description: 'Quick harvest, low cost' },
  ];

  // Create a grid layout for farm slots (3x4 grid = 12 slots)
  const farmSlots = Array.from({ length: 12 }, (_, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    const existingCrop = crops.find(crop => crop.position.row === row && crop.position.col === col);
    return {
      id: `${row}-${col}`,
      position: { row, col },
      crop: existingCrop,
      index: index + 1,
    };
  });

  const activeCrops = crops.filter(crop => crop.growthStage < 100);
  const readyCrops = crops.filter(crop => crop.growthStage >= 100);
  const totalSlots = farmSlots.length;

  // Helper function to check if user can afford a crop
  const canAffordCrop = (cost: number) => (user?.coins || 0) >= cost;

  // Load farm data on component mount
  useEffect(() => {
    loadFarmData();
  }, []);

  // Set up real-time updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadFarmData();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Calculate climate bonus based on NASA data
  useEffect(() => {
    if (currentLocation?.climate_data) {
      const data = currentLocation.climate_data;
      let bonus = 1.0;
      
      // Temperature bonus (optimal range: 20-30°C)
      if (data.temperature_2m && data.temperature_2m >= 20 && data.temperature_2m <= 30) {
        bonus += 0.2;
      }
      
      // Precipitation bonus (optimal: 2-5mm/day)
      if (data.precipitation && data.precipitation >= 2 && data.precipitation <= 5) {
        bonus += 0.15;
      }
      
      // Solar radiation bonus
      if (data.solar_radiation && data.solar_radiation > 15) {
        bonus += 0.1;
      }
      
      setClimateBonus(Math.min(bonus, 2.0)); // Max 2x bonus
    }
  }, [currentLocation]);

  const handleLocationSelect = (location: any) => {
    setCurrentLocation(location);
    setShowLocationModal(false);
  };

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="leaf-outline" size={32} color={colors.primary} />
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>
                My Farm
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Manage your crops and expand your farm
              </Text>
            </View>
          </View>
        </View>

        {/* Farm Stats */}
        <View style={styles.statsRow}>
          <SimpleCard
            title="Farm Slots"
            value={totalSlots}
            icon="grid-outline"
            subtitle="available"
          />
          <SimpleCard
            title="Ready to Harvest"
            value={readyCrops.length}
            icon="checkmark-circle"
            subtitle="crops"
            gradient={readyCrops.length > 0 ? ['#10B981', '#059669'] : undefined}
          />
        </View>

          {/* Location Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🌍 Farm Location
            </Text>
            
            {currentLocation ? (
              <TouchableOpacity 
                style={[styles.locationCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowLocationModal(true)}
              >
                <View style={styles.locationInfo}>
                  <Text style={[styles.locationName, { color: colors.text }]}>
                    📍 {currentLocation.name}
                  </Text>
                  <Text style={[styles.locationDetails, { color: colors.textSecondary }]}>
                    Lat: {currentLocation.latitude?.toFixed(2)}, Lon: {currentLocation.longitude?.toFixed(2)}
                  </Text>
                  {climateBonus > 1.0 && (
                    <Text style={[styles.climateBonus, { color: colors.success }]}>
                      🌟 Climate Bonus: +{Math.round((climateBonus - 1) * 100)}% growth
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.selectLocationButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowLocationModal(true)}
              >
                <Ionicons name="location" size={24} color="white" />
                <Text style={styles.selectLocationText}>Select Farm Location</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Interactive Farm Tools */}
          {currentLocation && (
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.interactiveMapButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/farm-map')}
              >
                <View style={styles.mapButtonContent}>
                  <Ionicons name="map" size={24} color="white" />
                  <View style={styles.mapButtonText}>
                    <Text style={styles.mapButtonTitle}>🗺️ Interactive Farm Map</Text>
                    <Text style={styles.mapButtonSubtitle}>
                      View scenarios, overlays & future farming tools
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Farm Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Farm Information
            </Text>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Tap on empty slots to plant crops. Tap on ready crops to harvest them.
              {currentLocation && ' Your farm location affects crop growth with real NASA climate data!'}
            </Text>
            
            {/* Loading and Error States */}
            {isLoading && (
              <View style={styles.statusContainer}>
                <Text style={[styles.statusText, { color: colors.primary }]}>🔄 Updating farm data...</Text>
              </View>
            )}
            
            {error && (
              <View style={styles.statusContainer}>
                <Text style={[styles.statusText, { color: '#ef4444' }]}>⚠️ {error}</Text>
              </View>
            )}
          </View>
          
          {/* Farm Grid */}
          <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Farm Slots
          </Text>
          <View style={styles.plotGrid}>
            {farmSlots.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.plot,
                  { 
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: !currentLocation && !slot.crop ? 0.5 : 1.0,
                  }
                ]}
                onPress={async () => {
                  if (!currentLocation && !slot.crop) {
                    // Cannot plant without location - show alert
                    alert('🌍 Please select a farm location first!\n\nTap "Select Farm Location" to choose where your farm is located. NASA will provide real climate data for better crop growth!');
                    return;
                  }
                  
                  if (slot.crop) {
                    // If crop has active scenarios, show scenario modal instead
                    if (slot.crop.needs_attention && (slot.crop.active_scenarios || 0) > 0) {
                      setSelectedCropForScenarios({ id: slot.crop.id, name: slot.crop.name });
                      setShowScenarioModal(true);
                    } else {
                      // Navigate to plant detail screen for existing crops without scenarios
                      router.push({
                        pathname: '/plant-detail',
                        params: { plantId: slot.crop.id }
                      });
                    }
                  } else if (!slot.crop) {
                    setSelectedSlot(slot.position);
                    setShowPlantModal(true);
                  }
                }}
              >
                <View style={styles.plotContent}>
                  {slot.crop ? (
                    <>
                      <View style={styles.plotIcon}>
                        <Ionicons 
                          name={
                            slot.crop.growthStage >= 100 ? 'checkmark-circle' : 
                            slot.crop.growthStage >= 75 ? 'leaf' : 
                            slot.crop.growthStage >= 50 ? 'flower-outline' : 'ellipse-outline'
                          } 
                          size={28} 
                          color={
                            slot.crop.growthStage >= 100 ? colors.success : 
                            slot.crop.growthStage >= 75 ? '#8BC34A' : 
                            slot.crop.growthStage >= 50 ? '#4CAF50' : colors.primary
                          }
                        />
                        {/* Red dot indicator for scenarios needing attention */}
                        {slot.crop.needs_attention && (
                          <View style={styles.attentionIndicator}>
                            <View style={styles.redDot} />
                            <View style={styles.redDotPulse} />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.plotType, { color: colors.text }]}>
                        {slot.crop.name}
                      </Text>
                      {(slot.crop.active_scenarios || 0) > 0 && (
                        <Text style={[styles.scenarioCount, { color: '#EF4444' }]}>
                          🚨 {slot.crop.active_scenarios} scenario{(slot.crop.active_scenarios || 0) !== 1 ? 's' : ''}
                        </Text>
                      )}
                      {slot.crop.growthStage >= 100 ? (
                        <Text style={[styles.plotStatus, { color: colors.success }]}>
                          Ready!
                        </Text>
                      ) : (
                        <View style={styles.progressContainer}>
                          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                            <View 
                              style={[
                                styles.progressFill, 
                                { backgroundColor: colors.primary, width: `${slot.crop.growthStage}%` }
                              ]} 
                            />
                          </View>
                          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                            {Math.round(slot.crop.growthStage)}%
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <View style={styles.emptyPlotIcon}>
                        {currentLocation ? (
                          <Ionicons name="add" size={32} color={colors.primary} />
                        ) : (
                          <Ionicons name="location-outline" size={32} color={colors.textSecondary} />
                        )}
                      </View>
                      <Text style={[styles.plotType, { color: colors.textSecondary }]}>
                        {currentLocation ? 'Empty Slot' : 'Need Location'}
                      </Text>
                      <Text style={[styles.plotStatus, { color: currentLocation ? colors.primary : colors.warning }]}>
                        {currentLocation ? 'Tap to plant' : 'Select location first'}
                      </Text>
                    </>
                  )}
                </View>
                <Text style={[styles.plotNumber, { color: colors.textSecondary }]}>
                  #{slot.index}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>

      <PlantingModal
        visible={showPlantModal}
        onClose={() => {
          setShowPlantModal(false);
          setSelectedSlot(null);
        }}
        onPlant={async (crop) => {
          if (selectedSlot !== null) {
            // Pass location data if available
            const locationData = currentLocation ? {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude
            } : undefined;
            
            await plantCrop(crop.name, selectedSlot, locationData);
            setShowPlantModal(false);
            setSelectedSlot(null);
          }
        }}
        selectedSlot={selectedSlot}
        colors={colors}
        user={user}
      />
      
      <LocationSlotModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={handleLocationSelect}
      />
      
      <ScenarioModal
        visible={showScenarioModal}
        onClose={() => {
          setShowScenarioModal(false);
          setSelectedCropForScenarios(null);
        }}
        cropId={selectedCropForScenarios?.id || ''}
        cropName={selectedCropForScenarios?.name || ''}
      />
    </>
  );
};

// Planting Modal Component
const PlantingModal = ({ visible, onClose, onPlant, selectedSlot, colors, user }: {
  visible: boolean;
  onClose: () => void;
  onPlant: (crop: any) => void;
  selectedSlot: { row: number; col: number } | null;
  colors: any;
  user: any;
}) => {
  const CROP_TYPES = [
    {
      name: 'Tomato',
      emoji: '🍅',
      icon: 'nutrition-outline',
      cost: 10,
      time: 2,
      color: '#e74c3c',
      description: 'Fast-growing and profitable'
    },
    {
      name: 'Wheat',
      emoji: '🌾',
      icon: 'leaf-outline',
      cost: 5,
      time: 4,
      color: '#f39c12',
      description: 'Stable crop for beginners'
    },
    {
      name: 'Corn',
      emoji: '🌽',
      icon: 'flower-outline',
      cost: 15,
      time: 3,
      color: '#f1c40f',
      description: 'High yield golden crop'
    },
    {
      name: 'Carrot',
      emoji: '🥕',
      icon: 'triangle-outline',
      cost: 8,
      time: 2.5,
      color: '#e67e22',
      description: 'Nutritious root vegetable'
    },
    {
      name: 'Potato',
      emoji: '🥔',
      icon: 'ellipse-outline',
      cost: 12,
      time: 5,
      color: '#8b7355',
      description: 'Versatile and filling'
    },
    {
      name: 'Lettuce',
      emoji: '🥬',
      icon: 'leaf-outline',
      cost: 6,
      time: 1.5,
      color: '#27ae60',
      description: 'Quick growing leafy green'
    }
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: colors.card }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: colors.text }]}>Choose Crop to Plant</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={modalStyles.cropList}>
            {CROP_TYPES.map((crop, index) => {
              const canAfford = user ? user.coins >= crop.cost : true;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    modalStyles.cropOption, 
                    { 
                      backgroundColor: colors.background,
                      borderColor: canAfford ? colors.border : colors.error,
                      opacity: canAfford ? 1 : 0.7
                    }
                  ]}
                  onPress={() => {
                    if (selectedSlot !== null && canAfford) {
                      onPlant(crop);
                      onClose();
                    }
                  }}
                  disabled={!canAfford}
                >
                <View style={modalStyles.cropInfo}>
                  <View style={[modalStyles.cropIcon, { backgroundColor: crop.color + '20' }]}>
                    <Text style={modalStyles.cropEmoji}>{crop.emoji}</Text>
                  </View>
                  <View style={modalStyles.cropDetails}>
                    <Text style={[modalStyles.cropName, { color: colors.text }]}>{crop.name}</Text>
                    <Text style={[modalStyles.cropDescription, { color: colors.text + '80' }]}>
                      {crop.description}
                    </Text>
                    <View style={modalStyles.cropStats}>
                      <Text style={[modalStyles.cropStat, { color: crop.color }]}>
                        💰 {crop.cost} coins
                      </Text>
                      <Text style={[modalStyles.cropStat, { color: colors.text + '60' }]}>
                        ⏱️ {crop.time}h
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cropSelection: {
    flexDirection: 'row',
    gap: 12,
  },
  cropOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  // Header styles
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  // Crop selection styles
  cropIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cropName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  cropInfo: {
    gap: 4,
    alignItems: 'center',
  },
  cropInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cropCost: {
    fontSize: 12,
  },
  cropTime: {
    fontSize: 12,
  },
  plotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  plot: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  addPlot: {
    borderWidth: 2,
  },
  plotContent: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  // Plot styles
  plotIcon: {
    marginBottom: 8,
    alignItems: 'center',
  },
  emptyPlotIcon: {
    marginBottom: 8,
    alignItems: 'center',
    opacity: 0.5,
  },
  plotType: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  plotStatus: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '500',
  },
  plotNumber: {
    fontSize: 10,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
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
  climateBonus: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  selectLocationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  interactiveMapButton: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  mapButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mapButtonText: {
    flex: 1,
  },
  mapButtonTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  mapButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  attentionIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    position: 'absolute',
  },
  redDotPulse: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    opacity: 0.3,
    position: 'absolute',
    top: -2,
    left: -2,
  },
  scenarioCount: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  cropList: {
    maxHeight: 400,
  },
  cropOption: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  cropInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cropEmoji: {
    fontSize: 24,
  },
  cropDetails: {
    flex: 1,
  },
  cropName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cropDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  cropStats: {
    flexDirection: 'row',
    gap: 16,
  },
  cropStat: {
    fontSize: 12,
    fontWeight: '500',
  },
});