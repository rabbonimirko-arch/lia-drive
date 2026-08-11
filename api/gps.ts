import { authenticate } from './_lib/auth';
import { ApiError } from './_lib/errors';
import { parseBody, requireMethod, sendJson, withApi } from './_lib/http';
import { gpsBodySchema } from './_lib/schemas';
import { recordGps } from './_lib/gps-service';
import { getSupabaseAdmin } from './_lib/supabase';
export default withApi(
  async (request, response) => {
    requireMethod(request, ['GET', 'POST']);
    const identity = await authenticate(request, request.method === 'GET');
    if (request.method === 'POST') {
      const event = parseBody(request, gpsBodySchema);
      const result = await recordGps(identity, event);
      sendJson(response, 202, { accepted: true, ...result });
      return;
    }
    const supabase = getSupabaseAdmin();
    if (!supabase || !identity)
      throw new ApiError(503, 'GPS persistence is not configured', 'gps_storage_unavailable');
    const { data, error } = await supabase
      .from('gps_events')
      .select(
        'latitude,longitude,accuracy_meters,altitude_meters,heading_degrees,speed_mps,recorded_at',
      )
      .eq('user_id', identity.userId)
      .order('recorded_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    sendJson(response, 200, { data });
  },
  { rateLimit: 120 },
);
