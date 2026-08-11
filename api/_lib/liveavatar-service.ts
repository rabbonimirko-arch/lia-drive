import { getConfig } from './config';
import { ApiError } from './errors';
import { retryFetch } from './retry';
import { liveAvatarOpeningText, liveAvatarPrompt } from './liveavatar-content';
const apiBase = 'https://api.liveavatar.com';
async function liveAvatarRequest(pathname: string, body: unknown): Promise<any> {
  const apiKey = getConfig().LIVEAVATAR_API_KEY;
  if (!apiKey)
    throw new ApiError(503, 'LIVEAVATAR_API_KEY is not configured', 'liveavatar_not_configured');
  const response = await retryFetch(apiBase + pathname, {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || (typeof payload.code === 'number' && payload.code >= 4000))
    throw new ApiError(
      502,
      payload.message ?? 'LiveAvatar request failed',
      'liveavatar_upstream_error',
      payload,
    );
  return payload;
}
export function getAvatarConfiguration(): Record<string, unknown> {
  const config = getConfig();
  return {
    configured: Boolean(
      config.LIVEAVATAR_EMBED_URL || (config.LIVEAVATAR_API_KEY && config.LIVEAVATAR_AVATAR_ID),
    ),
    embedUrl: config.LIVEAVATAR_EMBED_URL,
    sandbox: config.LIVEAVATAR_SANDBOX,
    avatarIdConfigured: Boolean(config.LIVEAVATAR_AVATAR_ID),
    contextIdConfigured: Boolean(config.LIVEAVATAR_CONTEXT_ID),
    voiceIdConfigured: Boolean(config.LIVEAVATAR_VOICE_ID),
  };
}
export async function createAvatarEmbed(input: {
  avatarId?: string;
  contextId?: string;
  voiceId?: string;
  sandbox?: boolean;
}): Promise<any> {
  const config = getConfig();
  const avatarId = input.avatarId ?? config.LIVEAVATAR_AVATAR_ID;
  if (!avatarId)
    throw new ApiError(503, 'LIVEAVATAR_AVATAR_ID is not configured', 'liveavatar_avatar_missing');
  return liveAvatarRequest('/v2/embeddings', {
    avatar_id: avatarId,
    context_id: input.contextId ?? config.LIVEAVATAR_CONTEXT_ID,
    voice_id: input.voiceId ?? config.LIVEAVATAR_VOICE_ID,
    is_sandbox: input.sandbox ?? config.LIVEAVATAR_SANDBOX,
    default_language: 'it',
    orientation: 'horizontal',
    max_session_duration: 900,
  });
}
export async function provisionAvatarContext(): Promise<any> {
  return liveAvatarRequest('/v1/contexts', {
    name: 'LIA Drive - Contesto viaggio',
    prompt: liveAvatarPrompt,
    opening_text: liveAvatarOpeningText,
    links: [],
  });
}
