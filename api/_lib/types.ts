export type SourceQuality = 'live' | 'cached' | 'estimated' | 'unavailable';

export interface Coordinates {
  lat: number;
  lon: number;
}
export interface ServiceEnvelope<T> {
  data: T;
  source: string;
  quality: SourceQuality;
  fetchedAt: string;
  expiresAt: string;
  warning?: string;
}
export interface TrafficData {
  congestionLevel: 'low' | 'moderate' | 'high' | 'severe';
  currentSpeedKmh: number | null;
  freeFlowSpeedKmh: number | null;
  confidence: number;
  roadName: string;
  delaySeconds: number;
}
export interface WeatherData {
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  windSpeedKmh: number;
  precipitationMm: number;
  weatherCode: number;
  description: string;
}
export interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string;
}
export interface PlaceData {
  displayName: string;
  category: string;
  distanceMeters?: number;
  lat: number;
  lon: number;
}
export interface HistoryItem {
  title: string;
  summary: string;
  url: string;
  lat?: number;
  lon?: number;
}
export interface UserPreferences {
  language: string;
  units: 'metric';
  interests: string[];
  newsTopics: string[];
  accessibilityMode: boolean;
  avatarEnabled: boolean;
}
export interface AuthIdentity {
  userId: string;
  email?: string;
  provider: 'supabase' | 'local-jwt';
}
