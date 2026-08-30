import { Trip } from '../types';

/**
 * The trip's grand total.
 *
 * Every screen used to compute this differently — TimelineView summed
 * accommodation + flights, costs.usdEstimate deliberately excluded activities,
 * and FinalizePayView ignored costs entirely in favour of `trip.budget` (a
 * per-pax budget input, not a total). The three numbers never agreed, so the
 * timeline could say one thing and the checkout charge another. Everything now
 * goes through here.
 */
export const tripTotal = (costs: Trip['costs']): number =>
  (costs.accommodation || 0) + (costs.flights || 0) + (costs.activities || 0);

/**
 * Even per-person split of the trip total, guarding against a zero traveler
 * count (which produced Infinity/NaN in the payment UI).
 */
export const perPersonShare = (costs: Trip['costs'], travelers: number): number => {
  const people = travelers > 0 ? travelers : 1;
  return tripTotal(costs) / people;
};
