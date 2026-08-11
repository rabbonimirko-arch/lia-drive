import { authenticate } from './_lib/auth.js';
import { getDashboard } from './_lib/dashboard-service.js';
import { parseQuery, requireMethod, sendJson, withApi } from './_lib/http.js';
import { coordinatesSchema } from './_lib/schemas.js';
export default withApi(async (request, response) => {
  requireMethod(request, ['GET']);
  const query = parseQuery(request, coordinatesSchema);
  const identity = await authenticate(request, false);
  const result = await getDashboard(query, identity, undefined, query.force === 'true');
  response.setHeader(
    'Cache-Control',
    identity ? 'private, no-store' : 'public, s-maxage=180, stale-while-revalidate=600',
  );
  sendJson(response, 200, result);
});
