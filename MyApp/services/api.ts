import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import config from '../config/app.config';

// Base URL for the backend API
const API_BASE_URL = config.API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      await SecureStore.deleteItemAsync('jwt_token');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: async (usernameOrEmail: string, password: string) => {
    const response = await api.post('/auth/login', {
      username_or_email: usernameOrEmail,
      password,
    });
    return response.data;
  },
  
  signup: async (data: {
    email: string;
    username: string;
    password: string;
    full_name: string;
    language: string;
  }) => {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  checkUsername: async (username: string) => {
    const response = await api.get(`/auth/username-available?username=${username}`);
    return response.data;
  },

  claimWelcomeBonus: async () => {
    const response = await api.post('/auth/claim-welcome-bonus');
    return response.data;
  },
};

// Avatar APIs
export const avatarAPI = {
  getAvatarOptions: async (page: number = 0, perPage: number = 12) => {
    const response = await api.get(`/avatar/options?page=${page}&per_page=${perPage}`);
    return response.data;
  },
  
  getAvatarCategories: async () => {
    const response = await api.get('/avatar/categories');
    return response.data;
  },
  
  getCurrentAvatar: async () => {
    const response = await api.get('/avatar/current');
    return response.data;
  },
  
  updateAvatar: async (avatarUrl: string) => {
    const response = await api.put('/avatar', {
      avatar_url: avatarUrl,
    });
    return response.data;
  },
  
  testAvatarGeneration: async () => {
    const response = await api.get('/avatar/test');
    return response.data;
  },
};

// Farm APIs
export const farmAPI = {
  // Legacy farm management
  listFarms: async () => {
    const response = await api.get('/farms');
    return response.data;
  },
  
  createFarm: async (data: {
    farm_name: string;
    latitude: number;
    longitude: number;
    crop_type: string;
    farm_size: string;
  }) => {
    const response = await api.post('/farms', data);
    return response.data;
  },
  
  getFarmData: async (params: {
    lat: number;
    lon: number;
    start: string;
    end: string;
    crop_type?: string;
  }) => {
    const response = await api.get('/farm-data', { params });
    return response.data;
  },

  // New interactive farm management
  // Get complete farm status
  getFarmStatus: async () => {
    const response = await api.get('/farm/status');
    return response.data;
  },

  // Plant a crop at specific position
  plantCrop: async (data: {
    position_row: number;
    position_col: number;
    crop_type: string;
  }) => {
    const response = await api.post('/farm/plant', data);
    return response.data;
  },

  // Water a specific crop with quality options
  waterCrop: async (cropId: string, quality: string = 'basic') => {
    const response = await api.post(`/farm/water/${cropId}?quality_level=${quality}`);
    return response.data;
  },

  // Harvest a mature crop
  harvestCrop: async (cropId: string) => {
    const response = await api.post(`/farm/harvest/${cropId}`);
    return response.data;
  },

  // Fertilize a crop with different fertilizer types
  fertilizeCrop: async (cropId: string, fertilizerType: string = 'basic') => {
    const response = await api.post(`/farm/fertilize/${cropId}?fertilizer_type=${fertilizerType}`);
    return response.data;
  },

  // Get crop details by ID
  getCropDetails: async (cropId: string) => {
    const response = await api.get(`/farm/crops/${cropId}`);
    return response.data;
  },

  // Get plant care shop with supplies and prices
  getCareShop: async () => {
    const response = await api.get('/farm/care-shop');
    return response.data;
  },

  // Get comprehensive plant scorecard
  getPlantScorecard: async (cropId: string) => {
    const response = await api.get(`/farm/plant-scorecard/${cropId}`);
    return response.data;
  },

  // Calculate and claim care rewards
  calculateCareRewards: async (cropId: string) => {
    const response = await api.post(`/farm/calculate-care-rewards/${cropId}`);
    return response.data;
  },

  // Get care leaderboard
  getCareLeaderboard: async () => {
    const response = await api.get('/leaderboard/care-masters');
    return response.data;
  },

  // Simulate time passage for testing (development only)
  simulateTime: async (cropId: string, hours: number) => {
    const response = await api.post(`/farm/simulate-time/${cropId}?hours=${hours}`);
    return response.data;
  },
};

