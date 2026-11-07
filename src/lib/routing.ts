import { PlasticReport, CollectionRoute, CollectionRouteItem } from '../types';
import { normalizeQuantityToKg } from './matching';

/**
 * City coordinates approximation for Egyptian major recycling hubs
 */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  cairo: { lat: 30.0444, lng: 31.2357 },
  giza: { lat: 30.0131, lng: 31.2089 },
  'new cairo': { lat: 30.0074, lng: 31.4913 },
  'nasr city': { lat: 30.0511, lng: 31.3656 },
  maadi: { lat: 29.9598, lng: 31.2586 },
  helwan: { lat: 29.8492, lng: 31.3342 },
  october: { lat: 29.9737, lng: 30.9529 },
  '6th of october': { lat: 29.9737, lng: 30.9529 },
  alexandria: { lat: 31.2001, lng: 29.9187 },
  'borg el arab': { lat: 30.9167, lng: 29.5833 },
  mansoura: { lat: 31.0364, lng: 31.3807 },
  tanta: { lat: 30.7865, lng: 31.0004 },
  zagazig: { lat: 30.5877, lng: 31.502 },
  ismailia: { lat: 30.6043, lng: 32.2723 },
  suez: { lat: 29.9668, lng: 32.5498 },
  aswan: { lat: 24.0889, lng: 32.8998 },
  luxor: { lat: 25.6872, lng: 32.6396 },
};

function getCoords(locationStr: string): { lat: number; lng: number } {
  const clean = (locationStr || '').toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (clean.includes(city)) {
      return coords;
    }
  }
  // Default Cairo centroid if unknown
  return { lat: 30.0444, lng: 31.2357 };
}

// Haversine distance in km
function haversineDistance(
  c1: { lat: number; lng: number },
  c2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface OptimizedRoutePreview {
  orderedReports: PlasticReport[];
  totalDistanceKm: number;
  estimatedTimeMinutes: number;
  totalWeightKg: number;
  co2SavedKg: number;
  items: CollectionRouteItem[];
}

/**
 * Optimizes a collection route for an organization using Nearest-Neighbor heuristic
 */
export function buildOptimizedCollectionRoute(
  selectedReports: PlasticReport[],
  depotLocation?: string,
  language?: 'ar' | 'en'
): OptimizedRoutePreview;
export function buildOptimizedCollectionRoute(
  organizationId: string,
  organizationName: string,
  startLocation: string,
  destinationLocation: string,
  selectedReports: PlasticReport[]
): CollectionRoute;
export function buildOptimizedCollectionRoute(...args: any[]): any {
  // Preview mode with (selectedReports, depotLocation, language)
  if (Array.isArray(args[0])) {
    const selectedReports: PlasticReport[] = args[0];
    const depotLocation: string = args[1] || 'Cairo';
    const startCoords = getCoords(depotLocation);

    const remaining = [...selectedReports];
    const orderedReports: PlasticReport[] = [];
    const orderedItems: CollectionRouteItem[] = [];

    let currentPoint = startCoords;
    let totalKm = 0;
    let totalMinutes = 0;
    let totalKg = 0;
    let stepOrder = 1;

    while (remaining.length > 0) {
      let bestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = haversineDistance(currentPoint, getCoords(remaining[i].location));
        if (dist < minDistance) {
          minDistance = dist;
          bestIndex = i;
        }
      }

      const nextReport = remaining.splice(bestIndex, 1)[0];
      const roadMultiplier = 1.35;
      const legDistance = Math.max(1.5, Math.round(minDistance * roadMultiplier * 10) / 10);
      const legTime = Math.round((legDistance / 25) * 60) + 10;

      totalKm += legDistance;
      totalMinutes += legTime;
      const kg = normalizeQuantityToKg(nextReport.quantity, nextReport.unit);
      totalKg += kg;

      orderedReports.push(nextReport);
      orderedItems.push({
        id: `item_${nextReport.id}_${stepOrder}`,
        reportId: nextReport.id,
        report: nextReport,
        order: stepOrder++,
        estimatedDistanceKm: legDistance,
        estimatedTravelTimeMin: legTime,
        status: 'Pending',
      });

      currentPoint = getCoords(nextReport.location);
    }

    // Roundtrip return to depot factor
    const returnDist = Math.max(2.0, Math.round(haversineDistance(currentPoint, startCoords) * 1.35 * 10) / 10);
    totalKm += returnDist;
    totalMinutes += Math.round((returnDist / 35) * 60) + 15;

    // CO2 saved: ~1.5 kg CO2 per kg plastic recycled
    const co2SavedKg = Math.round(totalKg * 1.5 * 10) / 10;

    return {
      orderedReports,
      totalDistanceKm: Math.round(totalKm * 10) / 10,
      estimatedTimeMinutes: Math.round(totalMinutes),
      totalWeightKg: Math.round(totalKg * 10) / 10,
      co2SavedKg,
      items: orderedItems,
    };
  }

  // Full Route Creation with (organizationId, organizationName, startLocation, destinationLocation, selectedReports)
  const organizationId = args[0];
  const organizationName = args[1];
  const startLocation = args[2];
  const destinationLocation = args[3];
  const selectedReports: PlasticReport[] = args[4] || [];

  const startCoords = getCoords(startLocation);
  const endCoords = getCoords(destinationLocation);

  const remaining = [...selectedReports];
  const orderedItems: CollectionRouteItem[] = [];

  let currentPoint = startCoords;
  let totalKm = 0;
  let totalMinutes = 0;
  let totalKg = 0;
  let stepOrder = 1;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(currentPoint, getCoords(remaining[i].location));
      if (dist < minDistance) {
        minDistance = dist;
        bestIndex = i;
      }
    }

    const nextReport = remaining.splice(bestIndex, 1)[0];
    const roadMultiplier = 1.35;
    const legDistance = Math.max(1.5, Math.round(minDistance * roadMultiplier * 10) / 10);
    const legTime = Math.round((legDistance / 25) * 60) + 10;

    totalKm += legDistance;
    totalMinutes += legTime;
    totalKg += normalizeQuantityToKg(nextReport.quantity, nextReport.unit);

    orderedItems.push({
      id: `item_${nextReport.id}_${stepOrder}`,
      reportId: nextReport.id,
      report: nextReport,
      order: stepOrder++,
      estimatedDistanceKm: legDistance,
      estimatedTravelTimeMin: legTime,
      status: 'Pending',
    });

    currentPoint = getCoords(nextReport.location);
  }

  const finalDistance = Math.max(
    2.0,
    Math.round(haversineDistance(currentPoint, endCoords) * 1.35 * 10) / 10
  );
  totalKm += finalDistance;
  totalMinutes += Math.round((finalDistance / 35) * 60) + 15;

  return {
    id: `route_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    organizationId,
    organizationName,
    title: `Smart Collection Route - ${selectedReports.length} Pickups (${Math.round(totalKg)} kg)`,
    startLocation: startLocation || 'Organization Base / Depot',
    destinationLocation: destinationLocation || 'Central Recycling Facility',
    items: orderedItems,
    totalEstimatedDistanceKm: Math.round(totalKm * 10) / 10,
    totalEstimatedTimeMin: Math.round(totalMinutes),
    totalQuantityKg: Math.round(totalKg),
    status: 'Planned',
    createdAt: new Date().toISOString(),
  };
}
