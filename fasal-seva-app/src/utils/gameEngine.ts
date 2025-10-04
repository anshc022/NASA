// Game mechanics and simulation logic

export interface GameState {
  day: number;
  totalDays: number;
  resources: {
    water: number;
    fertilizer: number;
    money: number;
  };
  farmStats: {
    soilMoisture: number;
    nutrientLevel: number;
    cropHealth: number;
    growthStage: number;
  };
  decisions: GameDecision[];
  finalYield: number;
  sustainabilityScore: number;
}

export interface GameDecision {
  day: number;
  type: 'irrigation' | 'fertilizer' | 'harvest' | 'pest_control';
  amount: number;
  cost: number;
  impact: {
    soilMoisture?: number;
    nutrientLevel?: number;
    cropHealth?: number;
    sustainability?: number;
  };
}

export interface GameAction {
  type: 'irrigation' | 'fertilizer' | 'harvest' | 'pest_control';
  name: string;
  description: string;
  options: {
    label: string;
    amount: number;
    cost: number;
    waterUsage?: number;
    sustainability: number;
  }[];
}

export const GAME_ACTIONS: GameAction[] = [
  {
    type: 'irrigation',
    name: 'Irrigation',
    description: 'Water your crops to maintain soil moisture',
    options: [
      { label: 'Light Watering', amount: 0.3, cost: 10, waterUsage: 20, sustainability: 0.8 },
      { label: 'Moderate Watering', amount: 0.6, cost: 20, waterUsage: 40, sustainability: 0.6 },
      { label: 'Heavy Watering', amount: 1.0, cost: 35, waterUsage: 70, sustainability: 0.3 },
      { label: 'Drip Irrigation', amount: 0.8, cost: 50, waterUsage: 30, sustainability: 1.0 },
    ],
  },
  {
    type: 'fertilizer',
    name: 'Fertilization',
    description: 'Add nutrients to boost crop growth',
    options: [
      { label: 'Organic Compost', amount: 0.4, cost: 25, sustainability: 1.0 },
      { label: 'NPK Balanced', amount: 0.7, cost: 40, sustainability: 0.6 },
      { label: 'High Nitrogen', amount: 0.9, cost: 60, sustainability: 0.4 },
      { label: 'Slow Release', amount: 0.6, cost: 80, sustainability: 0.9 },
    ],
  },
  {
    type: 'pest_control',
    name: 'Pest Control',
    description: 'Protect crops from pests and diseases',
    options: [
      { label: 'Natural Predators', amount: 0.5, cost: 30, sustainability: 1.0 },
      { label: 'Organic Spray', amount: 0.7, cost: 45, sustainability: 0.8 },
      { label: 'Chemical Pesticide', amount: 0.9, cost: 35, sustainability: 0.3 },
      { label: 'Integrated Management', amount: 0.8, cost: 70, sustainability: 0.9 },
    ],
  },
];

export class GameEngine {
  static initializeGame(totalDays: number): GameState {
    return {
      day: 1,
      totalDays,
      resources: {
        water: 100,
        fertilizer: 100,
        money: 500,
      },
      farmStats: {
        soilMoisture: 0.5,
        nutrientLevel: 0.6,
        cropHealth: 0.7,
        growthStage: 0.1,
      },
      decisions: [],
      finalYield: 0,
      sustainabilityScore: 0.8,
    };
  }

  static applyWeatherEffects(gameState: GameState, weatherData: any): GameState {
    const newState = { ...gameState };
    
    // Weather affects soil moisture and crop health
    const rainfall = weatherData.prectot || 0;
    const temperature = weatherData.t2m || 25;
    const humidity = weatherData.rh2m || 50;

    // Rainfall increases soil moisture
    newState.farmStats.soilMoisture = Math.min(1.0, 
      newState.farmStats.soilMoisture + (rainfall * 0.1)
    );

    // Extreme temperatures stress crops
    if (temperature > 35 || temperature < 10) {
      newState.farmStats.cropHealth *= 0.95;
    }

    // Low humidity in hot weather reduces soil moisture
    if (temperature > 30 && humidity < 40) {
      newState.farmStats.soilMoisture *= 0.9;
    }

    // Natural moisture loss
    newState.farmStats.soilMoisture = Math.max(0.1, 
      newState.farmStats.soilMoisture - 0.1
    );

    // Nutrient depletion over time
    newState.farmStats.nutrientLevel = Math.max(0.2, 
      newState.farmStats.nutrientLevel - 0.05
    );

    return newState;
  }

