// Client for the backend route-refinement endpoint.
// Shared API contract with the Python backend — must stay in sync.

import { API_BASE } from '../api';

export interface RouteWaypoint {
  id: string;
  lat: number;
  lng: number;
}

export interface RouteLeg {
  fromId: string;
  toId: string;
  durationMinutes: number;
  distanceMeters: number;
  mode: 'walk' | 'subway' | 'bus' | 'taxi';
  estimated: boolean;
}

interface RecalculateRouteResponse {
  legs: RouteLeg[];
}

/**
 * POSTs the day's ordered waypoints (only items with both lat & lng) to the backend
 * and returns exactly waypoints.length - 1 legs in order, or null on any failure.
 */
export const recalculateRoute = async (
  waypoints: RouteWaypoint[],
  mode: 'TRANSIT' = 'TRANSIT'
): Promise<RouteLeg[] | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/recalculate-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints, mode }),
    });

    if (!response.ok) return null;

    const data: RecalculateRouteResponse = await response.json();
    if (!data || !Array.isArray(data.legs)) return null;

    // Contract check: the backend must return exactly one leg per adjacency
    const expectedLegs = Math.max(0, waypoints.length - 1);
    if (data.legs.length !== expectedLegs) {
      console.warn(
        `Route refinement returned ${data.legs.length} legs, expected ${expectedLegs}; ignoring response.`
      );
      return null;
    }

    return data.legs;
  } catch (error) {
    console.error('Route refinement request failed:', error);
    return null;
  }
};
