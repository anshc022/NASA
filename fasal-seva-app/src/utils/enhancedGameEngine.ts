// Enhanced Game Engine with Realistic NASA Data Integration
// Based on NASA Space Apps Challenge 2025 Requirements

export interface NASAWeatherData {
  date: string;
  t2m: number;           // Temperature at 2m (°C)
  t2m_max: number;       // Max temp
  t2m_min: number;       // Min temp
  rh2m: number;          // Relative humidity (%)
  prectot: number;       // Precipitation (mm/day)
  ws2m: number;          // Wind speed (m/s)
  allsky_sfc_sw_dwn?: number; // Solar radiation (MJ/m²/day)
  t2mdew?: number;       // Dew point (°C)
}

export interface EnhancedGameState {
  // Basic Info
  day: number;
  totalDays: number;
  location: { lat: number; lon: number; region: string };
  crop: string;
  farmType: 'smallholder' | 'industrial';
  
  // Resources (0-100 scale for UI)
  resources: {
    water: number;          // Available water supply
    fertilizer: number;     // Available fertilizer
    money: number;          // Cash for purchases
    labor: number;          // Available labor hours
  };
  
  // Farm Statistics (0-1.0 normalized)
  farmStats: {
    cropHealth: number;       // Overall crop health
    soilMoisture: number;     // Soil water content
    nutrientLevel: number;    // Soil nutrients
    pestPressure: number;     // Pest/disease level
    growthStage: number;      // 0 = seedling, 1 = harvest-ready
    yieldPotential: number;   // Expected yield multiplier
  };
  
  // NASA Data (current day)
  currentWeather: NASAWeatherData | null;
  weatherHistory: NASAWeatherData[];
  
  // Scoring Components
  scoring: {
    yieldScore: number;              // Crop yield (0-100)
    waterEfficiency: number;         // Water usage efficiency (0-100)
    sustainability: number;          // Environmental impact (0-100)
    dataUtilization: number;         // How well player used NASA data (0-100)
    educationalProgress: number;     // Learning achievements (0-100)
  };
  
  // Player Actions History
  decisions: GameDecision[];
  
  // AI Insights
  aiRecommendations: AIRecommendation[];
  
  // Educational Progress
  tutorialsCompleted: string[];
  dataConceptsLearned: string[];
  achievementsUnlocked: string[];
}

export interface GameDecision {
  day: number;
  type: 'irrigation' | 'fertilizer' | 'pest_control' | 'monitoring';
  action: string;
  option: string;
  cost: number;
  wasDataDriven: boolean;      // Did player check NASA data first?
  followedAIAdvice: boolean;   // Did player follow AI recommendation?
  impact: {
    soilMoisture?: number;
    nutrientLevel?: number;
    cropHealth?: number;
    pestPressure?: number;
    sustainability?: number;
    waterUsed?: number;
  };
  outcome: string;
}

export interface AIRecommendation {
  day: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: string;
  reasoning: string;
  dataSupport: string[];        // Which NASA parameters support this
  expectedImpact: string;
  educationalNote: string;
  dataLimitation?: string;      // Explain resolution/accuracy limits
}

export interface GameAction {
  type: 'irrigation' | 'fertilizer' | 'pest_control' | 'monitoring';
  name: string;
  description: string;
  educationalInfo: string;
  nasaDataRequired: string[];   // Which NASA parameters inform this action
  options: GameActionOption[];
}

export interface GameActionOption {
  label: string;
  description: string;
  cost: number;
  waterUsage?: number;
  effectiveness: number;
  sustainability: number;
  realWorldExample: string;     // Educational context
}

