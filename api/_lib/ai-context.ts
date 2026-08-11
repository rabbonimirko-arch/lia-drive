import type { Coordinates, UserPreferences } from './types';
import { getDashboard } from './dashboard-service';
import { liveAvatarPrompt, liveAvatarSafety } from './liveavatar-content';

export async function buildAiSystemContext(
  coordinates: Coordinates,
  preferences?: UserPreferences,
): Promise<string> {
  const dashboard = await getDashboard(coordinates, null, preferences, false);
  return [
    liveAvatarPrompt,
    'Regole di sicurezza: ' + liveAvatarSafety.join(' '),
    'Contesto aggiornato automaticamente in formato JSON:',
    JSON.stringify(dashboard),
  ].join('\n\n');
}
