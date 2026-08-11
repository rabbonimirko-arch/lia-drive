import { coordinatesSchema } from './_lib/schemas.js';
import { parseQuery, requireMethod, sendJson, withApi } from './_lib/http.js';
import { reverseGeocode } from './_lib/place-service.js';
import { getNews } from './_lib/news-service.js';
export default withApi(async (request, response) => {
  requireMethod(request, ['GET']);
  const query = parseQuery(request, coordinatesSchema);
  const place = await reverseGeocode(query, query.force === 'true');
  const topics =
    typeof request.query.topics === 'string'
      ? request.query.topics
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
  const result = await getNews(place.data.displayName, topics, query.force === 'true');
  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  sendJson(response, 200, { place: place.data.displayName, ...result });
});
