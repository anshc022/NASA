import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import { farmAPI } from '../services/api';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface FarmSlot {
  row: number;
  col: number;
  crop?: {
    id: string;
    name: string;
    growth_stage: number;
    health: number;
    water_level: number;
    fertilizer_level: number;
  };
}

interface DataLayer {
  id: string;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  data: number[][];
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  probability: number;
  impact: string;
  solutions: string[];
  active: boolean;
}

export default function InteractiveFarmMap() {
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');
  const isDark = colorScheme === 'dark';

  const [farmSlots, setFarmSlots] = useState<FarmSlot[]>([]);
  const [dataLayers, setDataLayers] = useState<DataLayer[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<DataLayer | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [showLayerModal, setShowLayerModal] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const GRID_ROWS = 12;
  const GRID_COLS = 16;

  useEffect(() => {
    loadFarmData();
    generateDataLayers();
    generateScenarios();
  }, []);

  const loadFarmData = async () => {
    try {
      const farmStatus = await farmAPI.getFarmStatus();
      
      // Initialize grid with all slots
      const allSlots: FarmSlot[] = [];
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const existingCrop = farmStatus.crops.find(
            (crop: any) => crop.position_row === row && crop.position_col === col
          );
          
          allSlots.push({
            row,
            col,
            crop: existingCrop ? {
              id: existingCrop.id,
              name: existingCrop.name,
              growth_stage: existingCrop.growth_stage,
              health: existingCrop.health,
              water_level: existingCrop.water_level,
              fertilizer_level: existingCrop.fertilizer_level,
            } : undefined,
          });
        }
      }
      
      setFarmSlots(allSlots);
    } catch (error) {
      console.error('Failed to load farm data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDataLayers = () => {
    const layers: DataLayer[] = [
      {
        id: 'soil_moisture',
        name: 'Soil Moisture',
        icon: 'water',
        color: '#3B82F6',
        active: true,
        data: generateLayerData(0.3, 0.9),
      },
      {
        id: 'temperature',
        name: 'Temperature',
        icon: 'thermometer',
        color: '#EF4444',
        active: false,
        data: generateLayerData(15, 35),
      },
      {
        id: 'nutrient_levels',
        name: 'Nutrient Levels',
        icon: 'flask',
        color: '#10B981',
        active: false,
        data: generateLayerData(0.2, 0.8),
      },
      {
        id: 'pest_risk',
        name: 'Pest Risk',
        icon: 'bug',
        color: '#F59E0B',
        active: false,
        data: generateLayerData(0.1, 0.7),
      },
      {
        id: 'rainfall',
        name: 'Rainfall Trends',
        icon: 'rainy',
        color: '#8B5CF6',
        active: false,
        data: generateLayerData(0, 25),
      },
    ];
    
    setDataLayers(layers);
    setSelectedLayer(layers[0]);
  };

  const generateLayerData = (min: number, max: number): number[][] => {
    const data: number[][] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      const rowData: number[] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        // Create some variation based on position
        const baseValue = min + (max - min) * Math.random();
        const positionVariation = Math.sin(row * 0.3) * Math.cos(col * 0.2) * 0.2;
        rowData.push(Math.max(min, Math.min(max, baseValue + positionVariation)));
      }
      data.push(rowData);
    }
    return data;
  };

  const generateScenarios = () => {
    const allScenarios: Scenario[] = [
      {
        id: 'drought_2024',
        name: 'Extended Drought Period',
        description: 'Climate models predict 30% below-average rainfall for the next 6 months',
        probability: 0.75,
        impact: 'Severe impact on crop yield and water requirements',
        solutions: [
          'Install drip irrigation systems',
          'Switch to drought-resistant crop varieties',
          'Implement water harvesting techniques',
          'Apply moisture-retaining mulch',
        ],
        active: true,
      },
      {
        id: 'pest_outbreak',
        name: 'Regional Pest Outbreak',
        description: 'Increased pest activity detected in neighboring farms',
        probability: 0.45,
        impact: 'Moderate to severe crop damage if untreated',
        solutions: [
          'Deploy biological pest control',
          'Apply targeted organic pesticides',
          'Install pest monitoring systems',
          'Introduce beneficial insect populations',
        ],
        active: true,
      },
      {
        id: 'market_fluctuation',
        name: 'Crop Price Volatility',
        description: 'Market analysis shows potential price drops for current crops',
        probability: 0.60,
        impact: 'Economic pressure on farm profitability',
        solutions: [
          'Diversify crop portfolio',
          'Negotiate forward contracts',
          'Focus on premium quality produce',
          'Explore direct-to-consumer sales',
        ],
        active: false,
      },
      {
        id: 'climate_bonus',
        name: 'Optimal Growing Conditions',
        description: 'NASA data indicates ideal conditions for crop growth this season',
        probability: 0.85,
        impact: 'Potential for above-average yields',
        solutions: [
          'Maximize planting density',
          'Optimize fertilizer application',
          'Time harvest for peak quality',
          'Plan for increased storage needs',
        ],
        active: true,
      },
    ];
    
    setScenarios(allScenarios);
  };

  const getSlotIntensity = (row: number, col: number): number => {
    if (!selectedLayer) return 0;
    return selectedLayer.data[row]?.[col] || 0;
  };

  const getSlotColor = (row: number, col: number): string => {
    const slot = farmSlots.find(s => s.row === row && s.col === col);
    
    if (slot?.crop) {
      // Show crop health color if there's a crop
      const health = slot.crop.health;
      if (health >= 80) return colors.success;
      if (health >= 50) return colors.warning;
      return '#EF4444';
    }
    
    if (!selectedLayer) return colors.background;
    
    // Show data layer intensity
    const intensity = getSlotIntensity(row, col);
    const maxValue = Math.max(...selectedLayer.data.flat());
    const normalizedIntensity = intensity / maxValue;
    
    const baseColor = selectedLayer.color;
    const opacity = Math.max(0.1, normalizedIntensity);
    
    return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  };

  const handleSlotPress = (row: number, col: number) => {
    const slot = farmSlots.find(s => s.row === row && s.col === col);
    
    if (slot?.crop) {
      router.push({
        pathname: '/plant-detail',
        params: { plantId: slot.crop.id }
      });
    } else {
      const layerValue = getSlotIntensity(row, col);
      Alert.alert(
        `Grid Position (${row + 1}, ${col + 1})`,
        selectedLayer 
          ? `${selectedLayer.name}: ${layerValue.toFixed(2)}\n\nTap to plant a crop here`
          : 'Empty slot - tap to plant a crop',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Plant Crop', onPress: () => router.back() },
        ]
      );
    }
  };

  const toggleLayer = (layerId: string) => {
    setDataLayers(prev => prev.map(layer => ({
      ...layer,
      active: layer.id === layerId ? !layer.active : false
    })));
    
    const layer = dataLayers.find(l => l.id === layerId);
    if (layer) {
      setSelectedLayer(layer.active ? null : layer);
    }
  };

  const handleScenarioAction = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setShowScenarioModal(true);
  };

  const implementSolution = (solution: string) => {
    Alert.alert(
      'Solution Implemented',
      `"${solution}" has been added to your farm management plan.\n\nCost and timeline details will be available in your analytics dashboard.`,
      [{ text: 'OK', onPress: () => setShowScenarioModal(false) }]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="map" size={48} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading interactive farm map...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          🗺️ Interactive Farm Map
        </Text>
        <TouchableOpacity 
          onPress={() => setShowLayerModal(true)} 
          style={styles.layersButton}
        >
          <Ionicons name="layers" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Active Scenarios Banner */}
        {scenarios.filter(s => s.active).length > 0 && (
          <View style={styles.scenariosBanner}>
            <TouchableOpacity 
              style={[styles.scenariosButton, { backgroundColor: colors.warning }]}
              onPress={() => setShowScenarioModal(true)}
            >
              <Ionicons name="warning" size={20} color="white" />
              <Text style={styles.scenariosText}>
                {scenarios.filter(s => s.active).length} Active Scenarios
              </Text>
              <Ionicons name="chevron-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Current Data Layer Info */}
        {selectedLayer && (
          <View style={[styles.layerInfo, { backgroundColor: colors.card }]}>
            <Ionicons name={selectedLayer.icon as any} size={24} color={selectedLayer.color} />
            <View style={styles.layerInfoText}>
              <Text style={[styles.layerTitle, { color: colors.text }]}>
                {selectedLayer.name}
              </Text>
              <Text style={[styles.layerDescription, { color: colors.textSecondary }]}>
                Tap grid cells to see detailed values
              </Text>
            </View>
          </View>
        )}

        {/* Farm Grid */}
        <View style={[styles.farmGrid, { backgroundColor: colors.card }]}>
          {Array.from({ length: GRID_ROWS }, (_, row) => (
            <View key={row} style={styles.gridRow}>
              {Array.from({ length: GRID_COLS }, (_, col) => {
                const slot = farmSlots.find(s => s.row === row && s.col === col);
                const slotColor = getSlotColor(row, col);
                
                return (
                  <TouchableOpacity
                    key={`${row}-${col}`}
                    style={[
                      styles.gridCell,
                      { backgroundColor: slotColor }
                    ]}
                    onPress={() => handleSlotPress(row, col)}
                  >
                    {slot?.crop && (
                      <View style={styles.cropIndicator}>
                        <Ionicons 
                          name="leaf" 
                          size={8} 
                          color={slot.crop.health >= 80 ? '#10B981' : '#F59E0B'} 
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={[styles.legend, { backgroundColor: colors.card }]}>
          <Text style={[styles.legendTitle, { color: colors.text }]}>Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                Healthy Crops
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: colors.warning }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                Stressed Crops
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                Unhealthy Crops
              </Text>
            </View>
            {selectedLayer && (
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: selectedLayer.color }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  {selectedLayer.name} Intensity
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Data Layers Modal */}
      <Modal
        visible={showLayerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLayerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Data Layers
              </Text>
              <TouchableOpacity onPress={() => setShowLayerModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {dataLayers.map((layer) => (
              <TouchableOpacity
                key={layer.id}
                style={[styles.layerOption, layer.active && styles.layerActive]}
                onPress={() => {
                  toggleLayer(layer.id);
                  setShowLayerModal(false);
                }}
              >
                <Ionicons name={layer.icon as any} size={24} color={layer.color} />
                <View style={styles.layerOptionInfo}>
                  <Text style={[styles.layerOptionTitle, { color: colors.text }]}>
                    {layer.name}
                  </Text>
                  <Text style={[styles.layerOptionStatus, { color: colors.textSecondary }]}>
                    {layer.active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                {layer.active && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Scenarios Modal */}
      <Modal
        visible={showScenarioModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScenarioModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Farm Scenarios
              </Text>
              <TouchableOpacity onPress={() => setShowScenarioModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {scenarios.map((scenario) => (
              <View key={scenario.id} style={styles.scenarioCard}>
                <View style={styles.scenarioHeader}>
                  <Text style={[styles.scenarioTitle, { color: colors.text }]}>
                    {scenario.name}
                  </Text>
                  <View style={[
                    styles.probabilityBadge,
                    { backgroundColor: scenario.probability > 0.7 ? '#EF4444' : scenario.probability > 0.5 ? '#F59E0B' : '#10B981' }
                  ]}>
                    <Text style={styles.probabilityText}>
                      {Math.round(scenario.probability * 100)}%
                    </Text>
                  </View>
                </View>
                
                <Text style={[styles.scenarioDescription, { color: colors.textSecondary }]}>
                  {scenario.description}
                </Text>
                
                <Text style={[styles.scenarioImpact, { color: colors.text }]}>
                  Impact: {scenario.impact}
                </Text>
                
                <Text style={[styles.solutionsTitle, { color: colors.text }]}>
                  Recommended Solutions:
                </Text>
                
                {scenario.solutions.map((solution, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.solutionButton, { borderColor: colors.primary }]}
                    onPress={() => implementSolution(solution)}
                  >
                    <Text style={[styles.solutionText, { color: colors.primary }]}>
                      {solution}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  layersButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scenariosBanner: {
    margin: 16,
    marginBottom: 8,
  },
  scenariosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  scenariosText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  layerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  layerInfoText: {
    flex: 1,
  },
  layerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  layerDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  farmGrid: {
    margin: 16,
    padding: 8,
    borderRadius: 12,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    width: (width - 64) / 16, // GRID_COLS = 16
    height: (width - 64) / 16, // GRID_COLS = 16
    margin: 1,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropIndicator: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  layerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  layerActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  layerOptionInfo: {
    flex: 1,
  },
  layerOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  layerOptionStatus: {
    fontSize: 14,
    marginTop: 2,
  },
  scenarioCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scenarioTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  probabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  probabilityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scenarioDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  scenarioImpact: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  solutionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  solutionButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  solutionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});