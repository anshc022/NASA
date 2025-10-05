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
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../constants/theme-colors';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
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
  scenario_type: string;
  name: string;
  description: string;
  impact_description: string;
  severity: string;
  is_active: boolean;
  crop_id: number;
  crop_name?: string;
  actions?: Array<{
    id: string;
    name: string;
    description: string;
    cost: number;
    effectiveness: number;
  }>;
  // UI properties
  icon?: string;
  color?: string;
}

export default function PlantDetail() {
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const { user, updateUser } = useAuth();
  const { waterCrop, fertilizeCrop, harvestCrop } = useGame();
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');
  const isDark = colorScheme === 'dark';

  const [plant, setPlant] = useState<PlantData | null>(null);
  const [nasaData, setNasaData] = useState<NASAData | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!plantId) {
      console.error('No plantId provided');
      setIsLoading(false);
      return;
    }
    
    loadPlantData().then(() => {
      // Load scenarios after plant data is loaded
      loadScenarios();
    });
  }, [plantId]);

  const loadPlantData = async () => {
    try {
      console.log('Loading plant data for plantId:', plantId);
      
      // Get plant data from farm status
      const farmStatus = await farmAPI.getFarmStatus();
      console.log('Farm status received:', farmStatus);
      console.log('Available crops:', farmStatus.crops);
      console.log('Looking for plantId:', plantId, '(type:', typeof plantId, ')');
      
      // Try both string and number comparison for plantId
      const plantData = farmStatus.crops.find((crop: any) => 
        crop.id === plantId || crop.id === parseInt(plantId) || crop.id.toString() === plantId
      );
      
      console.log('Found plant data:', plantData);
      console.log('Raw plant values:');
      console.log('- health:', plantData.health, '(type:', typeof plantData.health, ')');
      console.log('- water_level:', plantData.water_level, '(type:', typeof plantData.water_level, ')');
      console.log('- fertilizer_level:', plantData.fertilizer_level, '(type:', typeof plantData.fertilizer_level, ')');
      
      if (plantData) {
        const newPlant = {
          id: plantData.id.toString(),
          name: plantData.name || 'Unknown Crop',
          position: { 
            row: plantData.position_row || 0, 
            col: plantData.position_col || 0 
          },
          growthStage: plantData.growth_stage || 0,
          health: plantData.health !== undefined && plantData.health !== null ? plantData.health : 75,
          waterLevel: plantData.water_level !== undefined && plantData.water_level !== null ? plantData.water_level : 60,
          fertilizerLevel: plantData.fertilizer_level !== undefined && plantData.fertilizer_level !== null ? plantData.fertilizer_level : 40,
          latitude: plantData.latitude,
          longitude: plantData.longitude,
          climate_bonus: plantData.climate_bonus || 0,
          planted_at: plantData.planted_at || new Date().toISOString(),
        };
        
        console.log('Setting plant data:', newPlant);
        setPlant(newPlant);

        // Get NASA data if location is available
        if (plantData.latitude && plantData.longitude) {
          await loadNASAData(plantData.latitude, plantData.longitude);
        }
      } else {
        console.error('Plant not found for plantId:', plantId);
        console.log('Available crop IDs:', farmStatus.crops.map((c: any) => c.id));
        // Still set loading to false even if plant not found
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

  const loadScenarios = async () => {
    if (!plant) {
      console.log('No plant data available, skipping scenario load');
      return;
    }
    
    try {
      console.log('Loading scenarios for crop ID:', plant.id);
      
      // Get active scenarios for this crop from backend API only
      const response = await scenarioAPI.getActiveScenarios(plant.id);
      console.log('Scenarios response:', response);
      
      let activeScenarios = response.scenarios || [];
      
      // Add UI properties for display
      activeScenarios = activeScenarios.map((scenario: any) => ({
        ...scenario,
        icon: getScenarioIcon(scenario.scenario_type),
        color: getScenarioColor(scenario.scenario_type),
      }));
      
      console.log('Active scenarios found:', activeScenarios.length);
      setScenarios(activeScenarios);
      
    } catch (error) {
      console.error('Failed to load scenarios:', error);
      setScenarios([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('Refreshing plant detail page...');
      
      // Reload plant data first
      await loadPlantData();
      
      // Then reload scenarios
      if (plant) {
        await loadScenarios();
      }
      
      console.log('Refresh completed successfully');
    } catch (error) {
      console.error('Failed to refresh data:', error);
      Alert.alert('Refresh Failed', 'Unable to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateScenarios = async () => {
    if (!plant) return;
    
    // Provide haptic feedback for generate action
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      setRefreshing(true);
      console.log('Generating scenarios for crop:', plant.id);
      
      Alert.alert(
        'Generate Scenarios',
        'This will analyze NASA climate data for your location and create realistic farming challenges. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Generate',
            onPress: async () => {
              try {
                const result = await scenarioAPI.generateScenariosForCrop(plant.id);
                console.log('Scenario generation result:', result);
                
                if (result.scenarios_generated > 0) {
                  Alert.alert(
                    'Scenarios Generated!',
                    `${result.scenarios_generated} new scenario(s) have been created based on current climate conditions.`,
                    [{ text: 'View Scenarios', onPress: () => loadScenarios() }]
                  );
                } else {
                  Alert.alert('No Scenarios', 'No new scenarios were needed at this time. Climate conditions are currently favorable!');
                }
              } catch (error) {
                console.error('Failed to generate scenarios:', error);
                Alert.alert('Generation Failed', 'Unable to generate scenarios. Please try again later.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleGenerateScenarios:', error);
      Alert.alert('Error', 'Failed to start scenario generation.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSimulateTime = async () => {
    if (!plant) return;
    
    Alert.alert(
      'Test Time Simulation',
      'Simulate time passage to test plant degradation:',
      [
        { text: '6 Hours', onPress: () => simulateTime(6) },
        { text: '12 Hours', onPress: () => simulateTime(12) },
        { text: '24 Hours', onPress: () => simulateTime(24) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const simulateTime = async (hours: number) => {
    if (!plant) return;
    
    try {
      const response = await farmAPI.simulateTime(plant.id, hours);
      Alert.alert(
        'Time Simulation Complete',
        `Simulated ${hours} hours:\n\n${response.changes.water}\n${response.changes.fertilizer}\n${response.changes.health}`,
        [{ text: 'Refresh Plant', onPress: () => loadPlantData() }]
      );
    } catch (error) {
      console.error('Simulation failed:', error);
      Alert.alert('Error', 'Time simulation failed. This is a test feature.');
    }
  };

  const getScenarioIcon = (type: string) => {
    switch (type) {
      case 'drought': return 'sunny';
      case 'flood': return 'rainy';
      case 'pest': return 'bug';
      case 'fertilizer_shortage': return 'flask';
      case 'disease': return 'medical';
      case 'extreme_weather': return 'thunderstorm';
      default: return 'warning';
    }
  };

  const getScenarioColor = (type: string) => {
    switch (type) {
      case 'drought': return '#F59E0B';
      case 'flood': return '#3B82F6';
      case 'pest': return '#EF4444';
      case 'fertilizer_shortage': return '#8B5CF6';
      case 'disease': return '#DC2626';
      case 'extreme_weather': return '#059669';
      default: return '#6B7280';
    }
  };

  const handleCareAction = async (action: string, quality?: string) => {
    if (!plant || !user) return;

    // For water and fertilize, show quality options if quality not specified
    if ((action === 'water' || action === 'fertilize') && !quality) {
      const waterOptions = [
        { quality: 'basic', cost: action === 'water' ? 5 : 15, name: 'Basic', description: action === 'water' ? '25% boost' : '30% boost' },
        { quality: 'premium', cost: action === 'water' ? 12 : 25, name: 'Premium', description: action === 'water' ? '40% boost' : '50% boost' },
        { quality: 'expert', cost: action === 'water' ? 20 : 40, name: 'Expert', description: action === 'water' ? '50% boost' : '70% boost' }
      ];

      const currentLevel = action === 'water' ? plant.waterLevel : plant.fertilizerLevel;
      const urgencyText = currentLevel < 30 ? '🚨 CRITICAL - Immediate action needed!' :
                         currentLevel < 60 ? '⚠️ LOW - Treatment recommended' :
                         currentLevel < 90 ? '✅ GOOD - Maintenance dose' :
                         '🛑 HIGH - Risk of over-treatment';

      Alert.alert(
        `${action === 'water' ? '💧 Water Quality Selection' : '🌱 Fertilizer Quality Selection'}`,
        `Plant Status: ${urgencyText}\n\nCurrent ${action === 'water' ? 'water' : 'fertilizer'} level: ${Math.round(currentLevel)}%\nHealth: ${Math.round(plant.health)}%\n\nYour coins: ${user.coins || 0}\n\nChoose treatment quality:`,
        [
          ...waterOptions.map(option => ({
            text: `${option.name} - ${option.cost} coins (${option.description})`,
            onPress: () => handleCareAction(action, option.quality),
          })),
          { 
            text: 'Cancel', 
            style: 'cancel' as const
          }
        ]
      );
      return;
    }

    try {
      // Provide haptic feedback based on action type
      switch (action) {
        case 'water':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'fertilize':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'harvest':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }

      let response;
      let actionName = '';
      let actionEmoji = '';
      let rewardMessage = '';
      
      switch (action) {
        case 'water':
          response = await farmAPI.waterCrop(plant.id, quality || 'basic');
          actionName = 'Plant Watered';
          actionEmoji = '💧';
          break;
        case 'fertilize':
          response = await farmAPI.fertilizeCrop(plant.id, quality || 'basic');
          actionName = 'Plant Fertilized';
          actionEmoji = '🌱';
          break;
        case 'harvest':
          response = await farmAPI.harvestCrop(plant.id);
          actionName = 'Harvest Complete';
          actionEmoji = '🌾';
          break;
        default:
          throw new Error('Invalid action');
      }

      // Get rewards from API response
      const rewards = response.rewards || { xp: 0, coins: 0 };
      const xpGained = rewards.xp || 0;
      const coinsGained = rewards.coins || 0;
      
      // Update user progress using the actual API response
      const currentXP = user.xp || 0;
      const currentCoins = user.coins || 0;
      const currentLevel = Math.floor(currentXP / 100) + 1;
      const newXP = currentXP + xpGained;
      const newLevel = Math.floor(newXP / 100) + 1;
      const levelUp = newLevel > currentLevel;
      
      // Update user state
      updateUser({
        xp: newXP,
        coins: currentCoins + coinsGained
      });
      
      // Create reward message based on action type
      if (action === 'water') {
        rewardMessage = `💧 Plant Watered Successfully!\n\n🎁 Rewards:\n⭐ +${xpGained} XP\n🪙 +${coinsGained} coins\n\nYour plant looks refreshed and healthy!`;
      } else if (action === 'fertilize') {
        const cost = response.cost || 10;
        rewardMessage = `🌱 Plant Fertilized!\n\n🎁 Rewards:\n⭐ +${xpGained} XP\n💰 Cost: ${cost} coins\n\nNutrients added for optimal growth!`;
      } else if (action === 'harvest') {
        const healthBonus = response.health_bonus || 0;
        const cropName = response.crop_name || 'crop';
        rewardMessage = `🎉 Excellent ${cropName} harvest!\n\n� Rewards:\n⭐ +${xpGained} XP\n🪙 +${coinsGained} coins\n💪 Health Bonus: +${healthBonus}`;
      }
      
      if (levelUp) {
        rewardMessage += `\n\n🚀 LEVEL UP! You're now Level ${newLevel}!`;
      }
          
      // Show reward alert
      Alert.alert(`${actionEmoji} ${actionName}`, rewardMessage, [
        { text: 'Amazing!', onPress: action === 'harvest' ? () => router.back() : undefined }
      ]);
      
      // Refresh plant data after action
      await loadPlantData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to perform action');
    }
  };

  const handleScenarioAction = async (scenario: Scenario) => {
    // Provide haptic feedback for scenario interaction
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setSelectedScenario(scenario);
    
    // Only use scenario actions from backend API
    if (!scenario.actions || scenario.actions.length === 0) {
      Alert.alert(
        'No Actions Available',
        'This scenario does not have any available actions at this time.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const actionButtons = scenario.actions.map((action: any) => ({
      text: `${action.name} (Cost: $${action.cost})`,
      onPress: () => handleCompleteScenario(scenario.id, action.id),
    }));
    
    actionButtons.push({ 
      text: 'Monitor Situation', 
      onPress: async () => {} 
    });

    Alert.alert(
      `🚨 ${scenario.name}`,
      `${scenario.description}\n\nImpact: ${scenario.impact_description}\n\nChoose your action:`,
      actionButtons
    );
  };



  const handleCompleteScenario = async (scenarioId: string, actionId: string) => {
    try {
      const result = await scenarioAPI.completeScenario(scenarioId, actionId);
      
      // Show results to user
      const rewards = result.rewards || {};
      let message = `✅ Action completed successfully!\n\n`;
      
      if (rewards.xp) message += `🎯 XP Gained: +${rewards.xp}\n`;
      if (rewards.coins) message += `🪙 Coins: ${rewards.coins > 0 ? '+' : ''}${rewards.coins}\n`;
      if (result.effectiveness) message += `📈 Effectiveness: ${result.effectiveness}%\n`;
      
      // Update user progress if rewards were given
      if ((rewards.xp || rewards.coins) && user) {
        updateUser({
          xp: (user.xp || 0) + (rewards.xp || 0),
          coins: (user.coins || 0) + (rewards.coins || 0),
        });
      }
      
      Alert.alert('Scenario Completed!', message, [
        { text: 'Continue', onPress: () => loadScenarios() } // Reload scenarios
      ]);
      
    } catch (error) {
      console.error('Failed to complete scenario:', error);
      Alert.alert('Error', 'Failed to complete scenario action. Please try again.');
    }
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

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="leaf" size={48} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading plant data...
          </Text>
          <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>
            Plant ID: {plantId}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plant) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerText, { color: colors.text }]}>
            Plant Not Found
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="warning" size={48} color={colors.warning} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Plant not found
          </Text>
          <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>
            The plant with ID "{plantId}" could not be found.
          </Text>
          <TouchableOpacity 
            style={[styles.errorButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
            delayPressIn={0}
          >
            <Text style={styles.errorButtonText}>Go Back to Farm</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          activeOpacity={0.7}
          delayPressIn={0}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.headerText, { color: colors.text }]}>
            {plant.name} Plant Details
          </Text>
          <Text style={[styles.headerSubtext, { color: colors.textSecondary }]}>
            Position: Row {plant.position.row + 1}, Col {plant.position.col + 1}
          </Text>
          <Text style={[styles.debugText, { color: '#F59E0B' }]}>
            DEBUG: ID={plant.id}, H={Math.round(plant.health)}%, W={Math.round(plant.waterLevel)}%, F={Math.round(plant.fertilizerLevel)}%
          </Text>
        </View>
        
        <View style={styles.headerButtons}>
          {/* Generate Scenarios Button */}
          {scenarios.length === 0 && plant.latitude && plant.longitude && (
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: colors.primary }]}
              onPress={handleGenerateScenarios}
              disabled={refreshing}
              activeOpacity={0.7}
              delayPressIn={0}
            >
              <Ionicons name="flash" size={20} color="white" />
            </TouchableOpacity>
          )}
          
          {/* Test Time Simulation Button */}
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: '#F59E0B' }]}
            onPress={handleSimulateTime}
            activeOpacity={0.7}
            delayPressIn={0}
          >
            <Ionicons name="time" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            title="Pull to refresh..."
            titleColor={colors.textSecondary}
          />
        }
      >
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
              <Text style={[styles.needsText, { color: getHealthColor(plant.health) }]}>
                {plant.health < 30 ? 'Critical!' : 
                 plant.health < 50 ? 'Needs Care' : 
                 plant.health < 80 ? 'Good' : 'Excellent'}
              </Text>
            </View>
            
            <View style={styles.metric}>
              <Ionicons name="water" size={24} color={plant.waterLevel < 30 ? '#EF4444' : plant.waterLevel < 60 ? '#F59E0B' : colors.primary} />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {Math.round(plant.waterLevel)}%
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Water
              </Text>
              <Text style={[styles.needsText, { color: plant.waterLevel < 30 ? '#EF4444' : plant.waterLevel < 60 ? '#F59E0B' : colors.success }]}>
                {plant.waterLevel < 30 ? 'Drought!' : 
                 plant.waterLevel < 60 ? 'Needs Water' : 
                 plant.waterLevel < 90 ? 'Well Hydrated' : 'Saturated'}
              </Text>
            </View>
            
            <View style={styles.metric}>
              <Ionicons name="nutrition" size={24} color={plant.fertilizerLevel < 30 ? '#EF4444' : plant.fertilizerLevel < 60 ? '#F59E0B' : colors.success} />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {Math.round(plant.fertilizerLevel)}%
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Fertilizer
              </Text>
              <Text style={[styles.needsText, { color: plant.fertilizerLevel < 30 ? '#EF4444' : plant.fertilizerLevel < 60 ? '#F59E0B' : colors.success }]}>
                {plant.fertilizerLevel < 30 ? 'Starving!' : 
                 plant.fertilizerLevel < 60 ? 'Needs Nutrients' : 
                 plant.fertilizerLevel < 90 ? 'Well Fed' : 'Over-fertilized'}
              </Text>
            </View>
          </View>

          {/* Plant Needs Analysis */}
          <View style={styles.needsAnalysis}>
            <Text style={[styles.needsTitle, { color: colors.text }]}>
              🌱 Plant Analysis
            </Text>
            <View style={styles.needsContainer}>
              {plant.health < 70 && (
                <Text style={[styles.needsRecommendation, { color: '#EF4444' }]}>
                  ⚠️ Health is low ({Math.round(plant.health)}%) - 
                  {plant.waterLevel < 50 && plant.fertilizerLevel < 50 
                    ? ' needs both water and fertilizer!'
                    : plant.waterLevel < 50 
                    ? ' needs more water!'
                    : plant.fertilizerLevel < 50
                    ? ' needs more fertilizer!'
                    : ' monitor carefully!'
                  }
                </Text>
              )}
              
              {plant.waterLevel < 40 && (
                <Text style={[styles.needsRecommendation, { color: '#3B82F6' }]}>
                  💧 Water level critical ({Math.round(plant.waterLevel)}%) - Give water immediately!
                </Text>
              )}
              
              {plant.fertilizerLevel < 40 && (
                <Text style={[styles.needsRecommendation, { color: '#10B981' }]}>
                  🌱 Fertilizer low ({Math.round(plant.fertilizerLevel)}%) - Add nutrients for better growth!
                </Text>
              )}
              
              {plant.health >= 80 && plant.waterLevel >= 70 && plant.fertilizerLevel >= 70 && (
                <Text style={[styles.needsRecommendation, { color: colors.success }]}>
                  ✅ Plant is thriving! All levels are optimal for maximum growth.
                </Text>
              )}
              
              {(plant.waterLevel > 90 || plant.fertilizerLevel > 90) && (
                <Text style={[styles.needsRecommendation, { color: '#F59E0B' }]}>
                  ⚠️ Warning: Over-watering or over-fertilizing can harm plant health!
                </Text>
              )}
            </View>

            {/* Today's Weather Summary */}
            {nasaData && (
              <View style={styles.todaySummary}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  🌤️ Today's Conditions Summary
                </Text>
                <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                  {nasaData.temperature.toFixed(1)}°C • {nasaData.precipitation.toFixed(1)}mm rain • {nasaData.humidity.toFixed(0)}% humidity
                </Text>
                <Text style={[styles.summaryRecommendation, { 
                  color: nasaData.precipitation < 1.0 && plant.waterLevel < 60 ? '#EF4444' :
                        nasaData.temperature > 30 && plant.health < 70 ? '#F59E0B' : colors.success 
                }]}>
                  {nasaData.precipitation < 1.0 && plant.waterLevel < 60 
                    ? '🚨 Dry conditions + low water = urgent watering needed!'
                    : nasaData.temperature > 30 && plant.health < 70
                    ? '⚠️ Hot weather stress detected - increase care frequency!'
                    : '✅ Favorable growing conditions - maintain current care routine!'}
                </Text>
              </View>
            )}
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

        {/* NASA-Based Care Recommendations */}
        {nasaData && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb" size={24} color="#10B981" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                🔬 Smart Care Analysis
              </Text>
            </View>
            
            <Text style={[styles.analysisSubtitle, { color: colors.textSecondary }]}>
              Based on NASA satellite data for your location:
            </Text>
            
            <View style={styles.careRecommendations}>
              {/* Water Recommendation */}
              <View style={[styles.recommendationCard, { borderLeftColor: '#3B82F6' }]}>
                <View style={styles.recommendationHeader}>
                  <Ionicons name="water" size={20} color="#3B82F6" />
                  <Text style={[styles.recommendationTitle, { color: colors.text }]}>
                    💧 Water Needs
                  </Text>
                </View>
                <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
                  {nasaData.precipitation < 1.0 
                    ? `Low rainfall (${nasaData.precipitation.toFixed(1)}mm/day) - Increase watering frequency. Target: 80-90%`
                    : nasaData.precipitation < 3.0
                    ? `Moderate rainfall (${nasaData.precipitation.toFixed(1)}mm/day) - Maintain regular watering. Target: 70-80%`
                    : `High rainfall (${nasaData.precipitation.toFixed(1)}mm/day) - Reduce watering to prevent oversaturation. Target: 60-70%`
                  }
                </Text>
                <Text style={[styles.recommendationStatus, { 
                  color: plant.waterLevel < (nasaData.precipitation < 1.0 ? 80 : nasaData.precipitation < 3.0 ? 70 : 60) 
                    ? '#EF4444' : '#10B981' 
                }]}>
                  Current: {Math.round(plant.waterLevel)}% | 
                  {plant.waterLevel < (nasaData.precipitation < 1.0 ? 80 : nasaData.precipitation < 3.0 ? 70 : 60) 
                    ? ' ⚠️ Needs Water' : ' ✅ Good Level'}
                </Text>
              </View>

              {/* Fertilizer Recommendation */}
              <View style={[styles.recommendationCard, { borderLeftColor: '#10B981' }]}>
                <View style={styles.recommendationHeader}>
                  <Ionicons name="nutrition" size={20} color="#10B981" />
                  <Text style={[styles.recommendationTitle, { color: colors.text }]}>
                    🌱 Nutrient Needs
                  </Text>
                </View>
                <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
                  {nasaData.solar_radiation > 6.0 && nasaData.temperature > 25
                    ? `High growth conditions (${nasaData.solar_radiation.toFixed(1)} kWh/m², ${nasaData.temperature.toFixed(1)}°C) - Boost fertilizer for rapid growth. Target: 85-95%`
                    : nasaData.solar_radiation > 4.0 && nasaData.temperature > 20
                    ? `Good growth conditions - Maintain steady nutrition. Target: 70-80%`
                    : `Moderate conditions - Conservative fertilizing to avoid waste. Target: 60-70%`
                  }
                </Text>
                <Text style={[styles.recommendationStatus, { 
                  color: plant.fertilizerLevel < (nasaData.solar_radiation > 6.0 && nasaData.temperature > 25 ? 85 : 
                                                  nasaData.solar_radiation > 4.0 && nasaData.temperature > 20 ? 70 : 60) 
                    ? '#EF4444' : '#10B981' 
                }]}>
                  Current: {Math.round(plant.fertilizerLevel)}% | 
                  {plant.fertilizerLevel < (nasaData.solar_radiation > 6.0 && nasaData.temperature > 25 ? 85 : 
                                           nasaData.solar_radiation > 4.0 && nasaData.temperature > 20 ? 70 : 60) 
                    ? ' ⚠️ Needs Fertilizer' : ' ✅ Good Level'}
                </Text>
              </View>

              {/* Health Recommendation */}
              <View style={[styles.recommendationCard, { borderLeftColor: '#F59E0B' }]}>
                <View style={styles.recommendationHeader}>
                  <Ionicons name="heart" size={20} color="#F59E0B" />
                  <Text style={[styles.recommendationTitle, { color: colors.text }]}>
                    💪 Health Outlook
                  </Text>
                </View>
                <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
                  {nasaData.temperature > 35 || nasaData.temperature < 10
                    ? `Extreme temperature (${nasaData.temperature.toFixed(1)}°C) - Monitor health closely. Extra care needed.`
                    : nasaData.humidity > 80 && nasaData.precipitation > 3
                    ? `High humidity & rain - Watch for fungal issues. Ensure good drainage.`
                    : `Favorable conditions - Maintain current care routine for optimal health.`
                  }
                </Text>
                <Text style={[styles.recommendationStatus, { 
                  color: getHealthColor(plant.health)
                }]}>
                  Current Health: {Math.round(plant.health)}% | 
                  {plant.health < 50 ? ' 🚨 Critical' : 
                   plant.health < 80 ? ' ⚠️ Needs Care' : ' ✅ Excellent'}
                </Text>
              </View>

              {/* Environmental Alert */}
              {(nasaData.temperature > 35 || nasaData.temperature < 5 || nasaData.precipitation > 10) && (
                <View style={[styles.alertCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                  <View style={styles.alertHeader}>
                    <Ionicons name="warning" size={20} color="#EF4444" />
                    <Text style={[styles.alertTitle, { color: '#EF4444' }]}>
                      🌡️ Weather Alert
                    </Text>
                  </View>
                  <Text style={[styles.alertText, { color: '#EF4444' }]}>
                    {nasaData.temperature > 35 ? 'Extreme heat detected! Increase watering and provide shade.' :
                     nasaData.temperature < 5 ? 'Cold weather warning! Protect from frost damage.' :
                     'Heavy rainfall detected! Ensure proper drainage to prevent root rot.'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Active Scenarios */}
        {scenarios.filter(s => s.is_active).length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={24} color="#EF4444" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                🚨 Active Scenarios
              </Text>
            </View>
            
            {scenarios.filter(s => s.is_active).map((scenario) => (
              <TouchableOpacity
                key={scenario.id}
                style={[styles.scenarioCard, { borderLeftColor: scenario.color }]}
                onPress={() => handleScenarioAction(scenario)}
                activeOpacity={0.7}
                delayPressIn={0}
                delayPressOut={100}
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
                      Impact: {scenario.impact_description}
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
                  backgroundColor: plant.waterLevel < 40 ? '#EF4444' : 
                                 plant.waterLevel < 70 ? '#F59E0B' : 
                                 colors.primary
                }
              ]}
              onPress={() => handleCareAction('water')}
              activeOpacity={0.7}
              delayPressIn={0}
              delayPressOut={100}
            >
              <Ionicons name="water" size={24} color="white" />
              <Text style={styles.actionText}>
                {plant.waterLevel < 40 ? '🚨 Water NOW!' : 
                 plant.waterLevel < 70 ? '💧 Water Plant' : 
                 '💧 Water Plant'}
              </Text>
              <Text style={styles.actionSubtext}>
                {plant.waterLevel < 30 ? `CRITICAL (${Math.round(plant.waterLevel)}%) • Urgent!` :
                 plant.waterLevel < 60 ? `Low (${Math.round(plant.waterLevel)}%) • Recommended` :
                 plant.waterLevel < 90 ? `Good (${Math.round(plant.waterLevel)}%) • From 5 coins` :
                 `High (${Math.round(plant.waterLevel)}%) • May harm plant`
                }
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton, 
                { 
                  backgroundColor: plant.fertilizerLevel < 40 ? '#DC2626' : 
                                 plant.fertilizerLevel < 70 ? '#F59E0B' : 
                                 colors.success
                }
              ]}
              onPress={() => handleCareAction('fertilize')}
              activeOpacity={0.7}
              delayPressIn={0}
              delayPressOut={100}
            >
              <Ionicons name="nutrition" size={24} color="white" />
              <Text style={styles.actionText}>
                {plant.fertilizerLevel < 40 ? '🚨 Fertilize NOW!' : 
                 plant.fertilizerLevel < 70 ? '🌱 Add Fertilizer' : 
                 '🌱 Fertilize'}
              </Text>
              <Text style={styles.actionSubtext}>
                {plant.fertilizerLevel < 30 ? `STARVING (${Math.round(plant.fertilizerLevel)}%) • Urgent!` :
                 plant.fertilizerLevel < 60 ? `Low (${Math.round(plant.fertilizerLevel)}%) • Recommended` :
                 plant.fertilizerLevel < 90 ? `Good (${Math.round(plant.fertilizerLevel)}%) • From 15 coins` :
                 `High (${Math.round(plant.fertilizerLevel)}%) • May harm plant`
                }
              </Text>
            </TouchableOpacity>
            
            {plant.growthStage >= 100 && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.warning }]}
                onPress={() => handleCareAction('harvest')}
                activeOpacity={0.7}
                delayPressIn={0}
                delayPressOut={100}
              >
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text style={styles.actionText}>Harvest</Text>
                <Text style={styles.actionSubtext}>Ready to harvest!</Text>
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
                {scenarios.filter(s => s.is_active).length === 0 ? '95%' : '75%'}
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
  loadingSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
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
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  needsText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  needsAnalysis: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  needsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  needsContainer: {
    gap: 8,
  },
  needsRecommendation: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  analysisSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  careRecommendations: {
    gap: 12,
  },
  recommendationCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  recommendationText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  recommendationStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  todaySummary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 12,
    marginBottom: 8,
  },
  summaryRecommendation: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  debugText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});