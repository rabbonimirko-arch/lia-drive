import { XMLParser } from 'fast-xml-parser';
import { cachedService } from './cache';
import { retryFetch } from './retry';
import type { NewsItem, ServiceEnvelope } from './types';
const parser = new XMLParser({ ignoreAttributes: false });
function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
export async function getNews(
  placeName: string,
  topics: string[] = [],
  force = false,
): Promise<ServiceEnvelope<NewsItem[]>> {
  const placeParts = placeName
    .split(',')
    .map((part) => part.trim())
    .filter(
      (part) => /[A-Za-zÀ-ÿ]{3}/.test(part) && !part.includes('_') && !/^Italia$/i.test(part),
    );
  const normalizedPlace = placeParts.slice(-4)[0] ?? placeParts[0] ?? 'Italia';
  const query = [normalizedPlace, ...topics.slice(0, 3)].join(' ');
  const key = 'news:' + query.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
  return cachedService(
    key,
    900,
    async () => {
      const url = new URL('https://news.google.com/rss/search');
      url.search = new URLSearchParams({
        q: query + ' when:1d',
        hl: 'it',
        gl: 'IT',
        ceid: 'IT:it',
      }).toString();
      const response = await retryFetch(url);
      if (!response.ok) throw new Error('Google News RSS request failed');
      const xml = await response.text();
      const feed = parser.parse(xml) as {
        rss?: { channel?: { item?: Array<Record<string, unknown>> | Record<string, unknown> } };
      };
      const items = asArray(feed.rss?.channel?.item)
        .slice(0, 8)
        .map((item) => {
          const rawTitle = String(item.title ?? 'Notizia locale');
          const parts = rawTitle.split(' - ');
          const publisher = parts.length > 1 ? (parts.pop() ?? 'Google News') : 'Google News';
          return {
            title: parts.join(' - ') || rawTitle,
            link: String(item.link ?? ''),
            publisher,
            publishedAt: new Date(String(item.pubDate ?? Date.now())).toISOString(),
          };
        });
      return { source: 'google-news-rss', data: items };
    },
    force,
  );
}
