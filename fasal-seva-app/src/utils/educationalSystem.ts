// NASA Data Educational Tooltips and Explanations
// Based on NASA Space Apps Challenge 2025 Educational Requirements

export interface DataTooltip {
  parameter: string;
  shortName: string;
  fullName: string;
  simpleExplanation: string;
  detailedExplanation: string;
  unit: string;
  typicalRange: string;
  farmingRelevance: string;
  realWorldExample: string;
  dataLimitation: string;
  relatedParameters: string[];
}

export const NASA_DATA_TOOLTIPS: Record<string, DataTooltip> = {
  T2M: {
    parameter: 'T2M',
    shortName: 'Temperature',
    fullName: 'Temperature at 2 Meters',
    simpleExplanation: 'Air temperature measured 2 meters (6.5 feet) above ground level.',
    detailedExplanation: 'NASA satellites measure temperature at 2m height, which represents the air temperature crops experience. This is ground-level temperature, not canopy temperature. Different from soil temperature or leaf surface temperature.',
    unit: '°C (Celsius)',
    typicalRange: '-10°C to 45°C depending on location and season',
    farmingRelevance: 'Determines crop growth rate, water needs, and stress levels. Each crop has an optimal temperature range.',
    realWorldExample: 'Wheat grows best at 15-25°C. Above 30°C, wheat experiences heat stress reducing yield by 3-4% per degree.',
    dataLimitation: '~50km resolution - shows regional average, not your specific field microclimate.',
    relatedParameters: ['T2M_MAX', 'T2M_MIN', 'T2MDEW'],
  },
  
  T2M_MAX: {
    parameter: 'T2M_MAX',
    shortName: 'Max Temperature',
    fullName: 'Maximum Daily Temperature at 2m',
    simpleExplanation: 'The highest temperature reached during the day.',
    detailedExplanation: 'Daily maximum temperature is critical for assessing heat stress risk. Even brief exposure to extreme heat can damage crops during sensitive growth stages.',
    unit: '°C (Celsius)',
    typicalRange: 'Usually 5-10°C higher than average daily temp',
    farmingRelevance: 'High max temps cause wilting, reduce photosynthesis, and can permanently damage crop reproductive organs.',
    realWorldExample: 'Rice flowering stage: Max temp >35°C for 1 hour can cause spikelet sterility, reducing yield by 10-20%.',
    dataLimitation: 'Daily maximum, not hourly detail. Your field may experience higher temps in afternoon sun.',
    relatedParameters: ['T2M', 'T2M_MIN', 'RH2M'],
  },
  
  T2M_MIN: {
    parameter: 'T2M_MIN',
    shortName: 'Min Temperature',
    fullName: 'Minimum Daily Temperature at 2m',
    simpleExplanation: 'The lowest temperature reached during the night.',
    detailedExplanation: 'Nighttime minimum temperature affects crop respiration and frost risk. Low night temps can slow growth or cause frost damage.',
    unit: '°C (Celsius)',
    typicalRange: 'Usually 5-10°C lower than average daily temp',
    farmingRelevance: 'Below 10°C slows tropical crop growth. Below 0°C causes frost damage to sensitive crops.',
    realWorldExample: 'Frost (Min temp < 0°C) can kill corn seedlings overnight. Farmers use frost prediction to protect crops.',
    dataLimitation: 'Measures air temp, not ground temp. Ground frost can occur even when air temp is above 0°C.',
    relatedParameters: ['T2M', 'T2M_MAX'],
  },

  RH2M: {
    parameter: 'RH2M',
    shortName: 'Humidity',
    fullName: 'Relative Humidity at 2 Meters',
    simpleExplanation: 'The amount of moisture in the air as a percentage of maximum possible.',
    detailedExplanation: 'Relative humidity affects how fast water evaporates from soil and plant leaves (transpiration). High humidity slows water loss but increases disease risk. Low humidity increases irrigation needs.',
    unit: '% (Percentage)',
    typicalRange: '30-90% depending on climate',
    farmingRelevance: 'RH > 70% with warm temp = high fungal disease risk. RH < 40% = high evapotranspiration.',
    realWorldExample: 'In Iowa, corn farmers watch for RH >80% + temp >25°C - ideal conditions for Southern Corn Leaf Blight outbreak.',
    dataLimitation: 'Regional average. Your field humidity varies with irrigation, vegetation density, and local wind patterns.',
    relatedParameters: ['T2MDEW', 'T2M', 'PRECTOT'],
  },

  PRECTOT: {
    parameter: 'PRECTOT',
    shortName: 'Rainfall',
    fullName: 'Precipitation Total (Corrected)',
    simpleExplanation: 'The amount of rain that fell during the day.',
    detailedExplanation: 'NASA PRECTOTCORR combines satellite and ground station data for accurate rainfall estimates. This is actual rainfall, accounting for measurement errors.',
    unit: 'mm/day (millimeters per day)',
    typicalRange: '0-50mm/day (>50mm is heavy rain)',
    farmingRelevance: 'Determines irrigation needs. 5mm rain ≈ light irrigation. >20mm can cause waterlogging and nutrient leaching.',
    realWorldExample: 'Indian farmers growing rice need 5-10mm/day during growing season. Less than 3mm/day requires supplemental irrigation.',
    dataLimitation: '~50km resolution - local rain varies greatly. One field may receive rain while neighbor stays dry.',
    relatedParameters: ['RH2M', 'T2MDEW', 'WS2M'],
  },

  WS2M: {
    parameter: 'WS2M',
    shortName: 'Wind Speed',
    fullName: 'Wind Speed at 2 Meters',
    simpleExplanation: 'How fast the wind is blowing near ground level.',
    detailedExplanation: 'Wind affects evapotranspiration (water loss from soil and plants), spray drift of pesticides, and crop lodging (falling over). Higher wind means crops lose water faster.',
    unit: 'm/s (meters per second)',
    typicalRange: '1-10 m/s (>10 m/s is strong wind)',
    farmingRelevance: 'High wind increases irrigation needs. Wind >15 m/s can physically damage crops (lodging, leaf shredding).',
    realWorldExample: 'Brazilian soybean farmers avoid spraying pesticides when wind >3 m/s to prevent drift to neighboring fields.',
    dataLimitation: 'Regional wind. Your field may have windbreaks (trees) or be more exposed than average.',
    relatedParameters: ['RH2M', 'T2M', 'PRECTOT'],
  },

  T2MDEW: {
    parameter: 'T2MDEW',
    shortName: 'Dew Point',
    fullName: 'Dew Point Temperature at 2m',
    simpleExplanation: 'The temperature at which water droplets form from air moisture.',
    detailedExplanation: 'Dew point is a better indicator of air moisture than relative humidity because it doesn\'t change with temperature. Low dew point = dry air. High dew point = moist air. Dew point < 10°C feels very dry. Dew point > 20°C feels humid.',
    unit: '°C (Celsius)',
    typicalRange: '-10°C to 25°C depending on climate',
    farmingRelevance: 'Best indicator for irrigation timing. Dew point < 15°C = irrigate soon. Dew point > 20°C + high temp = disease risk.',
    realWorldExample: 'Israeli drip irrigation systems trigger when dew point drops below 12°C, saving 30% water vs. schedule-based irrigation.',
    dataLimitation: 'Regional average. Morning dew formation can vary greatly across your field.',
    relatedParameters: ['RH2M', 'T2M', 'PRECTOT'],
  },

  ALLSKY_SFC_SW_DWN: {
    parameter: 'ALLSKY_SFC_SW_DWN',
    shortName: 'Solar Radiation',
    fullName: 'All Sky Surface Shortwave Downward Irradiance',
    simpleExplanation: 'The amount of sunlight energy reaching the ground.',
    detailedExplanation: 'Solar radiation is the energy source for photosynthesis. Higher solar radiation = more potential crop growth (if water and nutrients available). Clouds reduce solar radiation.',
    unit: 'MJ/m²/day (Megajoules per square meter per day)',
    typicalRange: '8-30 MJ/m²/day (cloudy vs sunny)',
    farmingRelevance: 'High solar radiation (>15 MJ/m²/day) means crops can utilize more nutrients through photosynthesis. Low radiation (<10) slows growth.',
    realWorldExample: 'US corn farmers target fertilization when solar radiation forecast shows >12 MJ/m²/day for next week - maximizes nutrient uptake.',
    dataLimitation: 'Daily average. Actual solar radiation varies by hour (morning vs noon) and cloud cover patterns.',
    relatedParameters: ['T2M', 'PRECTOT'],
  },
};

