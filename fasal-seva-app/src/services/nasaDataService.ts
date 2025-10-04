// NASA Data API Service - Comprehensive Integration
// Based on NASA Space Apps Challenge 2025 Requirements

import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NASAWeatherData } from '../utils/enhancedGameEngine';

export interface FarmDataRequest {
  lat: number;
  lon: number;
  start: string;  // YYYYMMDD
  end: string;    // YYYYMMDD
  crop_type?: string;
}

export interface FarmDataResponse {
  location: {
    lat: number;
    lon: number;
    region?: string;
  };
  period: {
    start: string;
    end: string;
  };
  crop_type?: string;
  data_resolution: string;
  parameters: Record<string, Record<string, number>>;  // Raw NASA data
  daily: Array<{
    date: string;
    t2m: number;
    t2m_max?: number;
    t2m_min?: number;
    rh2m: number;
    prectot: number;
    ws2m: number;
    allsky_sfc_sw_dwn?: number;
    t2mdew?: number;
  }>;
  recommendation: {
    summary: string;
    detail: string;
    confidence: number;
  };
  // Optional flag when loaded from cache
  fromCache?: boolean;
}

export interface APIError {
  message: string;
  code?: string;
  details?: any;
}

class NASADataService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  private cacheKey(req: FarmDataRequest) {
    const crop = req.crop_type || 'any';
    return `farmData:${req.lat}:${req.lon}:${req.start}:${req.end}:${crop}`;
  }

  private async saveToCache(req: FarmDataRequest, data: FarmDataResponse) {
    const key = this.cacheKey(req);
    const payload = { savedAt: Date.now(), data };
    try { await AsyncStorage.setItem(key, JSON.stringify(payload)); } catch {}
  }

  private async loadFromCache(req: FarmDataRequest, maxAgeMs = 24 * 60 * 60 * 1000): Promise<FarmDataResponse | null> {
    const key = this.cacheKey(req);
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.savedAt || !parsed?.data) return null;
      const age = Date.now() - parsed.savedAt;
      if (age > maxAgeMs) return null;
      const d: FarmDataResponse = { ...parsed.data, fromCache: true };
      // Ensure resolution is present
      if (!d.data_resolution) d.data_resolution = API_CONFIG.NASA_DATA_RESOLUTION;
      return d;
    } catch { return null; }
  }

  /**
   * Fetch NASA POWER data for a farm location
   */
  async getFarmData(request: FarmDataRequest): Promise<FarmDataResponse> {
    const params = new URLSearchParams({
      lat: request.lat.toString(),
      lon: request.lon.toString(),
      start: request.start,
      end: request.end,
    });

    if (request.crop_type) {
      params.append('crop_type', request.crop_type);
    }

    const url = `${this.baseURL}${API_CONFIG.ENDPOINTS.FARM_DATA}?${params.toString()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
          code: 'API_ERROR',
          details: errorData,
        } as APIError;
      }

      const data: FarmDataResponse = await response.json();
      
      // Add data resolution info if not present
      if (!data.data_resolution) {
        data.data_resolution = API_CONFIG.NASA_DATA_RESOLUTION;
      }

      // Save to cache for offline use
      this.saveToCache(request, data).catch(() => {});

      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw {
          message: 'Request timeout - NASA API taking too long to respond',
          code: 'TIMEOUT',
        } as APIError;
      }

      if (error.message && error.code) {
        throw error as APIError;
      }

      // Try cache fallback
      const cached = await this.loadFromCache(request);
      if (cached) {
        return cached;
      }

      throw {
        message: 'Unable to connect to NASA Farm Navigator server',
        code: 'NETWORK_ERROR',
        details: error,
      } as APIError;
    }
  }

  /**
   * Convert daily array to weather data array
   */
  parseDailyData(daily: FarmDataResponse['daily']): NASAWeatherData[] {
    return daily.map(day => ({
      date: day.date,
      t2m: day.t2m,
      t2m_max: day.t2m_max || day.t2m,
      t2m_min: day.t2m_min || day.t2m,
      rh2m: day.rh2m,
      prectot: day.prectot,
      ws2m: day.ws2m,
      allsky_sfc_sw_dwn: day.allsky_sfc_sw_dwn,
      t2mdew: day.t2mdew,
    }));
  }

  /**
   * Calculate summary statistics from NASA data
   */
  calculateStatistics(daily: NASAWeatherData[]) {
    if (daily.length === 0) {
      return {
        avgTemp: 0,
        maxTemp: 0,
        minTemp: 0,
        totalRainfall: 0,
        avgHumidity: 0,
        avgSolarRad: 0,
      };
    }

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => sum(arr) / arr.length;

    const temps = daily.map(d => d.t2m);
    const maxTemps = daily.map(d => d.t2m_max);
    const minTemps = daily.map(d => d.t2m_min);
    const rainfall = daily.map(d => d.prectot);
    const humidity = daily.map(d => d.rh2m);
    const solarRad = daily.filter(d => d.allsky_sfc_sw_dwn).map(d => d.allsky_sfc_sw_dwn!);

    return {
      avgTemp: avg(temps),
      maxTemp: Math.max(...maxTemps),
      minTemp: Math.min(...minTemps),
      totalRainfall: sum(rainfall),
      avgRainfall: avg(rainfall),
      avgHumidity: avg(humidity),
      avgSolarRad: solarRad.length > 0 ? avg(solarRad) : 0,
      avgWindSpeed: avg(daily.map(d => d.ws2m)),
    };
  }

  /**
   * Format date to YYYYMMDD
   */
  formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Get date range for last N days (ending 3 days ago to avoid NASA data lag)
   */
  getDateRange(days: number): { start: string; end: string } {
    const end = new Date();
    end.setDate(end.getDate() - 3); // NASA POWER data has ~3 day lag
    const start = new Date(end);
    start.setDate(start.getDate() - days);

    return {
      start: this.formatDateForAPI(start),
      end: this.formatDateForAPI(end),
    };
  }

  /**
   * Check if NASA API is reachable
   */
  async checkConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseURL}${API_CONFIG.ENDPOINTS.ROOT}`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const nasaDataService = new NASADataService();

// Helper functions for quick access
export const fetchFarmData = (request: FarmDataRequest) => 
  nasaDataService.getFarmData(request);

export const parseDailyData = (daily: FarmDataResponse['daily']) => 
  nasaDataService.parseDailyData(daily);

export const calculateStatistics = (daily: NASAWeatherData[]) => 
  nasaDataService.calculateStatistics(daily);

export const formatDateForAPI = (date: Date) => 
  nasaDataService.formatDateForAPI(date);

export const getDateRange = (days: number) => 
  nasaDataService.getDateRange(days);

export const checkConnection = () => 
  nasaDataService.checkConnection();
