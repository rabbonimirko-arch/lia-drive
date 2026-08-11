import type { AuthIdentity, Coordinates } from './types.js';
import { getSupabaseAdmin } from './supabase.js';
export interface GpsEvent extends Coordinates {
  accuracyMeters?: number;
  altitudeMeters?: number;
  headingDegrees?: number;
  speedMps?: number;
  recordedAt?: string;
}
export async function recordGps(
  identity: AuthIdentity | null,
  event: GpsEvent,
): Promise<{ persisted: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { persisted: false };
  const { error } = await supabase.from('gps_events').insert({
    user_id: identity?.userId ?? null,
    latitude: event.lat,
    longitude: event.lon,
    accuracy_meters: event.accuracyMeters ?? null,
    altitude_meters: event.altitudeMeters ?? null,
    heading_degrees: event.headingDegrees ?? null,
    speed_mps: event.speedMps ?? null,
    recorded_at: event.recordedAt ?? new Date().toISOString(),
  });
  if (error) throw error;
  return { persisted: true };
}