// Educational concepts players should learn
export interface EducationalConcept {
  id: string;
  title: string;
  description: string;
  prerequisites: string[];
  unlockCondition: string;
}

export const EDUCATIONAL_CONCEPTS: EducationalConcept[] = [
  {
    id: 'data_resolution',
    title: 'Understanding Data Resolution',
    description: 'NASA POWER data covers ~50km areas. It shows regional trends, not individual field variations. Think of it as weather for your county, not your backyard.',
    prerequisites: [],
    unlockCondition: 'First time viewing NASA data',
  },
  {
    id: 'evapotranspiration',
    title: 'Evapotranspiration (ET)',
    description: 'Water loss from soil evaporation + plant transpiration. High ET = more irrigation needed. Affected by temperature, humidity, wind, and solar radiation.',
    prerequisites: ['data_resolution'],
    unlockCondition: 'Make 3 irrigation decisions',
  },
  {
    id: 'vpd',
    title: 'Vapor Pressure Deficit (VPD)',
    description: 'Difference between air moisture and saturation point. High VPD (dry air) pulls water from plants faster. Calculated from temperature and dew point.',
    prerequisites: ['evapotranspiration'],
    unlockCondition: 'Use dew point data 5 times',
  },
  {
    id: 'disease_triangle',
    title: 'Disease Triangle',
    description: 'Disease needs 3 things: susceptible host (crop), pathogen, and favorable environment (warm + humid). NASA data predicts the environment part.',
    prerequisites: ['data_resolution'],
    unlockCondition: 'Apply pest control 3 times',
  },
  {
    id: 'gdd',
    title: 'Growing Degree Days (GDD)',
    description: 'Cumulative heat units that drive crop development. Each crop has GDD requirements for flowering, maturity. Calculated from daily temperatures.',
    prerequisites: ['data_resolution'],
    unlockCondition: 'Reach day 15',
  },
  {
    id: 'nutrient_leaching',
    title: 'Nutrient Leaching',
    description: 'Heavy rain (>20mm) washes nitrates below root zone, wasting fertilizer and polluting groundwater. Time fertilization to avoid heavy rain.',
    prerequisites: [],
    unlockCondition: 'Experience rainfall >20mm',
  },
  {
    id: 'frost_prediction',
    title: 'Frost Risk Prediction',
    description: 'Frost occurs when T2M_MIN approaches 0°C + clear skies (high solar radiation day before) + low humidity. NASA data helps predict 2-3 days ahead.',
    prerequisites: ['data_resolution'],
    unlockCondition: 'Experience T2M_MIN < 5°C',
  },
  {
    id: 'photosynthesis_optimization',
    title: 'Optimizing Photosynthesis',
    description: 'Maximum photosynthesis needs: solar radiation >12 MJ/m²/day + temperature 20-30°C + adequate water + nutrients. All must align.',
    prerequisites: ['evapotranspiration'],
    unlockCondition: 'Make 5 fertilization decisions',
  },
];

