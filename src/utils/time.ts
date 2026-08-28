// Shared time-string helpers.

/**
 * Parses an "H:MM" / "HH:MM" time string into minutes since midnight.
 * Malformed or missing values safely resolve to 0 so sorts stay stable.
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = (time ?? '').split(':').map(Number);
  const total = (hours || 0) * 60 + (minutes || 0);
  return Number.isNaN(total) ? 0 : total;
};