// Crop-specific parameters (realistic agronomic data)
export const CROP_PARAMETERS: Record<string, {
  name: string;
  optimalTemp: { min: number; max: number };
  optimalMoisture: { min: number; max: number };
  growthDuration: number;  // days
  waterRequirement: number;  // mm/day average
  nutrientRequirement: number;  // relative scale
  pestSusceptibility: number;  // 0-1
  heatTolerance: number;  // 0-1
  coldTolerance: number;  // 0-1
}> = {
  wheat: {
    name: 'Wheat',
    optimalTemp: { min: 15, max: 25 },
    optimalMoisture: { min: 0.4, max: 0.7 },
    growthDuration: 120,
    waterRequirement: 4,
    nutrientRequirement: 0.7,
    pestSusceptibility: 0.4,
    heatTolerance: 0.6,
    coldTolerance: 0.8,
  },
  rice: {
    name: 'Rice',
    optimalTemp: { min: 20, max: 35 },
    optimalMoisture: { min: 0.8, max: 1.0 },
    growthDuration: 120,
    waterRequirement: 8,
    nutrientRequirement: 0.8,
    pestSusceptibility: 0.6,
    heatTolerance: 0.8,
    coldTolerance: 0.3,
  },
  corn: {
    name: 'Corn',
    optimalTemp: { min: 18, max: 32 },
    optimalMoisture: { min: 0.5, max: 0.8 },
    growthDuration: 100,
    waterRequirement: 6,
    nutrientRequirement: 0.9,
    pestSusceptibility: 0.5,
    heatTolerance: 0.7,
    coldTolerance: 0.4,
  },
  soybeans: {
    name: 'Soybeans',
    optimalTemp: { min: 20, max: 30 },
    optimalMoisture: { min: 0.5, max: 0.7 },
    growthDuration: 110,
    waterRequirement: 5,
    nutrientRequirement: 0.5,
    pestSusceptibility: 0.7,
    heatTolerance: 0.6,
    coldTolerance: 0.5,
  },
  cotton: {
    name: 'Cotton',
    optimalTemp: { min: 21, max: 37 },
    optimalMoisture: { min: 0.4, max: 0.6 },
    growthDuration: 150,
    waterRequirement: 7,
    nutrientRequirement: 0.8,
    pestSusceptibility: 0.8,
    heatTolerance: 0.9,
    coldTolerance: 0.2,
  },
};

// Game actions with educational context
export const ENHANCED_GAME_ACTIONS: GameAction[] = [
  {
    type: 'irrigation',
    name: 'Irrigation',
    description: 'Water your crops based on NASA data insights',
    educationalInfo: 'NASA POWER data (T2MDEW, RH2M, PRECTOT) helps determine irrigation needs. Dew point < 15°C indicates dry air requiring irrigation.',
    nasaDataRequired: ['T2MDEW', 'RH2M', 'PRECTOT', 'T2M'],
    options: [
      {
        label: 'Light Irrigation',
        description: '10mm - For slight moisture deficit',
        cost: 15,
        waterUsage: 10,
        effectiveness: 0.3,
        sustainability: 0.9,
        realWorldExample: 'Supplemental irrigation during dry spells',
      },
      {
        label: 'Moderate Irrigation',
        description: '20mm - Standard irrigation amount',
        cost: 30,
        waterUsage: 20,
        effectiveness: 0.6,
        sustainability: 0.7,
        realWorldExample: 'Regular scheduled irrigation',
      },
      {
        label: 'Heavy Irrigation',
        description: '35mm - For severe water stress',
        cost: 50,
        waterUsage: 35,
        effectiveness: 0.9,
        sustainability: 0.4,
        realWorldExample: 'Emergency irrigation during drought',
      },
      {
        label: 'Drip Irrigation',
        description: '25mm - Water-efficient method',
        cost: 70,
        waterUsage: 15,
        effectiveness: 0.8,
        sustainability: 1.0,
        realWorldExample: 'Precision agriculture technique',
      },
    ],
  },
  {
    type: 'fertilizer',
    name: 'Fertilization',
    description: 'Add nutrients considering solar radiation and temperature',
    educationalInfo: 'ALLSKY_SFC_SW_DWN (solar radiation) indicates photosynthesis capacity. Higher solar radiation means crops can utilize more nutrients effectively.',
    nasaDataRequired: ['ALLSKY_SFC_SW_DWN', 'T2M', 'PRECTOT'],
    options: [
      {
        label: 'Organic Compost',
        description: 'Slow-release natural nutrients',
        cost: 40,
        effectiveness: 0.5,
        sustainability: 1.0,
        realWorldExample: 'Sustainable organic farming practice',
      },
      {
        label: 'NPK Balanced',
        description: 'Balanced synthetic fertilizer',
        cost: 60,
        effectiveness: 0.7,
        sustainability: 0.6,
        realWorldExample: 'Standard commercial farming',
      },
      {
        label: 'High Nitrogen',
        description: 'Quick growth boost',
        cost: 80,
        effectiveness: 0.9,
        sustainability: 0.3,
        realWorldExample: 'Intensive agriculture (environmental cost)',
      },
      {
        label: 'Slow Release',
        description: 'Long-term nutrient supply',
        cost: 100,
        effectiveness: 0.7,
        sustainability: 0.9,
        realWorldExample: 'Modern precision agriculture',
      },
    ],
  },
  {
    type: 'pest_control',
    name: 'Pest & Disease Management',
    description: 'Protect crops based on humidity and temperature patterns',
    educationalInfo: 'High RH2M (>70%) + warm T2M (>25°C) = fungal disease risk. Monitor weather patterns for pest outbreak predictions.',
    nasaDataRequired: ['RH2M', 'T2M', 'PRECTOT'],
    options: [
      {
        label: 'Natural Predators',
        description: 'Biological pest control',
        cost: 50,
        effectiveness: 0.5,
        sustainability: 1.0,
        realWorldExample: 'Integrated Pest Management (IPM)',
      },
      {
        label: 'Organic Spray',
        description: 'Natural pesticides',
        cost: 70,
        effectiveness: 0.7,
        sustainability: 0.8,
        realWorldExample: 'Organic farming certification',
      },
      {
        label: 'Chemical Pesticide',
        description: 'Synthetic pest control',
        cost: 45,
        effectiveness: 0.9,
        sustainability: 0.3,
        realWorldExample: 'Conventional intensive farming',
      },
      {
        label: 'IPM Strategy',
        description: 'Integrated approach',
        cost: 90,
        effectiveness: 0.8,
        sustainability: 0.9,
        realWorldExample: 'Best practice in modern agriculture',
      },
    ],
  },
  {
    type: 'monitoring',
    name: 'Data Monitoring',
    description: 'Review NASA satellite data and patterns',
    educationalInfo: 'Regular monitoring of NASA POWER data helps predict upcoming challenges. Resolution: ~50km regional average.',
    nasaDataRequired: ['ALL'],
    options: [
      {
        label: 'Quick Check',
        description: 'Brief data review',
        cost: 5,
        effectiveness: 0.3,
        sustainability: 1.0,
        realWorldExample: 'Daily farm management routine',
      },
      {
        label: 'Detailed Analysis',
        description: 'Comprehensive data study',
        cost: 15,
        effectiveness: 0.8,
        sustainability: 1.0,
        realWorldExample: 'Data-driven decision making',
      },
    ],
  },
];

