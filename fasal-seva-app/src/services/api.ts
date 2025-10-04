import axios from 'axios';
import { FarmDataResponse, WelcomeResponse, FarmDataRequest } from '../types/api';

// Configure base URL for your FastAPI backend
// Try multiple possible URLs for development
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000'  // Development - local backend
  : 'http://localhost:8000';  // Production - adjust as needed

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.status, error.response.data);
    }
    return Promise.reject(error);
  }
);

export class FasalSevaAPI {
  static async getWelcome(): Promise<WelcomeResponse> {
    const response = await apiClient.get<WelcomeResponse>('/');
    return response.data;
  }

  static async getFarmData(request: FarmDataRequest): Promise<FarmDataResponse> {
    const params = new URLSearchParams({
      lat: request.lat.toString(),
      lon: request.lon.toString(),
      start: request.start,
      end: request.end,
    });

    if (request.crop_type) {
      params.append('crop_type', request.crop_type);
    }

    const response = await apiClient.get<FarmDataResponse>(`/farm-data?${params}`);
    return response.data;
  }
}

export default FasalSevaAPI;