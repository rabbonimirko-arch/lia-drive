import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getWeather } from '../../api/_lib/weather-service';
import { resetMemoryCacheForTests } from '../../api/_lib/cache';
describe('weather service', () => {
  beforeEach(() => resetMemoryCacheForTests());
  afterEach(() => {
    vi.unstubAllGlobals();
    resetMemoryCacheForTests();
  });
  it('maps Open-Meteo current conditions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            current: {
              temperature_2m: 22.4,
              relative_humidity_2m: 61,
              apparent_temperature: 23.1,
              precipitation: 0,
              weather_code: 1,
              wind_speed_10m: 8.2,
            },
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await getWeather({ lat: 45, lon: 9 }, true);
    expect(result.source).toBe('open-meteo');
    expect(result.data.description).toBe('Prevalentemente sereno');
    expect(result.data.temperatureC).toBe(22.4);
  });
});