export class EnhancedGameEngine {
  /**
   * Initialize a new game with realistic parameters
   */
  static initializeGame(
    totalDays: number,
    location: { lat: number; lon: number; region: string },
    crop: string,
    farmType: 'smallholder' | 'industrial'
  ): EnhancedGameState {
    const cropParams = CROP_PARAMETERS[crop.toLowerCase()] || CROP_PARAMETERS.wheat;
    
    return {
      day: 1,
      totalDays: Math.min(totalDays, cropParams.growthDuration),
      location,
      crop,
      farmType,
      resources: {
        water: farmType === 'smallholder' ? 60 : 100,
        fertilizer: farmType === 'smallholder' ? 50 : 100,
        money: farmType === 'smallholder' ? 300 : 1000,
        labor: 100,
      },
      farmStats: {
        cropHealth: 0.75,
        soilMoisture: 0.6,
        nutrientLevel: 0.5,
        pestPressure: 0.1,
        growthStage: 0.05,
        yieldPotential: 1.0,
      },
      currentWeather: null,
      weatherHistory: [],
      scoring: {
        yieldScore: 0,
        waterEfficiency: 100,
        sustainability: 80,
        dataUtilization: 0,
        educationalProgress: 0,
      },
      decisions: [],
      aiRecommendations: [],
      tutorialsCompleted: [],
      dataConceptsLearned: [],
      achievementsUnlocked: [],
    };
  }

