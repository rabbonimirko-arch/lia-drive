import { coordinatesSchema } from './_lib/schemas';
import { parseQuery, requireMethod, sendJson, withApi } from './_lib/http';
import { getNearbyPlaces, reverseGeocode } from './_lib/place-service';
export default withApi(async (request, response) => {
  requireMethod(request, ['GET']);
  const query = parseQuery(request, coordinatesSchema);
  const [current, nearby] = await Promise.all([
    reverseGeocode(query, query.force === 'true'),
    getNearbyPlaces(query, query.force === 'true'),
  ]);
  response.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
  sendJson(response, 200, { current, nearby });
});
