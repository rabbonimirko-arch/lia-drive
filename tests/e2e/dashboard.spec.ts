import { expect, test } from '@playwright/test';
const dashboardFixture = {
  coordinates: { lat: 41.9028, lon: 12.4964 },
  generatedAt: new Date().toISOString(),
  place: {
    data: { displayName: 'Roma, Lazio, Italia' },
    source: 'openstreetmap-nominatim',
    quality: 'live',
  },
  traffic: {
    data: { congestionLevel: 'moderate', currentSpeedKmh: 34, roadName: 'Via Nazionale' },
    source: 'tomtom-traffic',
    quality: 'live',
  },
  weather: {
    data: { temperatureC: 24, description: 'Cielo sereno', windSpeedKmh: 8, humidityPercent: 56 },
    source: 'open-meteo',
    quality: 'live',
  },
  news: {
    data: [
      {
        title: 'Mobilità urbana in aggiornamento',
        link: 'https://example.com/news',
        publisher: 'Test News',
        publishedAt: new Date().toISOString(),
      },
    ],
    source: 'google-news-rss',
    quality: 'live',
  },
  places: {
    data: [{ displayName: 'Foro Romano', category: 'historic' }],
    source: 'openstreetmap-overpass',
    quality: 'live',
  },
  history: {
    data: [
      {
        title: 'Storia di Roma',
        summary: 'Una sintesi storica verificabile.',
        url: 'https://it.wikipedia.org/wiki/Roma',
      },
    ],
    source: 'wikipedia',
    quality: 'live',
  },
  avatar: {
    configured: true,
    embedUrl:
      'https://embed.liveavatar.com/v1/1d4a2b6c-8e2f-4206-9e52-bc5277377281?9?background=000000',
  },
  serviceStatus: [],
  recentLogs: [],
};
test('dashboard renders contextual data and avatar', async ({ page }) => {
  await page.route('**/api/dashboard**', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dashboardFixture),
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /La strada, raccontata/i })).toBeVisible();
  await expect(page.locator('#locationName')).toContainText('Roma');
  await expect(page.locator('#temperature')).toContainText('24°');
  await expect(page.locator('#trafficLevel')).toContainText('Rallentato');
  await expect(page.getByText('Mobilità urbana in aggiornamento')).toBeVisible();
  await expect(page.locator('#avatarFrame')).toHaveAttribute('src', /embed.liveavatar.com/);
});
test('responsive navigation keeps GPS action accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/dashboard**', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dashboardFixture),
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Usa la mia posizione/i })).toBeVisible();
});
