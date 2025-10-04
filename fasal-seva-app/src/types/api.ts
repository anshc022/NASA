// API type definitions for Fasal Seva backend integration

export interface Location {
  lat: number;
  lon: number;
}

export interface Period {
  start: string; // YYYYMMDD format
  end: string;   // YYYYMMDD format
}

export interface Recommendation {
  summary: string;
  detail: string;
  confidence: number;
}

export interface DailyRecord {
  date: string;
  t2m?: number;      // Temperature (Celsius)
  rh2m?: number;     // Relative Humidity (%)
  prectot?: number;  // Precipitation (mm)
  sza?: number;      // Solar Zenith Angle (degrees)
  ws2m?: number;     // Wind Speed (m/s)
}

export interface FarmDataResponse {
  location: Location;
  period: Period;
  crop_type?: string;
  parameters: Record<string, Record<string, number>>;
  daily: DailyRecord[];
  recommendation: Recommendation;
}

export interface WelcomeResponse {
  message: string;
  nasa_parameters: string[];
  ai_provider: string;
}

export interface FarmDataRequest {
  lat: number;
  lon: number;
  start: string;
  end: string;
  crop_type?: string;
}