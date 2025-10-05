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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import { farmAPI, scenarioAPI } from '../services/api';
import { router, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

interface PlantData {
  id: string;
  name: string;
  position: { row: number; col: number };
  growthStage: number;
  health: number;
  waterLevel: number;
  fertilizerLevel: number;
  latitude?: number;
  longitude?: number;
  climate_bonus?: number;
  planted_at: string;
}

interface NASAData {
  temperature: number;
  precipitation: number;
  solar_radiation: number;
  humidity: number;
  wind_speed: number;
}

interface Scenario {
  id: string;
  type: string;
  name: string;
  description: string;
  impact: string;
  severity: 'low' | 'medium' | 'high';
  active: boolean;
  icon: string;
  color: string;
  available_actions?: any[];
}

export default function PlantDetailScreen() {
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');
  const isDark = colorScheme === 'dark';

  const [plant, setPlant] = useState<PlantData | null>(null);
  const [nasaData, setNasaData] = useState<NASAData | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlantData();
    generateScenarios();
  }, [plantId]);

  const loadPlantData = async () => {
    try {
      // Get plant data from farm status
      const farmStatus = await farmAPI.getFarmStatus();
      const plantData = farmStatus.crops.find((crop: any) => crop.id === plantId);
      
      if (plantData) {
        setPlant({
          id: plantData.id,
          name: plantData.name,
          position: { row: plantData.position_row, col: plantData.position_col },
          growthStage: plantData.growth_stage,
          health: plantData.health,
          waterLevel: plantData.water_level,
          fertilizerLevel: plantData.fertilizer_level,
          latitude: plantData.latitude,
          longitude: plantData.longitude,
          climate_bonus: plantData.climate_bonus,
          planted_at: plantData.planted_at,
        });

        // Get NASA data if location is available
        if (plantData.latitude && plantData.longitude) {
          await loadNASAData(plantData.latitude, plantData.longitude);
        }
      }
    } catch (error) {
      console.error('Failed to load plant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNASAData = async (lat: number, lon: number) => {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);
      
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0].replace(/-/g, '');
      };

      const data = await farmAPI.getFarmData({
        lat,
        lon,
        start: formatDate(startDate),
        end: formatDate(endDate),
        crop_type: plant?.name || 'wheat',
      });

      if (data && data.properties && data.properties.parameter) {
        const params = data.properties.parameter;
        setNasaData({
          temperature: calculateAverage(params.T2M),
          precipitation: calculateAverage(params.PRECTOTCORR),
          solar_radiation: calculateAverage(params.ALLSKY_SFC_SW_DWN),
          humidity: calculateAverage(params.RH2M),
          wind_speed: calculateAverage(params.WS2M),
        });
      }
    } catch (error) {
      console.error('Failed to load NASA data:', error);
    }
  };

  const calculateAverage = (data: any): number => {
    if (!data || typeof data !== 'object') return 0;
    const values = Object.values(data) as number[];
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  const generateScenarios = async () => {
    try {
      if (!plantId) return;
      
      // Generate AI scenarios for this specific crop
      await scenarioAPI.generateScenariosForCrop(plantId);
      
      // Load active scenarios for this crop
      const response = await scenarioAPI.getActiveScenarios(plantId);
      
      // Transform API response to match UI interface
      const apiScenarios = response.scenarios || [];
      const transformedScenarios: Scenario[] = apiScenarios.map((scenario: any) => ({
        id: scenario.id,
        type: scenario.scenario_type,
        name: getScenarioTitle(scenario),
        description: scenario.description,
        impact: scenario.impact_description || 'Unknown impact',
        severity: scenario.severity || 'medium',
        active: scenario.active === 1,
        icon: getScenarioIcon(scenario.scenario_type),
        color: getScenarioColor(scenario.scenario_type),
        available_actions: scenario.available_actions || []
      }));
      
      setScenarios(transformedScenarios);
    } catch (error) {
      console.error('Error loading scenarios:', error);
      // Fallback to empty array on error
      setScenarios([]);
    }
  };

  // Helper function to extract title from AI-generated descriptions
  const getScenarioTitle = (scenario: any): string => {
    const description = scenario.description || '';
    // Check if description has AI title format "Title: Description"
    const titleMatch = description.match(/^([^:]+):/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    // Fallback to scenario type
    return scenario.scenario_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown Scenario';
  };

  // Helper function to get appropriate icon for scenario type
  const getScenarioIcon = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      drought: 'sunny',
      flood: 'rainy',
      pest: 'bug',
      disease: 'medical',
      soil_issue: 'flask',
      fertilizer_shortage: 'flask',
      cold_stress: 'snow',
      heat_stress: 'thermometer',
      low_light: 'sunny-outline',
    };
    return iconMap[type] || 'alert-circle';
  };

  // Helper function to get appropriate color for scenario type
  const getScenarioColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      drought: '#F59E0B',
      flood: '#3B82F6',
      pest: '#EF4444',
      disease: '#DC2626',
      soil_issue: '#8B5CF6',
      fertilizer_shortage: '#8B5CF6',
      cold_stress: '#06B6D4',
      heat_stress: '#F97316',
      low_light: '#FCD34D',
    };
    return colorMap[type] || '#6B7280';
  };

  const handleCareAction = async (action: string) => {
    if (!plant) return;

    if (action === 'water') {
      handleWaterAction();
    } else if (action === 'fertilize') {
      handleFertilizerAction();
    } else if (action === 'harvest') {
      handleHarvestAction();
    }
  };

  const handleWaterAction = () => {
    // Add haptic feedback for button press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      '💧 Water Your Plant',
      'Choose water quality level:',
      [
        {
          text: 'Tap Water (5 coins)',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            performWaterAction('basic');
          }
        },
        {
          text: 'Filtered Water (12 coins)',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            performWaterAction('premium');
          }
        },
        {
          text: 'Nutrient Water (20 coins)',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            performWaterAction('expert');
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleFertilizerAction = () => {
    Alert.alert(
      '🌱 Fertilize Your Plant',
      'Choose fertilizer type:',
      [
        {
          text: 'Basic NPK (15 coins)',
          onPress: () => performFertilizerAction('basic')
        },
        {
          text: 'Organic Blend (25 coins)',
          onPress: () => performFertilizerAction('organic')
        },
        {
          text: 'Premium Formula (40 coins)',
          onPress: () => performFertilizerAction('premium')
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const performWaterAction = async (quality: string) => {
    try {
      const response = await farmAPI.waterCrop(plant!.id, quality);
      
      Alert.alert(
        '💧 Watering Complete!',
        `${response.action}\n\n` +
        `💰 Cost: ${response.cost_paid} coins\n` +
        `📊 Care Score: ${response.care_score}/100\n` +
        `⭐ Rating: ${response.quality_rating}\n` +
        `💡 Investment: ${response.total_investment} coins\n\n` +
        `Rewards: +${response.rewards.xp} XP`,
        [
          {
            text: 'View Scorecard',
            onPress: () => showPlantScorecard()
          },
          { text: 'OK' }
        ]
      );
      
      await loadPlantData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to water plant');
    }
  };

  const performFertilizerAction = async (type: string) => {
    try {
      const response = await farmAPI.fertilizeCrop(plant!.id, type);
      
      Alert.alert(
        '🌱 Fertilizer Applied!',
        `${response.action}\n\n` +
        `💰 Cost: ${response.cost_paid} coins\n` +
        `📊 Care Score: ${response.care_score}/100\n` +
        `⚡ Efficiency: ${response.effectiveness}x\n` +
        `📈 ROI Projection: ${response.roi_projection}%\n\n` +
        `Rewards: +${response.rewards.xp} XP`,
        [
          {
            text: 'View Scorecard',
            onPress: () => showPlantScorecard()
          },
          { text: 'OK' }
        ]
      );
      
      await loadPlantData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fertilize plant');
    }
  };

  const handleHarvestAction = async () => {
    try {
      const response = await farmAPI.harvestCrop(plant!.id);
      Alert.alert('🌾 Harvest Complete', 'Congratulations on your successful harvest!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to harvest');
    }
  };

  const showPlantScorecard = async () => {
    try {
      const scorecard = await farmAPI.getPlantScorecard(plant!.id);
      
      Alert.alert(
        `🏆 ${scorecard.plant_name} Performance`,
        `Overall Score: ${scorecard.overall_score}/100\n\n` +
        `💧 Watering: ${scorecard.care_categories.watering}/100\n` +
        `🌱 Nutrition: ${scorecard.care_categories.nutrition}/100\n` +
        `❤️ Health: ${scorecard.care_categories.health}/100\n\n` +
        `💰 Total Investment: ${scorecard.investment_total} coins\n` +
        `📈 Expected Value: ${scorecard.expected_harvest_value} coins\n` +
        `🎯 ROI: ${scorecard.roi_percentage}%\n\n` +
        `🏅 Rating: ${scorecard.efficiency_rating}\n` +
        `⭐ Multiplier: ${scorecard.bonus_multiplier}x`,
        [
          {
            text: 'Claim Rewards',
            onPress: () => claimCareRewards()
          },
          { text: 'OK' }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load scorecard');
    }
  };

  const claimCareRewards = async () => {
    try {
      const rewards = await farmAPI.calculateCareRewards(plant!.id);
      
      Alert.alert(
        '🎉 Care Rewards Earned!',
        `${rewards.message}\n\n` +
        `🏆 Tier: ${rewards.performance_tier}\n` +
        `📊 Care Score: ${rewards.care_score}/100\n\n` +
        `Rewards Earned:\n` +
        `• +${rewards.total_rewards.xp} XP\n` +
        `• +${rewards.total_rewards.coins} coins\n\n` +
        `💡 Investment Efficiency: ${rewards.investment_efficiency}x`
      );
      
      await loadPlantData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to claim rewards');
    }
  };

  const handleScenarioAction = async (scenario: Scenario) => {
    setSelectedScenario(scenario);
    
    // Get available actions from the scenario data
    const availableActions = (scenario as any).available_actions || [];
    
    if (availableActions.length === 0) {
      Alert.alert(
        '🔍 Monitoring',
        `Scenario: ${scenario.name}\n\n${scenario.description}\n\nKeeping an eye on the situation...`
      );
      return;
    }

    // Create action buttons from API data
    const actionButtons = availableActions.map((action: any) => ({
      text: `${action.name} (${action.cost_coins} coins)`,
      onPress: async () => {
        try {
          const result = await scenarioAPI.completeScenario(scenario.id, action.id);
          
          Alert.alert(
            '✅ Action Complete!',
            `${action.name}\n\n${action.description}\n\nRewards: +${result.xp_gained || 0} XP, +${result.coins_earned || 0} coins`,
            [
              {
                text: 'Great!',
                onPress: () => {
                  // Refresh scenarios and plant data
                  generateScenarios();
                  loadPlantData();
                }
              }
            ]
          );
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to complete scenario action');
        }
      }
    }));

    Alert.alert(
      `🚨 ${scenario.name}`,
      `${scenario.description}\n\nImpact: ${scenario.impact}`,
      [
        ...actionButtons,
        { text: 'Monitor Situation', style: 'cancel' },
      ]
    );
  };

  const getHealthColor = (health: number) => {
    if (health >= 80) return colors.success;
    if (health >= 50) return colors.warning;
    return '#EF4444'; // red color for error
  };

  const getGrowthStageIcon = (stage: number) => {
    if (stage >= 100) return 'checkmark-circle';
    if (stage >= 75) return 'leaf';
    if (stage >= 50) return 'flower';
    if (stage >= 25) return 'trending-up';
    return 'ellipse-outline';
  };

  if (isLoading || !plant) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="leaf" size={48} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading plant data...
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
        <View style={styles.headerTitle}>
          <Text style={[styles.headerText, { color: colors.text }]}>
            {plant.name} Plant Details
          </Text>
          <Text style={[styles.headerSubtext, { color: colors.textSecondary }]}>
            Position: Row {plant.position.row + 1}, Col {plant.position.col + 1}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Plant Status Card */}
        <LinearGradient
          colors={isDark ? ['#1F2937', '#374151'] : ['#F3F4F6', '#E5E7EB']}
          style={styles.statusCard}
        >
          <View style={styles.statusHeader}>
            <Ionicons 
              name={getGrowthStageIcon(plant.growthStage)} 
              size={48} 
              color={colors.primary} 
            />
            <View style={styles.statusInfo}>
              <Text style={[styles.statusTitle, { color: colors.text }]}>
                Growth: {Math.round(plant.growthStage)}%
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                Planted: {new Date(plant.planted_at).toLocaleDateString()}
              </Text>
              {plant.climate_bonus && plant.climate_bonus > 0 && (
                <Text style={[styles.climateBonus, { color: colors.success }]}>
                  🛰️ +{Math.round(plant.climate_bonus * 100)}% NASA Climate Bonus
                </Text>
              )}
            </View>
          </View>

          {/* Health Metrics */}
          <View style={styles.metricsGrid}>
            <View style={styles.metric}>
              <Ionicons name="heart" size={24} color={getHealthColor(plant.health)} />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {Math.round(plant.health)}%
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Health
              </Text>
            </View>
            
            <View style={styles.metric}>
              <Ionicons name="water" size={24} color={colors.primary} />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {Math.round(plant.waterLevel)}%
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Water
              </Text>
            </View>
            
            <View style={styles.metric}>
              <Ionicons name="nutrition" size={24} color={colors.success} />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {Math.round(plant.fertilizerLevel)}%
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Fertilizer
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* NASA Environmental Data */}
        {nasaData && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="radio" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                🛰️ NASA Environmental Data
              </Text>
            </View>
            
            <View style={styles.nasaGrid}>
              <View style={styles.nasaItem}>
                <Ionicons name="thermometer" size={20} color="#F59E0B" />
                <Text style={[styles.nasaLabel, { color: colors.textSecondary }]}>
                  Temperature
                </Text>
                <Text style={[styles.nasaValue, { color: colors.text }]}>
                  {nasaData.temperature.toFixed(1)}°C
                </Text>
              </View>
              
              <View style={styles.nasaItem}>
                <Ionicons name="rainy" size={20} color="#3B82F6" />
                <Text style={[styles.nasaLabel, { color: colors.textSecondary }]}>
                  Precipitation
                </Text>
                <Text style={[styles.nasaValue, { color: colors.text }]}>
                  {nasaData.precipitation.toFixed(2)} mm/day
                </Text>
              </View>
              
              <View style={styles.nasaItem}>
                <Ionicons name="sunny" size={20} color="#EAB308" />
                <Text style={[styles.nasaLabel, { color: colors.textSecondary }]}>
                  Solar Radiation
                </Text>
                <Text style={[styles.nasaValue, { color: colors.text }]}>
                  {nasaData.solar_radiation.toFixed(1)} kWh/m²
                </Text>
              </View>
              
              <View style={styles.nasaItem}>
                <Ionicons name="water-outline" size={20} color="#06B6D4" />
                <Text style={[styles.nasaLabel, { color: colors.textSecondary }]}>
                  Humidity
                </Text>
                <Text style={[styles.nasaValue, { color: colors.text }]}>
                  {nasaData.humidity.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Active Scenarios */}
        {scenarios.filter(s => s.active).length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={24} color="#EF4444" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                🚨 Active Scenarios
              </Text>
            </View>
            
            {scenarios.filter(s => s.active).map((scenario) => (
              <TouchableOpacity
                key={scenario.id}
                style={[styles.scenarioCard, { borderLeftColor: scenario.color }]}
                onPress={() => handleScenarioAction(scenario)}
              >
                <View style={styles.scenarioHeader}>
                  <Ionicons name={scenario.icon as any} size={24} color={scenario.color} />
                  <View style={styles.scenarioInfo}>
                    <Text style={[styles.scenarioTitle, { color: colors.text }]}>
                      {scenario.name}
                    </Text>
                    <Text style={[styles.scenarioDescription, { color: colors.textSecondary }]}>
                      {scenario.description}
                    </Text>
                    <Text style={[styles.scenarioImpact, { color: scenario.color }]}>
                      Impact: {scenario.impact}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Care Actions */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="leaf" size={24} color={colors.success} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🌱 Plant Care Actions
            </Text>
          </View>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[
                styles.actionButton, 
                { 
                  backgroundColor: plant.waterLevel > 80 ? colors.border : colors.primary,
                  opacity: plant.waterLevel > 80 ? 0.5 : 1
                }
              ]}
              onPress={() => handleCareAction('water')}
              disabled={plant.waterLevel > 80}
              activeOpacity={0.7}
              delayPressIn={0}
              delayPressOut={100}
            >
              <Ionicons 
                name="water" 
                size={28} 
                color={plant.waterLevel > 80 ? colors.textSecondary : "white"} 
              />
              <Text style={[
                styles.actionText,
                { color: plant.waterLevel > 80 ? colors.textSecondary : "white" }
              ]}>
                💧 Water Plant
              </Text>
              <Text style={[
                styles.actionSubtext,
                { color: plant.waterLevel > 80 ? colors.textSecondary : "rgba(255,255,255,0.8)" }
              ]}>
                {plant.waterLevel > 80 ? '✅ Well hydrated' : '🚰 Needs water'}
              </Text>
              {plant.waterLevel <= 80 && (
                <Text style={styles.actionCost}>From 5 coins</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton, 
                { 
                  backgroundColor: plant.fertilizerLevel > 80 ? colors.border : colors.success,
                  opacity: plant.fertilizerLevel > 80 ? 0.5 : 1
                }
              ]}
              onPress={() => handleCareAction('fertilize')}
              disabled={plant.fertilizerLevel > 80}
              activeOpacity={0.7}
              delayPressIn={0}
              delayPressOut={100}
            >
              <Ionicons 
                name="nutrition" 
                size={28} 
                color={plant.fertilizerLevel > 80 ? colors.textSecondary : "white"} 
              />
              <Text style={[
                styles.actionText,
                { color: plant.fertilizerLevel > 80 ? colors.textSecondary : "white" }
              ]}>
                🌱 Fertilize
              </Text>
              <Text style={[
                styles.actionSubtext,
                { color: plant.fertilizerLevel > 80 ? colors.textSecondary : "rgba(255,255,255,0.8)" }
              ]}>
                {plant.fertilizerLevel > 80 ? '✅ Well fed' : '🍃 Needs nutrients'}
              </Text>
              {plant.fertilizerLevel <= 80 && (
                <Text style={styles.actionCost}>From 15 coins</Text>
              )}
            </TouchableOpacity>
            
            {plant.growthStage >= 100 && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.warning }]}
                onPress={() => handleCareAction('harvest')}
                activeOpacity={0.7}
                delayPressIn={0}
                delayPressOut={100}
              >
                <Ionicons name="checkmark-circle" size={28} color="white" />
                <Text style={styles.actionText}>🌾 Harvest</Text>
                <Text style={styles.actionSubtext}>Ready to harvest!</Text>
                <Text style={styles.actionReward}>Earn rewards!</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Future Farmer Narrative */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="telescope" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🚀 Future Farmer Mission
            </Text>
          </View>
          
          <Text style={[styles.narrativeText, { color: colors.textSecondary }]}>
            As a Future Farmer, you're pioneering sustainable agriculture using real NASA satellite data. 
            Balance yield optimization, cost efficiency, and environmental sustainability while adapting 
            to dynamic scenarios like climate change, resource scarcity, and market demands.
          </Text>
          
          <View style={styles.missionMetrics}>
            <View style={styles.missionMetric}>
              <Ionicons name="trending-up" size={20} color={colors.success} />
              <Text style={[styles.missionLabel, { color: colors.textSecondary }]}>Yield</Text>
              <Text style={[styles.missionValue, { color: colors.text }]}>
                {Math.round(plant.growthStage * (plant.climate_bonus || 1))}%
              </Text>
            </View>
            
            <View style={styles.missionMetric}>
              <Ionicons name="cash" size={20} color={colors.warning} />
              <Text style={[styles.missionLabel, { color: colors.textSecondary }]}>Efficiency</Text>
              <Text style={[styles.missionValue, { color: colors.text }]}>
                {Math.round((plant.health + plant.fertilizerLevel + plant.waterLevel) / 3)}%
              </Text>
            </View>
            
            <View style={styles.missionMetric}>
              <Ionicons name="leaf" size={20} color={colors.primary} />
              <Text style={[styles.missionLabel, { color: colors.textSecondary }]}>Sustainability</Text>
              <Text style={[styles.missionValue, { color: colors.text }]}>
                {scenarios.filter(s => s.active).length === 0 ? '95%' : '75%'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    padding: 16,
    paddingBottom: 8,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  statusSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  climateBonus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  metric: {
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 12,
  },
  section: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  nasaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  nasaItem: {
    flex: 1,
    minWidth: (width - 80) / 2,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 4,
  },
  nasaLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  nasaValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  scenarioCard: {
    borderLeftWidth: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  scenarioDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  scenarioImpact: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: (width - 80) / 2,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  actionSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  actionCost: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  actionReward: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  narrativeText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  missionMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  missionMetric: {
    alignItems: 'center',
    gap: 4,
  },
  missionLabel: {
    fontSize: 12,
  },
  missionValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});