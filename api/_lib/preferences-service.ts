import type { AuthIdentity, UserPreferences } from './types';
import { getSupabaseAdmin } from './supabase';
export const defaultPreferences: UserPreferences = {
  language: 'it',
  units: 'metric',
  interests: ['viaggi', 'storia', 'cultura'],
  newsTopics: ['mobilità', 'territorio'],
  accessibilityMode: false,
  avatarEnabled: true,
};
export async function getPreferences(identity: AuthIdentity | null): Promise<UserPreferences> {
  if (!identity) return defaultPreferences;
  const supabase = getSupabaseAdmin();
  if (!supabase) return defaultPreferences;
  const { data, error } = await supabase
    .from('user_preferences')
    .select('language,units,interests,news_topics,accessibility_mode,avatar_enabled')
    .eq('user_id', identity.userId)
    .maybeSingle();
  if (error || !data) return defaultPreferences;
  return {
    language: data.language,
    units: data.units,
    interests: data.interests ?? [],
    newsTopics: data.news_topics ?? [],
    accessibilityMode: data.accessibility_mode,
    avatarEnabled: data.avatar_enabled,
  };
}
export async function savePreferences(
  identity: AuthIdentity,
  preferences: UserPreferences,
): Promise<UserPreferences> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return preferences;
  const { error } = await supabase.from('user_preferences').upsert({
    user_id: identity.userId,
    language: preferences.language,
    units: preferences.units,
    interests: preferences.interests,
    news_topics: preferences.newsTopics,
    accessibility_mode: preferences.accessibilityMode,
    avatar_enabled: preferences.avatarEnabled,
  });
  if (error) throw error;
  return preferences;
}
