import { cachedService } from './cache';
import { getConfig } from './config';
import { retryFetch } from './retry';
import type { Coordinates, ServiceEnvelope, TrafficData } from './types';
function congestion(current: number, freeFlow: number): TrafficData['congestionLevel'] {
  const ratio = freeFlow > 0 ? current / freeFlow : 1;
  if (ratio < 0.35) return 'severe';
  if (ratio < 0.58) return 'high';
  if (ratio < 0.8) return 'moderate';
  return 'low';
}
function estimatedTraffic(coordinates: Coordinates): TrafficData {
  const utcHour = new Date().getUTCHours();
  const localHour = (utcHour + Math.round(coordinates.lon / 15) + 24) % 24;
  const rush = (localHour >= 7 && localHour <= 9) || (localHour >= 17 && localHour <= 20);
  const moderate = localHour >= 6 && localHour <= 22;
  const level = rush ? 'high' : moderate ? 'moderate' : 'low';
  return {
    congestionLevel: level,
    currentSpeedKmh: rush ? 24 : moderate ? 38 : 52,
    freeFlowSpeedKmh: 55,
    confidence: 0.32,
    roadName: 'Area corrente',
    delaySeconds: rush ? 420 : moderate ? 150 : 30,
  };
}
export async function getTraffic(
  coordinates: Coordinates,
  force = false,
): Promise<ServiceEnvelope<TrafficData>> {
  const key = 'traffic:' + coordinates.lat.toFixed(3) + ':' + coordinates.lon.toFixed(3);
  return cachedService(
    key,
    900,
    async () => {
      const apiKey = getConfig().TOMTOM_API_KEY;
      if (!apiKey)
        return {
          source: 'lia-time-profile',
          quality: 'estimated' as const,
          warning: 'TOMTOM_API_KEY non configurata: stima basata su fascia oraria locale.',
          data: estimatedTraffic(coordinates),
        };
      const url = new URL(
        'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json',
      );
      url.search = new URLSearchParams({
        point: coordinates.lat + ',' + coordinates.lon,
        unit: 'KMPH',
        key: apiKey,
      }).toString();
      const response = await retryFetch(url);
      if (!response.ok) throw new Error('TomTom traffic request failed');
      const payload = (await response.json()) as {
        flowSegmentData: {
          currentSpeed: number;
          freeFlowSpeed: number;
          confidence: number;
          roadClosure: boolean;
          currentTravelTime: number;
          freeFlowTravelTime: number;
          streetName?: string;
        };
      };
      const flow = payload.flowSegmentData;
      return {
        source: 'tomtom-traffic',
        data: {
          congestionLevel: flow.roadClosure
            ? 'severe'
            : congestion(flow.currentSpeed, flow.freeFlowSpeed),
          currentSpeedKmh: flow.currentSpeed,
          freeFlowSpeedKmh: flow.freeFlowSpeed,
          confidence: flow.confidence,
          roadName: flow.streetName ?? 'Tratto stradale vicino',
          delaySeconds: Math.max(0, flow.currentTravelTime - flow.freeFlowTravelTime),
        },
      };
    },
    force,
  );
}
