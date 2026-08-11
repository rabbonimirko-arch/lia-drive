import { coordinatesSchema } from './_lib/schemas.js';
import { parseQuery, requireMethod, sendJson, withApi } from './_lib/http.js';
import { getHistory } from './_lib/history-service.js';
export default withApi(async (request, response) => {
  requireMethod(request, ['GET']);
  const query = parseQuery(request, coordinatesSchema);
  const result = await getHistory(query, query.force === 'true');
  response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  sendJson(response, 200, result);
});