// Achievement system
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_harvest',
    title: 'First Harvest',
    description: 'Complete your first 30-day growing season',
    icon: '🌾',
    condition: 'Complete game',
  },
  {
    id: 'data_driven',
    title: 'Data-Driven Farmer',
    description: 'Make 10 decisions based on NASA data insights',
    icon: '📊',
    condition: 'wasDataDriven count >= 10',
  },
  {
    id: 'ai_student',
    title: 'AI Student',
    description: 'Follow AI recommendations 10 times',
    icon: '🤖',
    condition: 'followedAIAdvice count >= 10',
  },
  {
    id: 'water_master',
    title: 'Water Conservation Master',
    description: 'Achieve 90+ water efficiency score',
    icon: '💧',
    condition: 'waterEfficiency >= 90',
  },
  {
    id: 'green_farmer',
    title: 'Sustainable Champion',
    description: 'Maintain 85+ sustainability score',
    icon: '🌱',
    condition: 'sustainability >= 85',
  },
  {
    id: 'weather_wizard',
    title: 'Weather Wizard',
    description: 'Learn all 8 NASA data parameters',
    icon: '🌦️',
    condition: 'dataConceptsLearned.length >= 8',
  },
  {
    id: 'perfect_season',
    title: 'Perfect Season',
    description: 'Score 90+ total points',
    icon: '🏆',
    condition: 'totalScore >= 90',
  },
  {
    id: 'pest_manager',
    title: 'Pest Management Expert',
    description: 'Keep pest pressure below 30% entire season',
    icon: '🛡️',
    condition: 'Max pestPressure < 0.3',
  },
  {
    id: 'drought_survivor',
    title: 'Drought Survivor',
    description: 'Complete season with <30mm total rainfall',
    icon: '🏜️',
    condition: 'Total rainfall < 30mm',
  },
  {
    id: 'educator',
    title: 'Agricultural Educator',
    description: 'Complete all tutorials',
    icon: '🎓',
    condition: 'tutorialsCompleted.length >= 5',
  },
];

