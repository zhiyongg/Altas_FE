import { TimelineItem, TransitInfo } from '../types';
import { timeToMinutes } from './time';

// Flights and hotels are fixed anchors — they cannot be reordered and keep their exact times.
export const isFixedItem = (item: TimelineItem): boolean =>
  item.type === 'flight' || item.type === 'hotel';

// Great-circle distance between two lat/lng points, in meters.
const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// Optimistic client-side transit estimate for a newly-created adjacency.
export const estimateTransit = (from: TimelineItem, to: TimelineItem): TransitInfo => {
  const fromLat = from.mapCoords?.lat;
  const fromLng = from.mapCoords?.lng;
  const toLat = to.mapCoords?.lat;
  const toLng = to.mapCoords?.lng;

  if (fromLat == null || fromLng == null || toLat == null || toLng == null) {
    return {
      type: 'subway',
      description: `Transit --- ~15 mins ---> ${to.title}`,
      duration: '~15 mins',
    };
  }

  const meters = Math.round(haversineMeters(fromLat, fromLng, toLat, toLng));

  if (meters <= 1200) {
    // Walkable: ~80 m/min pace
    const mins = Math.max(1, Math.round(meters / 80));
    return {
      type: 'walk',
      description: `Walk --- ${meters}m (${mins} mins) ---> ${to.title}`,
      duration: `${mins} mins`,
      distance: `${meters}m`,
    };
  }

  // Transit: ~30 km/h (500 m/min) + 10 min access/wait overhead
  const mins = Math.round(meters / 500) + 10;
  return {
    type: 'subway',
    description: `Transit --- ${mins} mins ---> ${to.title}`,
    duration: `${mins} mins`,
    distance: meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`,
  };
};

/**
 * Given the day's items before (originalItems) and after (newItems) a drag-reorder:
 * 1. Reassigns time slots — each contiguous run of non-fixed items inherits the sorted
 *    times that non-fixed items occupied at those same positions originally, keeping the
 *    day chronologically monotonic. Fixed items (flight/hotel) keep their exact time.
 * 2. Rebuilds transitToNext — adjacencies that already existed in originalItems keep their
 *    original (backend-accurate) transit unchanged; new adjacencies get a haversine estimate.
 */
export const recalculateSchedule = (
  originalItems: TimelineItem[],
  newItems: TimelineItem[]
): TimelineItem[] => {
  const result = newItems.map((item) => ({ ...item }));

  // --- 1. Slot reassignment ---
  let i = 0;
  while (i < result.length) {
    if (isFixedItem(result[i])) {
      i++;
      continue;
    }
    // Find the contiguous run of non-fixed items starting at i
    let j = i;
    const slotTimes: string[] = [];
    while (j < result.length && !isFixedItem(result[j])) {
      const original = originalItems[j];
      // Same positions held non-fixed items originally (fixed anchors don't move);
      // fall back to the item's own time if arrays ever diverge.
      slotTimes.push(original && !isFixedItem(original) ? original.time : result[j].time);
      j++;
    }
    slotTimes.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    for (let k = i; k < j; k++) {
      result[k].time = slotTimes[k - i];
    }
    i = j;
  }

  // --- 2. Transit rebuild ---
  const originalTransitByAdjacency = new Map<string, TransitInfo | undefined>();
  for (let k = 0; k < originalItems.length - 1; k++) {
    originalTransitByAdjacency.set(
      `${originalItems[k].id}->${originalItems[k + 1].id}`,
      originalItems[k].transitToNext
    );
  }

  for (let k = 0; k < result.length; k++) {
    const next = result[k + 1];
    if (!next) {
      result[k].transitToNext = undefined;
      continue;
    }
    const adjacencyKey = `${result[k].id}->${next.id}`;
    if (originalTransitByAdjacency.has(adjacencyKey)) {
      result[k].transitToNext = originalTransitByAdjacency.get(adjacencyKey);
    } else {
      result[k].transitToNext = estimateTransit(result[k], next);
    }
  }

  return result;
};

// Fills in a haversine-estimated transitToNext for any item that doesn't
// already have one (and has a valid next item) — an optimistic placeholder
// while a real routing refinement (computeRefinedTransit) is in flight or
// unavailable. Unlike recalculateSchedule, this is a single pass over final
// item order and never touches times or infers adjacency from array-position
// deltas, so it's safe to call after an insertion, not just a same-length
// reorder.
export const fillMissingTransit = (items: TimelineItem[]): TimelineItem[] => {
  return items.map((item, idx) => {
    if (item.transitToNext) return item;
    const next = items[idx + 1];
    if (!next) return item;
    return { ...item, transitToNext: estimateTransit(item, next) };
  });
};
