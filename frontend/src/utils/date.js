/**
 * QuickCourt Date Formatting Utilities
 * 
 * Safely format booking dates without timezone drift.
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats a booking date string (typically "YYYY-MM-DD") into a human-friendly format
 * such as "Sep 12, 2026".
 * 
 * Avoids browser timezone offset bugs by parsing year, month, and day directly
 * from the date string rather than calling new Date("YYYY-MM-DD") which treats
 * ISO date-only strings as UTC midnight and can shift backward by one calendar day
 * in negative UTC offsets (e.g., Americas).
 * 
 * @param {string|null|undefined} dateStr - Date string in "YYYY-MM-DD" or ISO format
 * @returns {string} Human-friendly formatted date string (e.g. "Sep 12, 2026") or fallback
 */
export function formatBookingDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return dateStr || '—';
  }

  const trimmed = dateStr.trim();
  if (!trimmed) {
    return '—';
  }

  // Fast path: standard "YYYY-MM-DD" format
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (
      !isNaN(year) &&
      !isNaN(month) &&
      !isNaN(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
    }
  }

  // Fallback: safe parsing with UTC timezone
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  return trimmed;
}
