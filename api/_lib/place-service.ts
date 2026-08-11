import { cachedService } from './cache.js';
import { retryFetch } from './retry.js';
import type { Coordinates, PlaceData, ServiceEnvelope } from './types.js';
const headers = { 'User-Agent': 'LIA-Drive/1.0 (travel-assistant)' };
export async function reverseGeocode(
  coordinates: Coordinates,
  force = false,
): Promise<ServiceEnvelope<PlaceData>> {
  const key = 'reverse:' + coordinates.lat.toFixed(4) + ':' + coordinates.lon.toFixed(4);
  return cachedService(
    key,
    3600,
    async () => {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.search = new URLSearchParams({
        format: 'jsonv2',
        lat: String(coordinates.lat),
        lon: String(coordinates.lon),
        zoom: '16',
        addressdetails: '1',
      }).toString();
      const response = await retryFetch(url, { headers });
      if (!response.ok) throw new Error('Nominatim reverse geocoding failed');
      const payload = (await response.json()) as {
        display_name: string;
        type?: string;
        lat: string;
        lon: string;
      };
      return {
        source: 'openstreetmap-nominatim',
        data: {
          displayName: payload.display_name,
          category: payload.type ?? 'locality',
          lat: Number(payload.lat),
          lon: Number(payload.lon),
        },
      };
    },
    force,
  );
}
export async function getNearbyPlaces(
  coordinates: Coordinates,
  force = false,
): Promise<ServiceEnvelope<PlaceData[]>> {
  const key = 'places:' + coordinates.lat.toFixed(3) + ':' + coordinates.lon.toFixed(3);
  return cachedService(
    key,
    1800,
    async () => {
      const query =
        '[out:json][timeout:12];(nwr["tourism"](around:2500,' +
        coordinates.lat +
        ',' +
        coordinates.lon +
        ');nwr["historic"](around:2500,' +
        coordinates.lat +
        ',' +
        coordinates.lon +
        '););out center tags 12;';
      const response = await retryFetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
        body: new URLSearchParams({ data: query }),
      });
      if (!response.ok) throw new Error('Overpass request failed');
      const payload = (await response.json()) as {
        elements: Array<{
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>;
      };
      const places = payload.elements
        .map((element) => {
          const point = element.center ?? {
            lat: element.lat ?? coordinates.lat,
            lon: element.lon ?? coordinates.lon,
          };
          const tags = element.tags ?? {};
          return {
            displayName:
              tags.name ?? tags['name:it'] ?? tags.tourism ?? tags.historic ?? 'Luogo di interesse',
            category: tags.tourism ?? tags.historic ?? 'point_of_interest',
            lat: point.lat,
            lon: point.lon,
          };
        })
        .filter(
          (place, index, list) =>
            list.findIndex((candidate) => candidate.displayName === place.displayName) === index,
        )
        .slice(0, 8);
      return { source: 'openstreetmap-overpass', data: places };
    },
    force,
  );
}
