// Scan-cadence arithmetic — the closed `scan_frequency` enum (14-codex.md §3.5) and
// the date math the scheduler uses to compute `next_scan_due` and to decide what is
// due. Dates are quoted ISO-8601 (YYYY-MM-DD); ISO dates compare correctly as strings.

export const FREQUENCIES = new Set(['daily', 'weekly', 'monthly', 'quarterly']);

const ADD_DAYS = { daily: 1, weekly: 7 };
const ADD_MONTHS = { monthly: 1, quarterly: 3 };

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

// next_scan_due = isoDate + scan_frequency. Month additions clamp the day to the
// target month's length (e.g. Jan 31 + monthly → Feb 28/29). UTC throughout so the
// result is host-timezone independent.
export function addFrequency(isoDate, freq) {
  if (!ISO_RE.test(isoDate || '')) throw new Error(`addFrequency: expected YYYY-MM-DD, got ${JSON.stringify(isoDate)}`);
  if (!FREQUENCIES.has(freq)) throw new Error(`addFrequency: unknown scan_frequency ${JSON.stringify(freq)} (expected ${[...FREQUENCIES].join('|')})`);
  const [y, m, d] = isoDate.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  if (freq in ADD_DAYS) {
    base.setUTCDate(base.getUTCDate() + ADD_DAYS[freq]);
  } else {
    const day = base.getUTCDate();
    base.setUTCDate(1);
    base.setUTCMonth(base.getUTCMonth() + ADD_MONTHS[freq]);
    const daysInMonth = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
    base.setUTCDate(Math.min(day, daysInMonth));
  }
  return base.toISOString().slice(0, 10);
}

// A source is due when it has never been scheduled (no next_scan_due) or its
// next_scan_due is on/before the as-of date.
export function isDue(nextScanDue, asOf) {
  if (!nextScanDue) return true;
  return String(nextScanDue) <= String(asOf);
}
