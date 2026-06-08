// `update-scan` — write the codex `scan` block (14-codex.md §3.5) after a run.
// Operating state only: it touches the `scan:` block and NOTHING else on the codex
// artefact (the rest is content owned by the codex admission gate). The block is
// replaced in place when present, or appended when this is the first scan.

import { readFile, writeFile } from 'node:fs/promises';
import { readTopScalar, readBlockScalars } from './yaml.mjs';
import { addFrequency, FREQUENCIES } from './schedule.mjs';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

// Render the scan block exactly in the canonical shape (dates quoted, frequency +
// booleans bare, change_description null or quoted) — 14-codex.md §3.5.
function renderScanBlock({ today, nextDue, frequency, changeDetected, changeDescription, reviewNeeded }) {
  const desc = changeDescription ? JSON.stringify(String(changeDescription)) : 'null';
  return [
    'scan:',
    `  last_scanned_at: "${today}"`,
    `  next_scan_due: "${nextDue}"`,
    `  scan_frequency: ${frequency}`,
    `  change_detected: ${changeDetected ? 'true' : 'false'}`,
    `  change_description: ${desc}`,
    `  review_needed: ${reviewNeeded ? 'true' : 'false'}`,
  ].join('\n');
}

// Replace the existing top-level `scan:` block (the line + its indented children) with
// `blockText`, or append it when absent. Preserves every other line verbatim.
function spliceScanBlock(text, blockText) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^scan:[ \t]*(#.*)?$/.test(l));
  if (start < 0) {
    const body = text.replace(/\s*$/, '');
    return `${body}\n${blockText}\n`;
  }
  let end = start + 1;
  for (; end < lines.length; end++) if (/^\S/.test(lines[end])) break;
  const out = [...lines.slice(0, start), ...blockText.split('\n'), ...lines.slice(end)];
  return out.join('\n').replace(/\s*$/, '') + '\n';
}

// Update (or create) the scan block on a codex artefact file. `today` is YYYY-MM-DD;
// `frequency` overrides the existing cadence (required when there is no scan block yet).
export async function updateScan(file, { today, frequency, changeDescription = null, reviewNeeded = false } = {}) {
  if (!ISO_RE.test(today || '')) throw new Error('--today must be YYYY-MM-DD');
  const text = await readFile(file, 'utf8');

  if (readTopScalar(text, 'monitoring_needed') !== true) {
    throw new Error(`${file}: scan block is only valid on a monitoring_needed: true artefact (14-codex.md §3.5)`);
  }

  const existing = readBlockScalars(text, 'scan') || {};
  const freq = frequency || existing.scan_frequency;
  if (!freq) throw new Error('scan_frequency is required: no scan block on this artefact yet — pass --frequency daily|weekly|monthly|quarterly');
  if (!FREQUENCIES.has(freq)) throw new Error(`--frequency must be one of ${[...FREQUENCIES].join('|')} (got ${JSON.stringify(freq)})`);

  const scan = {
    today,
    nextDue: addFrequency(today, freq),
    frequency: freq,
    changeDetected: !!changeDescription,
    changeDescription,
    reviewNeeded: !!reviewNeeded,
  };
  const updated = spliceScanBlock(text, renderScanBlock(scan));
  await writeFile(file, updated, 'utf8');
  return {
    file,
    scan: {
      last_scanned_at: today,
      next_scan_due: scan.nextDue,
      scan_frequency: freq,
      change_detected: scan.changeDetected,
      change_description: changeDescription,
      review_needed: scan.reviewNeeded,
    },
  };
}
