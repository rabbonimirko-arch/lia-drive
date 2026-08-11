import { coordinatesSchema } from './_lib/schemas.js';
import { parseQuery, requireMethod, sendJson, withApi } from './_lib/http.js';
import { getTraffic } from './_lib/traffic-service.js';
export default withApi(async (request, response) => {
  requireMethod(request, ['GET']);
  const query = parseQuery(request, coordinatesSchema);
  const result = await getTraffic(query, query.force === 'true');
  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  sendJson(response, 200, result);
});