  /**
   * Apply NASA weather effects to the farm (realistic agronomic simulation)
   */
  static applyWeatherEffects(
    gameState: EnhancedGameState,
    nasaData: NASAWeatherData
  ): EnhancedGameState {
    const newState = { ...gameState };
    const cropParams = CROP_PARAMETERS[gameState.crop.toLowerCase()] || CROP_PARAMETERS.wheat;
    
    newState.currentWeather = nasaData;
    newState.weatherHistory.push(nasaData);

    // 1. RAINFALL IMPACT ON SOIL MOISTURE
    const rainfall = nasaData.prectot || 0;
    const moistureGain = rainfall * 0.02; // 1mm rain = 2% moisture increase
    newState.farmStats.soilMoisture = Math.min(1.0, 
      newState.farmStats.soilMoisture + moistureGain
    );

    // 2. TEMPERATURE STRESS
    const temp = nasaData.t2m || 25;
    let tempStress = 0;
    
    if (temp < cropParams.optimalTemp.min) {
      // Cold stress
      const coldDiff = cropParams.optimalTemp.min - temp;
      tempStress = coldDiff * (1 - cropParams.coldTolerance) * 0.02;
    } else if (temp > cropParams.optimalTemp.max) {
      // Heat stress
      const heatDiff = temp - cropParams.optimalTemp.max;
      tempStress = heatDiff * (1 - cropParams.heatTolerance) * 0.02;
    }
    
    newState.farmStats.cropHealth = Math.max(0.1, 
      newState.farmStats.cropHealth - tempStress
    );

    // 3. HUMIDITY & DISEASE PRESSURE
    const humidity = nasaData.rh2m || 50;
    if (humidity > 70 && temp > 20) {
      // High humidity + warm = fungal disease risk
      newState.farmStats.pestPressure = Math.min(1.0,
        newState.farmStats.pestPressure + 0.03
      );
    }

    // 4. EVAPOTRANSPIRATION (moisture loss)
    const windSpeed = nasaData.ws2m || 2;
    const dewPoint = nasaData.t2mdew || temp - 5;
    const vpd = temp - dewPoint; // Vapor Pressure Deficit approximation
    
    // Higher VPD = more water loss
    const evapLoss = (vpd * 0.01) + (windSpeed * 0.005);
    newState.farmStats.soilMoisture = Math.max(0.05, 
      newState.farmStats.soilMoisture - evapLoss
    );

    // 5. SOLAR RADIATION & PHOTOSYNTHESIS
    const solarRad = nasaData.allsky_sfc_sw_dwn || 15;
    if (solarRad > 12 && newState.farmStats.soilMoisture > 0.3) {
      // Good conditions for growth
      const photosynthesisBonus = 0.01;
      newState.farmStats.cropHealth = Math.min(1.0,
        newState.farmStats.cropHealth + photosynthesisBonus
      );
    }

    // 6. NUTRIENT DEPLETION
    newState.farmStats.nutrientLevel = Math.max(0.1,
      newState.farmStats.nutrientLevel - 0.01
    );

    // 7. PEST PRESSURE NATURAL INCREASE
    newState.farmStats.pestPressure = Math.min(0.9,
      newState.farmStats.pestPressure + cropParams.pestSusceptibility * 0.01
    );

    return newState;
  }

