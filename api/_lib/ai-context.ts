import type { Coordinates, UserPreferences } from './types.js';
import { getDashboard } from './dashboard-service.js';
import { liveAvatarPrompt, liveAvatarSafety } from './liveavatar-content.js';

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