// Tutorial scenarios
export interface TutorialScenario {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  nasaDataFocus: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const TUTORIAL_SCENARIOS: TutorialScenario[] = [
  {
    id: 'irrigation_basics',
    title: 'Irrigation 101',
    description: 'Learn to use dew point and rainfall data for irrigation decisions',
    objectives: [
      'Understand T2MDEW (dew point) parameter',
      'Interpret PRECTOT (rainfall) data',
      'Make 3 irrigation decisions based on data',
      'Achieve 80+ water efficiency',
    ],
    nasaDataFocus: ['T2MDEW', 'PRECTOT', 'RH2M'],
    difficulty: 'beginner',
  },
  {
    id: 'disease_prediction',
    title: 'Disease Outbreak Prevention',
    description: 'Use humidity and temperature to predict disease risk',
    objectives: [
      'Identify disease-favorable conditions (RH >70%, T2M >22°C)',
      'Apply preventive pest control before symptoms',
      'Keep crop health above 70%',
    ],
    nasaDataFocus: ['RH2M', 'T2M', 'PRECTOT'],
    difficulty: 'intermediate',
  },
  {
    id: 'fertilizer_timing',
    title: 'Precision Fertilization',
    description: 'Optimize nutrient application using solar radiation data',
    objectives: [
      'Understand ALLSKY_SFC_SW_DWN parameter',
      'Apply fertilizer when solar radiation >12 MJ/m²/day',
      'Avoid fertilizing before heavy rain',
      'Achieve 85+ sustainability score',
    ],
    nasaDataFocus: ['ALLSKY_SFC_SW_DWN', 'PRECTOT', 'T2M'],
    difficulty: 'intermediate',
  },
  {
    id: 'heat_stress',
    title: 'Managing Heat Waves',
    description: 'Protect crops during extreme temperature events',
    objectives: [
      'Identify heat stress conditions (T2M_MAX >35°C)',
      'Time irrigation for evening (reduce evaporation)',
      'Maintain crop health >60% during heat wave',
    ],
    nasaDataFocus: ['T2M', 'T2M_MAX', 'RH2M', 'WS2M'],
    difficulty: 'advanced',
  },
  {
    id: 'complete_season',
    title: 'Full Season Management',
    description: 'Demonstrate mastery of all NASA data parameters',
    objectives: [
      'Complete 30-day season',
      'Use all 8 NASA parameters in decisions',
      'Score 85+ in all categories',
      'Unlock 5+ achievements',
    ],
    nasaDataFocus: ['ALL'],
    difficulty: 'advanced',
  },
];

// Real-world farming examples by region
export const REAL_WORLD_EXAMPLES = {
  india: {
    region: 'Punjab, India',
    crops: ['wheat', 'rice', 'cotton'],
    challenge: 'Monsoon variability and groundwater depletion',
    nasaDataApplication: 'Farmers use POWER API rainfall forecasts to time rice transplanting, saving 15-20% water by avoiding dry spells.',
  },
  usa: {
    region: 'Iowa, USA',
    crops: ['corn', 'soybeans'],
    challenge: 'Variable weather and disease management',
    nasaDataApplication: 'Extension services provide disease risk alerts based on NASA humidity and temperature data, helping farmers prevent $50M annual losses.',
  },
  brazil: {
    region: 'Mato Grosso, Brazil',
    crops: ['soybeans', 'corn', 'cotton'],
    challenge: 'Deforestation and climate uncertainty',
    nasaDataApplication: 'Large farms integrate NASA POWER data into precision agriculture systems, optimizing irrigation timing and reducing water use by 25%.',
  },
  africa: {
    region: 'Kenya',
    crops: ['corn', 'wheat', 'vegetables'],
    challenge: 'Climate change and smallholder access to data',
    nasaDataApplication: 'Mobile apps deliver NASA-based rainfall forecasts in local languages, helping 100,000+ smallholder farmers plan planting dates.',
  },
};

// Helper functions
export class EducationalSystem {
  static getTooltip(parameter: string): DataTooltip | undefined {
    return NASA_DATA_TOOLTIPS[parameter.toUpperCase()];
  }

