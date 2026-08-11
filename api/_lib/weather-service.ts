import { cachedService } from './cache';
import { retryFetch } from './retry';
import type { Coordinates, ServiceEnvelope, WeatherData } from './types';
const descriptions: Record<number, string> = {
  0: 'Cielo sereno',
  1: 'Prevalentemente sereno',
  2: 'Parzialmente nuvoloso',
  3: 'Coperto',
  45: 'Nebbia',
  48: 'Nebbia con brina',
  51: 'Pioviggine leggera',
  53: 'Pioviggine',
  55: 'Pioviggine intensa',
  61: 'Pioggia leggera',
  63: 'Pioggia',
  65: 'Pioggia intensa',
  71: 'Neve leggera',
  73: 'Neve',
  75: 'Neve intensa',
  80: 'Rovesci leggeri',
  81: 'Rovesci',
  82: 'Rovesci intensi',
  95: 'Temporale',
  96: 'Temporale con grandine',
  99: 'Temporale intenso con grandine',
};
export async function getWeather(
  coordinates: Coordinates,
  force = false,
): Promise<ServiceEnvelope<WeatherData>> {
  const key = 'weather:' + coordinates.lat.toFixed(3) + ':' + coordinates.lon.toFixed(3);
  return cachedService(
    key,
    900,
    async () => {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.search = new URLSearchParams({
        latitude: String(coordinates.lat),
        longitude: String(coordinates.lon),
        current:
          'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
        timezone: 'auto',
      }).toString();
      const response = await retryFetch(url);
      if (!response.ok) throw new Error('Open-Meteo request failed');
      const payload = (await response.json()) as { current: Record<string, number> };
      const current = payload.current;
      return {
        source: 'open-meteo',
        data: {
          temperatureC: current.temperature_2m,
          apparentTemperatureC: current.apparent_temperature,
          humidityPercent: current.relative_humidity_2m,
          windSpeedKmh: current.wind_speed_10m,
          precipitationMm: current.precipitation,
          weatherCode: current.weather_code,
          description: descriptions[current.weather_code] ?? 'Condizioni variabili',
        },
      };
    },
    force,
  );
}
