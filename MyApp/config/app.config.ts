// Configuration file for the NASA Farm Navigator app

export const config = {
  // Backend API URL - Updated with your actual IP address
  // Your IP: 192.168.31.36 (from ipconfig Wi-Fi adapter)
  // Backend runs on port 8000
  API_BASE_URL: 'http://192.168.31.36:8000',
  
  // Game Configuration
  game: {
    // XP required per level
    xpPerLevel: 100,
    
    // Crop growth rate (percentage per minute)
    cropGrowthRate: 1,
    
    // Resource depletion rates
    waterDepletionRate: 0.5,
    fertilizerDepletionRate: 0.3,
    
    // Rewards
    rewards: {
      plant: { xp: 10, coins: 5 },
      water: { xp: 5, coins: 2 },
      fertilize: { xp: 8, cost: 10 },
      harvestBase: { xp: 50, coins: 100 },
    },
    
    // Farm grid size
    gridSize: 3,
  },
  
  // App Info
  app: {
    name: 'NASA Farm Navigator',
    version: '1.0.0',
    description: 'Grow Your Farm, Explore the Universe!',
  },
};

export default config;
