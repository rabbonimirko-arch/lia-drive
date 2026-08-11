import type { AuthIdentity, Coordinates, UserPreferences } from './types.js';
import { getTraffic } from './traffic-service.js';
import { getWeather } from './weather-service.js';
import { getNearbyPlaces, reverseGeocode } from './place-service.js';
import { getNews } from './news-service.js';
import { getHistory } from './history-service.js';
import { getPreferences } from './preferences-service.js';
import { getAvatarConfiguration } from './liveavatar-service.js';
import { getSupabaseAdmin } from './supabase.js';
export async function getDashboard(
  coordinates: Coordinates,
  identity: AuthIdentity | null,
  providedPreferences?: UserPreferences,
  force = false,
): Promise<Record<string, unknown>> {
  const preferences = providedPreferences ?? (await getPreferences(identity));
  const place = await reverseGeocode(coordinates, force);
  const [traffic, weather, news, places, history] = await Promise.all([
    getTraffic(coordinates, force),
    getWeather(coordinates, force),
    getNews(place.data.displayName, preferences.newsTopics, force),
    getNearbyPlaces(coordinates, force),
    getHistory(coordinates, force),
  ]);
  const supabase = getSupabaseAdmin();
  let serviceStatus: unknown[] = [];
  let recentLogs: unknown[] = [];
  if (supabase) {
    const [healthResult, logsResult] = await Promise.all([
      supabase.from('service_status_view').select('*').limit(12),
      supabase
        .from('service_logs')
        .select('level,service,message,created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    serviceStatus = healthResult.data ?? [];
    recentLogs = logsResult.data ?? [];
  }
  return {
    coordinates,
    place,
    traffic,
    weather,
    news,
    places,
    history,
    preferences,
    avatar: getAvatarConfiguration(),
    serviceStatus,
    recentLogs,
    generatedAt: new Date().toISOString(),
  };
}
