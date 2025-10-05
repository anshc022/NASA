import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { farmAPI, scenarioAPI, progressAPI } from '../services/api';

interface Crop {
  id: string;
  name: string;
  plantedAt: Date;
  growthStage: number; // 0-100
  health: number; // 0-100
  waterLevel: number; // 0-100
  fertilizerLevel: number; // 0-100
  position: { row: number; col: number };
  // New scenario-related properties
  active_scenarios?: number;
  needs_attention?: boolean;
  scenario_types?: string[];
  latitude?: number;
  longitude?: number;
  climate_bonus?: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: { xp: number; coins: number };
  completed: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

interface Scenario {
  id: number;
  crop_id: string;
  scenario_type: string;
  title: string;
  description: string;
  suggested_action: string;
  severity: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
  rewards: {
    xp: number;
    coins: number;
  };
}

interface GameContextType {
  crops: Crop[];
  challenges: Challenge[];
  achievements: Achievement[];
  scenarios: Scenario[];
  userProgress: {
    xp: number;
    level: number;
    coins: number;
  } | null;
  dailyStreak: number;
  isLoading: boolean;
  error: string | null;
  climateBonus: number;
  plantCrop: (name: string, position: { row: number; col: number }, location?: { latitude: number; longitude: number }) => Promise<void>;
  waterCrop: (id: string) => Promise<void>;
  fertilizeCrop: (id: string) => Promise<void>;
  harvestCrop: (id: string) => Promise<void>;
  loadFarmData: () => Promise<void>;
  setClimateBonus: (bonus: number) => void;
  updateChallengeProgress: (challengeId: string, amount: number) => void;
  unlockAchievement: (achievementId: string) => void;
  // Scenario management
  loadActiveScenarios: () => Promise<void>;
  generateScenarios: () => Promise<void>;
  completeScenario: (scenarioId: number, actionTaken: string) => Promise<any>;
  getCropScenarios: (cropId: string) => Scenario[];
  // Progress management
  loadUserProgress: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [userProgress, setUserProgress] = useState<{
    xp: number;
    level: number;
    coins: number;
  } | null>(null);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [climateBonus, setClimateBonusState] = useState<number>(1.0);

  useEffect(() => {
    loadGameData();
    initializeChallenges();
    initializeAchievements();
    loadUserProgress();
    loadActiveScenarios();
  }, []);

  useEffect(() => {
    // Update crop growth every minute
    const interval = setInterval(() => {
      updateCropGrowth();
    }, 60000);
    return () => clearInterval(interval);
  }, [crops]);

  const loadGameData = async () => {
    try {
      const savedCrops = await AsyncStorage.getItem('crops');
      const savedStreak = await AsyncStorage.getItem('dailyStreak');
      if (savedCrops) setCrops(JSON.parse(savedCrops));
      if (savedStreak) setDailyStreak(parseInt(savedStreak));
    } catch (error) {
      console.error('Failed to load game data:', error);
    }
  };

  const saveGameData = async (newCrops: Crop[]) => {
    try {
      await AsyncStorage.setItem('crops', JSON.stringify(newCrops));
    } catch (error) {
      console.error('Failed to save game data:', error);
    }
  };

  const initializeChallenges = () => {
    setChallenges([
      {
        id: '1',
        title: 'Plant 5 Crops',
        description: 'Plant your first 5 crops on the farm',
        progress: 0,
        target: 5,
        reward: { xp: 50, coins: 100 },
        completed: false,
      },
      {
        id: '2',
        title: 'Water Master',
        description: 'Water crops 10 times',
        progress: 0,
        target: 10,
        reward: { xp: 30, coins: 50 },
        completed: false,
      },
      {
        id: '3',
        title: 'Harvest Time',
        description: 'Harvest 3 fully grown crops',
        progress: 0,
        target: 3,
        reward: { xp: 100, coins: 200 },
        completed: false,
      },
      {
        id: '4',
        title: 'NASA Explorer',
        description: 'Check NASA weather data',
        progress: 0,
        target: 1,
        reward: { xp: 75, coins: 150 },
        completed: false,
      },
    ]);
  };

  const initializeAchievements = () => {
    setAchievements([
      { id: '1', title: '🌱 Beginner Farmer', description: 'Plant your first crop', icon: '🌱', unlocked: false },
      { id: '2', title: '💧 Water Saver', description: 'Water 50 crops', icon: '💧', unlocked: false },
      { id: '3', title: '🚀 NASA Explorer', description: 'Use NASA data for farming', icon: '🚀', unlocked: false },
      { id: '4', title: '🏆 Master Farmer', description: 'Reach level 10', icon: '🏆', unlocked: false },
      { id: '5', title: '💰 Wealthy Farmer', description: 'Earn 1000 coins', icon: '💰', unlocked: false },
      { id: '6', title: '🔥 Streak Champion', description: 'Maintain a 7-day streak', icon: '🔥', unlocked: false },
    ]);
  };

