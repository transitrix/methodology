// Normative-text normalisation for cosmetic-vs-substantive change detection
// (SKILL Step 3). Reduces a fetched source body to the text that carries obligations,
// stripping the churn a re-publication adds without changing the law: markup, scripts,
// styles, comments, volatile tracker / session ids, and whitespace. Two snapshots with
// the same normalised text differ only cosmetically.
//
// Conservative + deterministic by design: it strips MARKUP and obvious volatile tokens,
// not content. It never strips dates or numbers (an amendment often IS a date/number
// change). Binary / unknown formats return null — the caller then falls back to a pure
// byte comparison (no cosmetic detection, never a wrong "cosmetic" verdict).

import { createHash } from 'node:crypto';

const TEXTUAL = new Set(['html', 'htm', 'xhtml', 'xml', 'rss', 'atom', 'json', 'txt', 'md', 'text']);
const MARKUP = new Set(['html', 'htm', 'xhtml', 'xml', 'rss', 'atom']);

function cleanExt(ext) { return String(ext || '').toLowerCase().replace(/^\./, ''); }

// Reduce a body to its comparable normative text, or null for a non-textual format.
export function normativeText(buf, ext) {
  const e = cleanExt(ext);
  if (!TEXTUAL.has(e)) return null;
  let s = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf);

  if (MARKUP.has(e)) {
    s = s.replace(/<!--[\s\S]*?-->/g, ' ')                       // comments
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')         // script / style blocks
      .replace(/<[^>]+>/g, ' ');                                 // all remaining tags
    s = s.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#0*39;|&apos;/gi, "'");
  }

  // Strip volatile tokens a re-publication rotates: UUIDs and long hex (session / CSRF /
  // cache-buster / tracker ids). Bounded patterns so real content is untouched.
  s = s.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, ' ')
    .replace(/\b[0-9a-f]{16,}\b/gi, ' ');

  // Collapse all whitespace — indentation / wrapping / line-ending churn is cosmetic.
  return s.replace(/\s+/g, ' ').trim();
}

// sha256 of the normative text, or null when the format is not textual.
export function normativeHash(buf, ext) {
  const t = normativeText(buf, ext);
  if (t === null) return null;
  return `sha256:${createHash('sha256').update(Buffer.from(t, 'utf8')).digest('hex')}`;
}