  /**
   * Generate AI-powered recommendations based on NASA data
   */
  static generateAIRecommendation(
    gameState: EnhancedGameState,
    nasaData: NASAWeatherData
  ): AIRecommendation {
    const cropParams = CROP_PARAMETERS[gameState.crop.toLowerCase()] || CROP_PARAMETERS.wheat;
    const { soilMoisture, nutrientLevel, cropHealth, pestPressure, growthStage } = gameState.farmStats;
    
    // Check critical conditions
    const temp = nasaData.t2m || 25;
    const humidity = nasaData.rh2m || 50;
    const rainfall = nasaData.prectot || 0;
    const dewPoint = nasaData.t2mdew || temp - 5;
    const solarRad = nasaData.allsky_sfc_sw_dwn || 15;

    // CRITICAL: Irrigation needed
    if (soilMoisture < 0.3 && rainfall < 2 && dewPoint < 15) {
      return {
        day: gameState.day,
        priority: 'critical',
        action: 'irrigation',
        reasoning: 'Soil moisture critically low. No rain expected (PRECTOT < 2mm). Dew point below 15°C indicates very dry air.',
        dataSupport: [
          `Soil Moisture: ${(soilMoisture * 100).toFixed(0)}% (Critical < 30%)`,
          `Rainfall: ${rainfall.toFixed(1)}mm/day (Insufficient)`,
          `Dew Point: ${dewPoint.toFixed(1)}°C (Dry air < 15°C)`,
        ],
        expectedImpact: 'Immediate irrigation will restore soil moisture and prevent severe crop stress. Without action, yield loss could exceed 30%.',
        educationalNote: `💡 Dew point is a better indicator than humidity alone. When dew point drops below 15°C, the air is very dry and crops lose water rapidly through transpiration.`,
        dataLimitation: 'NASA POWER data covers ~50km area. Your field may have micro-variations. Use this as regional guidance.',
      };
    }

    // HIGH: Disease risk
    if (humidity > 75 && temp > 22 && rainfall > 0 && pestPressure < 0.6) {
      return {
        day: gameState.day,
        priority: 'high',
        action: 'pest_control',
        reasoning: 'Weather conditions favor fungal disease development. High humidity (>75%) + warm temperature (>22°C) + recent rainfall.',
        dataSupport: [
          `Humidity: ${humidity.toFixed(0)}% (High risk > 70%)`,
          `Temperature: ${temp.toFixed(1)}°C (Optimal for pathogens)`,
          `Rainfall: ${rainfall.toFixed(1)}mm (Leaf wetness)`,
        ],
        expectedImpact: 'Preventive pest control now can avoid major crop damage. Fungal diseases spread rapidly in these conditions.',
        educationalNote: `🎓 NASA RH2M (relative humidity) + T2M (temperature) data helps predict disease outbreaks. Farmers can take preventive action 2-3 days before symptoms appear.`,
        dataLimitation: undefined,
      };
    }

    // HIGH: Heat stress irrigation
    if (temp > cropParams.optimalTemp.max + 3 && soilMoisture < 0.6) {
      return {
        day: gameState.day,
        priority: 'high',
        action: 'irrigation',
        reasoning: `Temperature ${temp.toFixed(1)}°C exceeds optimal range for ${cropParams.name} (${cropParams.optimalTemp.max}°C). Heat stress increases water demand.`,
        dataSupport: [
          `Temperature: ${temp.toFixed(1)}°C (${(temp - cropParams.optimalTemp.max).toFixed(1)}°C above optimal)`,
          `Soil Moisture: ${(soilMoisture * 100).toFixed(0)}%`,
          `Crop Heat Tolerance: ${(cropParams.heatTolerance * 100).toFixed(0)}%`,
        ],
        expectedImpact: 'Evening irrigation reduces heat stress. Timing matters - avoid midday watering (evaporation loss).',
        educationalNote: `⚠️ T2M shows ground-level temperature, not canopy temperature. Your crop may be experiencing even higher stress at leaf level.`,
        dataLimitation: undefined,
      };
    }

    // MEDIUM: Fertilization timing
    if (nutrientLevel < 0.5 && growthStage > 0.3 && growthStage < 0.7 && solarRad > 12) {
      return {
        day: gameState.day,
        priority: 'medium',
        action: 'fertilizer',
        reasoning: `Crop in critical growth phase (Day ${gameState.day}/${gameState.totalDays}). Nutrient levels low while solar radiation is strong - optimal uptake conditions.`,
        dataSupport: [
          `Nutrient Level: ${(nutrientLevel * 100).toFixed(0)}%`,
          `Solar Radiation: ${solarRad.toFixed(1)} MJ/m²/day (Good photosynthesis)`,
          `Growth Stage: ${(growthStage * 100).toFixed(0)}%`,
        ],
        expectedImpact: 'Fertilization now maximizes nutrient uptake. High solar radiation means strong photosynthesis to utilize added nutrients.',
        educationalNote: `📊 ALLSKY_SFC_SW_DWN (solar radiation) indicates photosynthesis capacity. Fertilize when solar radiation is high (>12 MJ/m²/day) for best results.`,
        dataLimitation: undefined,
      };
    }

    // MEDIUM: Routine monitoring
    if (rainfall > 5) {
      return {
        day: gameState.day,
        priority: 'medium',
        action: 'monitoring',
        reasoning: 'Heavy rainfall detected. Monitor for nutrient leaching, waterlogging, and potential disease outbreaks in coming days.',
        dataSupport: [
          `Rainfall: ${rainfall.toFixed(1)}mm/day (Heavy rain > 5mm)`,
          `Soil Moisture: ${(soilMoisture * 100).toFixed(0)}%`,
        ],
        expectedImpact: 'Regular monitoring helps catch problems early. Heavy rain can wash away nutrients and create disease-favorable conditions.',
        educationalNote: `🌧️ NASA PRECTOTCORR shows corrected precipitation. Heavy rain (>5mm/day) can leach nitrates from soil, requiring supplemental fertilization.`,
        dataLimitation: undefined,
      };
    }

    // LOW: Everything OK
    return {
      day: gameState.day,
      priority: 'low',
      action: 'monitoring',
      reasoning: 'Current conditions are favorable. Continue monitoring NASA data for changes.',
      dataSupport: [
        `Temperature: ${temp.toFixed(1)}°C (Within optimal range)`,
        `Soil Moisture: ${(soilMoisture * 100).toFixed(0)}% (Adequate)`,
        `Crop Health: ${(cropHealth * 100).toFixed(0)}%`,
      ],
      expectedImpact: 'Maintain current practices. Stay prepared for weather changes.',
      educationalNote: `✅ Good farming is about timing. NASA data helps you anticipate needs 3-5 days ahead, not just react to current conditions.`,
      dataLimitation: undefined,
    };
  }