// Scenario APIs
export const scenarioAPI = {
  // Generate scenarios for a specific crop
  generateScenariosForCrop: async (cropId: string) => {
    const response = await api.post(`/scenarios/generate/${cropId}`);
    return response.data;
  },
  
  // Get active scenarios for user (optionally filtered by crop)
  getActiveScenarios: async (cropId?: string) => {
    const url = cropId ? `/scenarios/active?crop_id=${cropId}` : '/scenarios/active';
    const response = await api.get(url);
    return response.data;
  },
  
  // Complete a scenario and receive rewards
  completeScenario: async (scenarioId: string, actionId: string) => {
    const response = await api.post(`/scenarios/${scenarioId}/complete`, {
      action_id: actionId,
    });
    return response.data;
  },
};

// Progress APIs
export const progressAPI = {
  // Get user progress (XP, level, coins)
  getUserProgress: async () => {
    const response = await api.get('/progress');
    return response.data;
  },
  
  // Get leaderboard
  getLeaderboard: async (limit: number = 10) => {
    const response = await api.get(`/leaderboard?limit=${limit}`);
    return response.data;
  },
};

// Shop APIs  
export const shopAPI = {
  // Get available shop items
  getShopItems: async () => {
    const response = await api.get('/shop/items');
    return response.data;
  },
  
  // Purchase an item from shop
  purchaseItem: async (itemId: number) => {
    const response = await api.post(`/shop/purchase/${itemId}`);
    return response.data;
  },
  
  // Get user's purchases
  getUserPurchases: async () => {
    const response = await api.get('/shop/purchases');
    return response.data;
  },
};

// NASA Data APIs
export const nasaAPI = {
  getDateRanges: async () => {
    const response = await api.get('/date-ranges');
    return response.data;
  },
};

// Educational APIs
export const educationalAPI = {
  // Generate personalized educational content
  generateContent: async (forceRegenerate: boolean = false) => {
    const response = await api.post('/educational/generate', {}, {
      params: { force_regenerate: forceRegenerate }
    });
    return response.data;
  },
  
  // Mark educational content as completed
  markCompleted: async (contentType: string, contentId: string, xpEarned: number = 0) => {
    const response = await api.post('/educational/complete', {}, {
      params: { 
        content_type: contentType,
        content_id: contentId, 
        xp_earned: xpEarned
      }
    });
    return response.data;
  },
  
  // Check if educational content needs updates
  checkUpdates: async () => {
    const response = await api.post('/educational/check-updates');
    return response.data;
  },
};

// Analytics APIs
export const analyticsAPI = {
  // Get comprehensive farm analytics
  getFarmAnalytics: async () => {
    const response = await api.get('/analytics/farm');
    return response.data;
  },
};

// Profile APIs
export const profileAPI = {
  // Get user profile data with stats
  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  },
  
  // Update user profile
  updateProfile: async (data: {
    full_name?: string;
    email?: string;
    phone?: string;
    location?: string;
  }) => {
    const response = await api.put('/profile', data);
    return response.data;
  },
  
  // Get user achievements
  getAchievements: async () => {
    const response = await api.get('/profile/achievements');
    return response.data;
  },
  
  // Get profile statistics
  getStats: async () => {
    const response = await api.get('/profile/stats');
    return response.data;
  },
};

// Challenges APIs
export const challengesAPI = {
  // Get all challenges with real user progress
  getChallenges: async () => {
    const response = await api.get('/challenges');
    return response.data;
  },
  
  // Complete a challenge
  completeChallenge: async (challengeId: string) => {
    const response = await api.post(`/challenges/${challengeId}/complete`);
    return response.data;
  },
  
  // Get challenge statistics
  getChallengeStats: async () => {
    const challenges = await api.get('/challenges');
    const data = challenges.data;
    
    return {
      totalChallenges: data.challenges?.length || 0,
      activeChallenges: data.summary?.total_active || 0,
      completedChallenges: data.summary?.total_completed || 0,
      userStats: data.summary?.user_stats || {},
    };
  },
};

// Achievements APIs
export const achievementsAPI = {
  // Get all achievements with unlock status and progress
  getAchievements: async () => {
    const response = await api.get('/achievements');
    return response.data;
  },
  
  // Get achievement statistics
  getAchievementStats: async () => {
    const response = await api.get('/achievements/stats');
    return response.data;
  },
  
  // Manually check for new achievements
  checkAchievements: async () => {
    const response = await api.post('/achievements/check');
    return response.data;
  },
};

export default api;