  static checkConceptUnlock(
    conceptId: string,
    gameState: any
  ): boolean {
    const concept = EDUCATIONAL_CONCEPTS.find(c => c.id === conceptId);
    if (!concept) return false;

    // Check prerequisites
    for (const prereq of concept.prerequisites) {
      if (!gameState.dataConceptsLearned.includes(prereq)) {
        return false;
      }
    }

    // Check unlock condition (simplified - expand in real implementation)
    // This would need more complex logic based on unlockCondition string
    return true;
  }

  static checkAchievement(
    achievementId: string,
    gameState: any
  ): boolean {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return false;

    // Simplified check - expand based on achievement.condition
    if (achievementId === 'first_harvest') {
      return gameState.day >= gameState.totalDays;
    }

    if (achievementId === 'data_driven') {
      return gameState.decisions.filter((d: any) => d.wasDataDriven).length >= 10;
    }

    // Add more checks...
    return false;
  }

  static formatNASAParameter(
    parameter: string,
    value: number
  ): string {
    const tooltip = this.getTooltip(parameter);
    if (!tooltip) return `${value}`;

    return `${value.toFixed(1)} ${tooltip.unit}`;
  }

  static getParameterWarning(
    parameter: string,
    value: number,
    crop: string
  ): string | null {
    const param = parameter.toUpperCase();
    
    if (param === 'T2M' && value > 35) {
      return `⚠️ High temperature (${value.toFixed(1)}°C) may cause heat stress`;
    }
    
    if (param === 'T2M' && value < 10) {
      return `❄️ Low temperature (${value.toFixed(1)}°C) may slow crop growth`;
    }
    
    if (param === 'RH2M' && value > 80) {
      return `💧 Very high humidity (${value.toFixed(0)}%) - monitor for disease`;
    }
    
    if (param === 'PRECTOT' && value > 30) {
      return `🌧️ Heavy rainfall (${value.toFixed(1)}mm) - risk of waterlogging`;
    }
    
    if (param === 'WS2M' && value > 10) {
      return `💨 Strong wind (${value.toFixed(1)} m/s) - potential crop damage`;
    }

    return null;
  }
}