  /**
   * Execute a farming action with realistic impacts
   */
  static executeAction(
    gameState: EnhancedGameState,
    actionType: string,
    optionIndex: number,
    wasDataDriven: boolean,
    followedAIAdvice: boolean
  ): EnhancedGameState {
    const newState = { ...gameState };
    const action = ENHANCED_GAME_ACTIONS.find(a => a.type === actionType);
    
    if (!action || optionIndex >= action.options.length) {
      return gameState;
    }

    const option = action.options[optionIndex];

    // Check if player can afford it
    if (option.cost > newState.resources.money) {
      return gameState; // Can't afford
    }

    // Deduct cost
    newState.resources.money -= option.cost;

    // Create decision record
    const decision: GameDecision = {
      day: gameState.day,
      type: actionType as any,
      action: action.name,
      option: option.label,
      cost: option.cost,
      wasDataDriven,
      followedAIAdvice,
      impact: {},
      outcome: '',
    };

    // Apply effects based on action type
    switch (actionType) {
      case 'irrigation':
        const moistureIncrease = option.effectiveness * 0.3;
        newState.farmStats.soilMoisture = Math.min(1.0,
          newState.farmStats.soilMoisture + moistureIncrease
        );
        decision.impact.soilMoisture = moistureIncrease;
        decision.impact.waterUsed = option.waterUsage || 0;
        decision.outcome = `Added ${(moistureIncrease * 100).toFixed(0)}% soil moisture`;
        
        // Update water efficiency score
        const efficiency = option.effectiveness / (option.waterUsage || 1);
        newState.scoring.waterEfficiency = Math.max(50,
          newState.scoring.waterEfficiency + (efficiency - 1) * 5
        );
        break;

      case 'fertilizer':
        const nutrientIncrease = option.effectiveness * 0.25;
        newState.farmStats.nutrientLevel = Math.min(1.0,
          newState.farmStats.nutrientLevel + nutrientIncrease
        );
        decision.impact.nutrientLevel = nutrientIncrease;
        decision.outcome = `Added ${(nutrientIncrease * 100).toFixed(0)}% nutrients`;
        break;

      case 'pest_control':
        const pestReduction = option.effectiveness * 0.3;
        newState.farmStats.pestPressure = Math.max(0,
          newState.farmStats.pestPressure - pestReduction
        );
        const healthGain = option.effectiveness * 0.1;
        newState.farmStats.cropHealth = Math.min(1.0,
          newState.farmStats.cropHealth + healthGain
        );
        decision.impact.pestPressure = -pestReduction;
        decision.impact.cropHealth = healthGain;
        decision.outcome = `Reduced pest pressure by ${(pestReduction * 100).toFixed(0)}%`;
        break;

      case 'monitoring':
        // Monitoring increases data utilization score
        newState.scoring.dataUtilization = Math.min(100,
          newState.scoring.dataUtilization + (option.effectiveness * 5)
        );
        decision.outcome = 'Reviewed NASA data and farm conditions';
        break;
    }

    // Update sustainability score based on action
    const sustainabilityImpact = (option.sustainability - 0.5) * 2; // -1 to +1
    newState.scoring.sustainability = Math.max(0, Math.min(100,
      newState.scoring.sustainability + sustainabilityImpact
    ));
    decision.impact.sustainability = sustainabilityImpact;

    // Reward data-driven decisions
    if (wasDataDriven) {
      newState.scoring.dataUtilization = Math.min(100,
        newState.scoring.dataUtilization + 3
      );
    }

    if (followedAIAdvice) {
      newState.scoring.dataUtilization = Math.min(100,
        newState.scoring.dataUtilization + 5
      );
    }

    newState.decisions.push(decision);
    return newState;
  }

