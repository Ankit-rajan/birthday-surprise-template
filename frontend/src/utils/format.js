/** Date-only values are stored at UTC midnight, so format them in UTC to avoid off-by-one days. */
export function formatDate(value, fallback = '') {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Timestamps (journal entries) are shown in the reader's own timezone. */
export function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** <input type="date"> wants YYYY-MM-DD. */
export function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export const pad = (n) => String(n).padStart(2, '0');
