import { cachedService } from './cache';
import { retryFetch } from './retry';
import type { Coordinates, HistoryItem, ServiceEnvelope } from './types';
export async function getHistory(
  coordinates: Coordinates,
  force = false,
): Promise<ServiceEnvelope<HistoryItem[]>> {
  const key = 'history:' + coordinates.lat.toFixed(3) + ':' + coordinates.lon.toFixed(3);
  return cachedService(
    key,
    86400,
    async () => {
      const url = new URL('https://it.wikipedia.org/w/api.php');
      url.search = new URLSearchParams({
        action: 'query',
        generator: 'geosearch',
        ggsprimary: 'all',
        ggsnamespace: '0',
        ggslimit: '6',
        ggsradius: '10000',
        ggscoord: coordinates.lat + '|' + coordinates.lon,
        prop: 'extracts|coordinates|info',
        exintro: '1',
        explaintext: '1',
        exchars: '700',
        inprop: 'url',
        format: 'json',
        origin: '*',
      }).toString();
      const response = await retryFetch(url);
      if (!response.ok) throw new Error('Wikipedia request failed');
      const payload = (await response.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              title: string;
              extract?: string;
              fullurl?: string;
              coordinates?: Array<{ lat: number; lon: number }>;
            }
          >;
        };
      };
      const items = Object.values(payload.query?.pages ?? {})
        .map((page) => ({
          title: page.title,
          summary: page.extract?.trim() || 'Voce enciclopedica disponibile su Wikipedia.',
          url:
            page.fullurl ??
            'https://it.wikipedia.org/wiki/' + encodeURIComponent(page.title.replaceAll(' ', '_')),
          lat: page.coordinates?.[0]?.lat,
          lon: page.coordinates?.[0]?.lon,
        }))
        .slice(0, 6);
      return { source: 'wikipedia', data: items };
    },
    force,
  );
}