  /**
   * Advance to next day with growth calculations
   */
  static advanceDay(gameState: EnhancedGameState): EnhancedGameState {
    const newState = { ...gameState };
    newState.day += 1;

    const cropParams = CROP_PARAMETERS[gameState.crop.toLowerCase()] || CROP_PARAMETERS.wheat;

    // Update growth stage
    newState.farmStats.growthStage = Math.min(1.0,
      newState.day / newState.totalDays
    );

    // Calculate crop health based on optimal conditions
    const { soilMoisture, nutrientLevel, pestPressure } = newState.farmStats;
    
    const moistureOptimality = 1 - Math.abs(soilMoisture - cropParams.optimalMoisture.min) / 0.5;
    const nutrientOptimality = Math.min(1.0, nutrientLevel / cropParams.nutrientRequirement);
    const pestImpact = Math.max(0, 1 - pestPressure);

    const overallCondition = (moistureOptimality + nutrientOptimality + pestImpact) / 3;
    
    // Gradual health adjustment
    const healthChange = (overallCondition - newState.farmStats.cropHealth) * 0.15;
    newState.farmStats.cropHealth = Math.max(0.1, Math.min(1.0,
      newState.farmStats.cropHealth + healthChange
    ));

    // Update yield potential based on accumulated health
    newState.farmStats.yieldPotential *= (0.9 + (newState.farmStats.cropHealth * 0.2));
    newState.farmStats.yieldPotential = Math.max(0.3, Math.min(1.5, newState.farmStats.yieldPotential));

    return newState;
  }

  /**
   * Calculate final comprehensive score
   */
  static calculateFinalScore(gameState: EnhancedGameState): {
    yieldScore: number;
    waterEfficiency: number;
    sustainability: number;
    dataUtilization: number;
    educationalProgress: number;
    totalScore: number;
    grade: string;
    achievements: string[];
  } {
    const cropParams = CROP_PARAMETERS[gameState.crop.toLowerCase()] || CROP_PARAMETERS.wheat;
    
    // 1. Yield Score (0-100) - based on final health and yield potential
    const yieldScore = Math.round(
      gameState.farmStats.cropHealth * gameState.farmStats.yieldPotential * 100
    );

    // 2. Water Efficiency (already tracked)
    const waterEfficiency = Math.round(gameState.scoring.waterEfficiency);

    // 3. Sustainability (already tracked)
    const sustainability = Math.round(gameState.scoring.sustainability);

    // 4. Data Utilization (already tracked)
    const dataUtilization = Math.round(gameState.scoring.dataUtilization);

    // 5. Educational Progress
    const educationalProgress = Math.round(
      (gameState.tutorialsCompleted.length * 20) +
      (gameState.dataConceptsLearned.length * 10)
    );

    // Calculate weighted total
    const totalScore = Math.round(
      (yieldScore * 0.3) +
      (waterEfficiency * 0.2) +
      (sustainability * 0.25) +
      (dataUtilization * 0.15) +
      (educationalProgress * 0.1)
    );

    // Determine grade
    let grade = 'F';
    if (totalScore >= 90) grade = 'A+';
    else if (totalScore >= 85) grade = 'A';
    else if (totalScore >= 80) grade = 'A-';
    else if (totalScore >= 75) grade = 'B+';
    else if (totalScore >= 70) grade = 'B';
    else if (totalScore >= 65) grade = 'B-';
    else if (totalScore >= 60) grade = 'C+';
    else if (totalScore >= 55) grade = 'C';
    else if (totalScore >= 50) grade = 'C-';
    else if (totalScore >= 45) grade = 'D';

    // Check for achievements
    const achievements: string[] = [];
    
    if (yieldScore >= 85) achievements.push('🏆 Master Farmer - Excellent yield');
    if (waterEfficiency >= 90) achievements.push('💧 Water Conservationist');
    if (sustainability >= 85) achievements.push('🌱 Sustainability Champion');
    if (dataUtilization >= 80) achievements.push('📡 NASA Data Expert');
    if (gameState.decisions.filter(d => d.followedAIAdvice).length >= 10) {
      achievements.push('🤖 AI-Guided Farmer');
    }
    if (gameState.decisions.filter(d => d.wasDataDriven).length >= 15) {
      achievements.push('📊 Data-Driven Decision Maker');
    }
    if (totalScore >= 90) achievements.push('🌟 Perfect Harvest');

    return {
      yieldScore,
      waterEfficiency,
      sustainability,
      dataUtilization,
      educationalProgress,
      totalScore,
      grade,
      achievements,
    };
  }
}
