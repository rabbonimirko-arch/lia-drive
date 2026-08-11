import { getConfig } from '../_lib/config.js';
import { getDashboard } from '../_lib/dashboard-service.js';
import { ApiError } from '../_lib/errors.js';
import { log } from '../_lib/logger.js';
import { defaultPreferences } from '../_lib/preferences-service.js';
import { requireMethod, sendJson, withApi } from '../_lib/http.js';
import { getSupabaseAdmin } from '../_lib/supabase.js';
export default withApi(
  async (request, response, context) => {
    requireMethod(request, ['GET']);
    const config = getConfig();
    if (config.CRON_SECRET && request.headers.authorization !== 'Bearer ' + config.CRON_SECRET)
      throw new ApiError(401, 'Invalid cron authorization', 'invalid_cron_secret');
    if (!config.CRON_SECRET && config.NODE_ENV === 'production')
      throw new ApiError(503, 'CRON_SECRET is required in production', 'cron_not_configured');
    const startedAt = Date.now();
    const result = await getDashboard(
      { lat: 41.9028, lon: 12.4964 },
      null,
      defaultPreferences,
      true,
    );
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const statuses = ['traffic', 'weather', 'news', 'places', 'history'].map((service) => ({
        service,
        status: 'operational',
        checked_at: new Date().toISOString(),
        latency_ms: Date.now() - startedAt,
        details: { source: (result[service] as any)?.source ?? 'unknown' },
      }));
      await supabase.from('service_health').upsert(statuses, { onConflict: 'service' });
    }
    log({
      level: 'info',
      service: 'cron',
      requestId: context.requestId,
      message: 'Scheduled refresh completed',
      metadata: { durationMs: Date.now() - startedAt },
    });
    sendJson(response, 200, {
      success: true,
      durationMs: Date.now() - startedAt,
      refreshedAt: new Date().toISOString(),
    });
  },
  { rateLimit: 10 },
);
