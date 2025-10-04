// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://192.168.31.36:8000',
  ENDPOINTS: {
    ROOT: '/',
    FARM_DATA: '/farm-data',
    FARMS: '/farms',
    AUTH: {
      SIGNUP: '/auth/signup',
      LOGIN: '/auth/login',
      ME: '/auth/me',
      LANGUAGE: '/auth/language',
    },
  },
  TIMEOUT: 30000,
  NASA_DATA_RESOLUTION: '~50km regional average',
};

export const API_URL = API_CONFIG.BASE_URL;