  const updateCropGrowth = () => {
    setCrops((prevCrops) =>
      prevCrops.map((crop) => {
        const now = new Date();
        const plantedAt = new Date(crop.plantedAt);
        const minutesSincePlanted = Math.floor((now.getTime() - plantedAt.getTime()) / 60000);
        
        // Growth: 1% per minute (100 minutes to fully grow)
        let newGrowth = Math.min(100, minutesSincePlanted);
        
        // Health decreases based on water and fertilizer levels
        let newHealth = crop.health;
        if (crop.waterLevel < 30) newHealth -= 0.5;
        if (crop.fertilizerLevel < 20) newHealth -= 0.3;
        newHealth = Math.max(0, newHealth);
        
        // Water and fertilizer decrease over time
        const newWaterLevel = Math.max(0, crop.waterLevel - 0.5);
        const newFertilizerLevel = Math.max(0, crop.fertilizerLevel - 0.3);
        
        return {
          ...crop,
          growthStage: newGrowth,
          health: newHealth,
          waterLevel: newWaterLevel,
          fertilizerLevel: newFertilizerLevel,
        };
      })
    );
  };

  const plantCrop = async (name: string, position: { row: number; col: number }, location?: { latitude: number; longitude: number }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call API to plant crop with location data
      const plantRequest: any = {
        position_row: position.row,
        position_col: position.col,
        crop_type: name,
      };
      
      // Add location data if provided
      if (location) {
        plantRequest.latitude = location.latitude;
        plantRequest.longitude = location.longitude;
      }
      
      const response = await farmAPI.plantCrop(plantRequest);
      
      // Create new crop from API response
      const newCrop: Crop = {
        id: response.crop_id || Date.now().toString(),
        name,
        plantedAt: new Date(),
        growthStage: response.growth_stage || 0,
        health: response.health || 100,
        waterLevel: response.water_level || 100,
        fertilizerLevel: response.fertilizer_level || 100,
        position,
      };
      
      const newCrops = [...crops, newCrop];
      setCrops(newCrops);
      saveGameData(newCrops);
      
      // Update challenge progress
      updateChallengeProgress('1', 1);
      
      // Add XP and coins from API response
      if (user && response.rewards) {
        updateUser({ 
          xp: (user.xp || 0) + (response.rewards.xp || 10), 
          coins: (user.coins || 0) - (response.cost || 0) + (response.rewards.coins || 5)
        });
      }
      
      // Check for first crop achievement
      if (crops.length === 0) {
        unlockAchievement('1');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to plant crop');
      console.error('Plant crop error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const waterCrop = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call API to water crop
      const response = await farmAPI.waterCrop(id);
      
      const newCrops = crops.map((crop) =>
        crop.id === id
          ? { 
              ...crop, 
              waterLevel: response.water_level || Math.min(100, crop.waterLevel + 30), 
              health: response.health || Math.min(100, crop.health + 5) 
            }
          : crop
      );
      setCrops(newCrops);
      saveGameData(newCrops);
      
      updateChallengeProgress('2', 1);
      
      if (user && response.rewards) {
        updateUser({ 
          xp: (user.xp || 0) + (response.rewards.xp || 5), 
          coins: (user.coins || 0) + (response.rewards.coins || 2) 
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to water crop');
      console.error('Water crop error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fertilizeCrop = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call API to fertilize crop
      const response = await farmAPI.fertilizeCrop(id);
      
      const newCrops = crops.map((crop) =>
        crop.id === id
          ? { 
              ...crop, 
              fertilizerLevel: response.fertilizer_level || Math.min(100, crop.fertilizerLevel + 40), 
              health: response.health || Math.min(100, crop.health + 10) 
            }
          : crop
      );
      setCrops(newCrops);
      saveGameData(newCrops);
      
      if (user && response.rewards) {
        updateUser({ 
          xp: (user.xp || 0) + (response.rewards.xp || 8), 
          coins: (user.coins || 0) - (response.cost || 10) + (response.rewards.coins || 0)
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fertilize crop');
      console.error('Fertilize crop error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const harvestCrop = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const crop = crops.find((c) => c.id === id);
      if (!crop || crop.growthStage < 100) return;
      
      // Call API to harvest crop
      const response = await farmAPI.harvestCrop(id);
      
      const newCrops = crops.filter((c) => c.id !== id);
      setCrops(newCrops);
      saveGameData(newCrops);
      
      updateChallengeProgress('3', 1);
      
      // Use rewards from API response or calculate based on health
      let totalXP = response.rewards?.xp || 50;
      let totalCoins = response.rewards?.coins || 100;
      
      if (!response.rewards) {
        const baseReward = 50;
        const healthBonus = Math.floor((crop.health / 100) * 50);
        totalXP = baseReward + healthBonus;
        totalCoins = baseReward * 2 + healthBonus * 2;
      }
      
      if (user) {
        updateUser({ xp: (user.xp || 0) + totalXP, coins: (user.coins || 0) + totalCoins });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to harvest crop');
      console.error('Harvest crop error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFarmData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call API to get complete farm status
      const response = await farmAPI.getFarmStatus();
      
      // Convert API response to Crop objects
      const apiCrops: Crop[] = response.crops.map((crop: any) => ({
        id: crop.id,
        name: crop.name,
        plantedAt: new Date(crop.planted_at),
        growthStage: crop.growth_stage,
        health: crop.health,
        waterLevel: crop.water_level,
        fertilizerLevel: crop.fertilizer_level || 100,
        position: { row: crop.position_row, col: crop.position_col },
        // Include scenario information if provided
        active_scenarios: crop.active_scenarios || 0,
        needs_attention: crop.needs_attention || false,
        scenario_types: crop.scenario_types || [],
        latitude: crop.latitude,
        longitude: crop.longitude,
        climate_bonus: crop.climate_bonus || 1.0,
      }));
      
      setCrops(apiCrops);
      saveGameData(apiCrops);
      
      // Also load active scenarios to ensure we have the latest data
      await loadActiveScenarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load farm data');
      console.error('Load farm data error:', err);
      
      // Fallback to local data if API fails
      loadGameData();
    } finally {
      setIsLoading(false);
    }
  };

  const setClimateBonus = (bonus: number) => {
    setClimateBonusState(bonus);
  };

  const updateChallengeProgress = (challengeId: string, amount: number) => {
    setChallenges((prevChallenges) =>
      prevChallenges.map((challenge) => {
        if (challenge.id === challengeId && !challenge.completed) {
          const newProgress = Math.min(challenge.target, challenge.progress + amount);
          const completed = newProgress >= challenge.target;
          
          if (completed && user) {
            // Award challenge rewards
            updateUser({
              xp: (user.xp || 0) + challenge.reward.xp,
              coins: (user.coins || 0) + challenge.reward.coins,
            });
          }
          
          return { ...challenge, progress: newProgress, completed };
        }
        return challenge;
      })
    );
  };

  const unlockAchievement = (achievementId: string) => {
    setAchievements((prevAchievements) =>
      prevAchievements.map((achievement) =>
        achievement.id === achievementId && !achievement.unlocked
          ? { ...achievement, unlocked: true, unlockedAt: new Date() }
          : achievement
      )
    );
    
    // Award bonus for achievement
    if (user) {
      updateUser({ xp: (user.xp || 0) + 100, coins: (user.coins || 0) + 50 });
    }
  };

  // Scenario management functions
  const loadActiveScenarios = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await scenarioAPI.getActiveScenarios();
      setScenarios(response.scenarios || []);
      
      // Update crops with scenario information
      setCrops(prevCrops => 
        prevCrops.map(crop => {
          const cropScenarios = (response.scenarios || []).filter(
            (scenario: Scenario) => scenario.crop_id === crop.id
          );
          return {
            ...crop,
            active_scenarios: cropScenarios.length,
            needs_attention: cropScenarios.length > 0,
            scenario_types: cropScenarios.map((s: Scenario) => s.scenario_type),
          };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
      console.error('Load scenarios error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateScenarios = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Generate scenarios for all active crops
      const promises = crops.map(crop => scenarioAPI.generateScenariosForCrop(crop.id));
      await Promise.all(promises);
      
      await loadActiveScenarios(); // Reload to get updated scenarios
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate scenarios');
      console.error('Generate scenarios error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const completeScenario = async (scenarioId: number, actionTaken: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await scenarioAPI.completeScenario(scenarioId.toString(), actionTaken);
      
      // Don't manually remove from local state - let backend reload handle it
      // This prevents race conditions and ensures consistency with backend
      
      // Small delay to ensure backend has processed the completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload user progress from backend to get updated XP/coins/level
      await loadUserProgress();
      
      // Reload scenarios to update attention indicators and remove completed scenarios
      await loadActiveScenarios();
      
      return response; // Return the response so ScenarioModal can access rewards
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete scenario');
      console.error('Complete scenario error:', err);
      throw err; // Re-throw to let ScenarioModal handle the error
    } finally {
      setIsLoading(false);
    }
  };

  const getCropScenarios = (cropId: string): Scenario[] => {
    return scenarios.filter(scenario => scenario.crop_id === cropId);
  };

  const loadUserProgress = async () => {
    try {
      const response = await progressAPI.getUserProgress();
      setUserProgress(response);
      
      // Also update the AuthContext user with the latest progress
      // This ensures the UI shows the correct coin balance
      if (user && response) {
        updateUser({
          coins: response.coins,
          xp: response.xp,
          level: response.level
        });
      }
    } catch (err) {
      console.error('Load user progress error:', err);
    }
  };

  return (
    <GameContext.Provider
      value={{
        crops,
        challenges,
        achievements,
        scenarios,
        userProgress,
        dailyStreak,
        isLoading,
        error,
        climateBonus,
        plantCrop,
        waterCrop,
        fertilizeCrop,
        harvestCrop,
        loadFarmData,
        setClimateBonus,
        updateChallengeProgress,
        unlockAchievement,
        loadActiveScenarios,
        generateScenarios,
        completeScenario,
        getCropScenarios,
        loadUserProgress,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};
