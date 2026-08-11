import { getConfig } from './_lib/config';
import { requireMethod, sendJson, withApi } from './_lib/http';
export default withApi(
  async (request, response) => {
    requireMethod(request, ['GET']);
    const config = getConfig();
    sendJson(response, 200, {
      status: 'ok',
      service: 'lia-drive-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      integrations: {
        supabase: Boolean(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY),
        openai: Boolean(config.OPENAI_API_KEY),
        liveavatar: Boolean(config.LIVEAVATAR_EMBED_URL || config.LIVEAVATAR_API_KEY),
        liveTraffic: Boolean(config.TOMTOM_API_KEY),
      },
    });
  },
  { rateLimit: 180 },
);