  static executeAction(
    gameState: GameState, 
    actionType: string, 
    optionIndex: number
  ): GameState {
    const action = GAME_ACTIONS.find(a => a.type === actionType);
    if (!action || !action.options[optionIndex]) return gameState;

    const option = action.options[optionIndex];
    const newState = { ...gameState };

    // Check if player can afford the action
    if (newState.resources.money < option.cost) {
      return gameState; // Can't afford
    }

    // Deduct costs
    newState.resources.money -= option.cost;
    if (option.waterUsage) {
      newState.resources.water -= option.waterUsage;
    }

    // Apply effects based on action type
    const decision: GameDecision = {
      day: gameState.day,
      type: actionType as any,
      amount: option.amount,
      cost: option.cost,
      impact: {},
    };

    switch (actionType) {
      case 'irrigation':
        newState.farmStats.soilMoisture = Math.min(1.0, 
          newState.farmStats.soilMoisture + option.amount
        );
        decision.impact.soilMoisture = option.amount;
        break;

      case 'fertilizer':
        newState.farmStats.nutrientLevel = Math.min(1.0, 
          newState.farmStats.nutrientLevel + option.amount
        );
        decision.impact.nutrientLevel = option.amount;
        break;

      case 'pest_control':
        newState.farmStats.cropHealth = Math.min(1.0, 
          newState.farmStats.cropHealth + option.amount * 0.1
        );
        decision.impact.cropHealth = option.amount * 0.1;
        break;
    }

    // Update sustainability score
    decision.impact.sustainability = (option.sustainability - 0.5) * 0.1;
    newState.sustainabilityScore = Math.max(0, Math.min(1.0,
      newState.sustainabilityScore + decision.impact.sustainability
    ));

    newState.decisions.push(decision);
    return newState;
  }

  static advanceDay(gameState: GameState): GameState {
    const newState = { ...gameState };
    newState.day += 1;

    // Update growth stage
    newState.farmStats.growthStage = Math.min(1.0, 
      newState.day / newState.totalDays
    );

    // Calculate crop health based on conditions
    const optimalMoisture = 0.6;
    const optimalNutrients = 0.7;
    
    const moistureScore = 1 - Math.abs(newState.farmStats.soilMoisture - optimalMoisture);
    const nutrientScore = Math.min(1.0, newState.farmStats.nutrientLevel / optimalNutrients);
    
    newState.farmStats.cropHealth = (moistureScore + nutrientScore) / 2;

    return newState;
  }

  static calculateFinalScore(gameState: GameState, aiRecommendation: any): {
    yield: number;
    waterEfficiency: number;
    sustainability: number;
    totalScore: number;
  } {
    // Base yield from crop health and growth
    const baseYield = gameState.farmStats.cropHealth * gameState.farmStats.growthStage;
    
    // Water efficiency: yield per water unit used
    const waterUsed = gameState.decisions
      .filter(d => d.type === 'irrigation')
      .reduce((sum, d) => sum + (d.impact.soilMoisture || 0), 0);
    const waterEfficiency = waterUsed > 0 ? baseYield / waterUsed : 1.0;

    // Sustainability based on decision choices
    const sustainability = gameState.sustainabilityScore;

    // AI recommendation bonus
    const aiBonus = aiRecommendation.confidence * 0.1;

    // Final calculations
    const yieldScore = Math.min(100, (baseYield + aiBonus) * 100);
    const efficiencyScore = Math.min(100, waterEfficiency * 80);
    const sustainabilityScore = Math.min(100, sustainability * 100);
    
    const totalScore = Math.round(
      (yieldScore * 0.4) + (efficiencyScore * 0.3) + (sustainabilityScore * 0.3)
    );

    return {
      yield: Math.round(yieldScore),
      waterEfficiency: Math.round(efficiencyScore),
      sustainability: Math.round(sustainabilityScore),
      totalScore,
    };
  }

  static getActionRecommendation(
    gameState: GameState, 
    weatherData: any
  ): { action: string; reason: string; urgency: 'low' | 'medium' | 'high' } {
    const { soilMoisture, nutrientLevel, cropHealth } = gameState.farmStats;
    const rainfall = weatherData.prectot || 0;
    const temperature = weatherData.t2m || 25;

    // Check for urgent needs
    if (soilMoisture < 0.3 && rainfall < 5) {
      return {
        action: 'irrigation',
        reason: 'Soil moisture is critically low and no rain expected',
        urgency: 'high'
      };
    }

    if (nutrientLevel < 0.4 && gameState.farmStats.growthStage < 0.8) {
      return {
        action: 'fertilizer',
        reason: 'Nutrient levels are low during critical growth period',
        urgency: 'high'
      };
    }

    if (cropHealth < 0.5) {
      return {
        action: 'pest_control',
        reason: 'Crop health is declining, check for pests or diseases',
        urgency: 'medium'
      };
    }

    // Moderate recommendations
    if (temperature > 32 && soilMoisture < 0.6) {
      return {
        action: 'irrigation',
        reason: 'High temperatures increase water needs',
        urgency: 'medium'
      };
    }

    if (gameState.farmStats.growthStage > 0.5 && nutrientLevel < 0.7) {
      return {
        action: 'fertilizer',
        reason: 'Growth stage requires additional nutrients',
        urgency: 'medium'
      };
    }

    return {
      action: 'monitor',
      reason: 'Conditions are stable, continue monitoring',
      urgency: 'low'
    };
  }
}