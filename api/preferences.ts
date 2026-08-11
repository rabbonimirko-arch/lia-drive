import { authenticate } from './_lib/auth.js';
import { parseBody, requireMethod, sendJson, withApi } from './_lib/http.js';
import { preferencesSchema } from './_lib/schemas.js';
import { getPreferences, savePreferences } from './_lib/preferences-service.js';
import { getSupabaseAdmin } from './_lib/supabase.js';
export default withApi(
  async (request, response) => {
    requireMethod(request, ['GET', 'PUT']);
    if (request.method === 'GET') {
      const identity = await authenticate(request, false);
      sendJson(response, 200, {
        data: await getPreferences(identity),
        authenticated: Boolean(identity),
        persisted: Boolean(identity && getSupabaseAdmin()),
      });
      return;
    }
    const identity = await authenticate(request, true);
    const preferences = parseBody(request, preferencesSchema);
    const saved = await savePreferences(identity!, preferences);
    sendJson(response, 200, { data: saved, persisted: Boolean(getSupabaseAdmin()) });
  },
  { rateLimit: 45 },
);
