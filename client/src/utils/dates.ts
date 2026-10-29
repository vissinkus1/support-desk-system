/**
 * Parse a UTC datetime string from SQLite (space-separated) into a JS Date.
 * SQLite returns "2024-01-15 08:30:00" — we normalise to ISO-8601.
 */
export function parseUtc(s: string): Date {
  return new Date(s.replace(' ', 'T') + 'Z');
}

/**
 * Human-friendly relative time string.
 */
export function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/**
 * Exact date and time formatted for tooltip or details.
 */
export function formatExact(date: Date): string {
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
