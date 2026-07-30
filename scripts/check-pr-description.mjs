#!/usr/bin/env node
// Disclosure policy for a pull-request description.
//
// The deterministic guards in `public-surface-hygiene` match patterns. Some of
// what must not appear in a description is not a pattern but a judgment: whether
// the text explains the maintainer's motivation, or recounts how a rule came
// about, rather than stating what changed and how it works. This step asks a
// model, over GitHub Models, and fails the check on a clear verdict.
//
// Two properties it keeps deliberately:
//
// - It is MUTE. The verdict prints a category and one sentence that does not
//   quote or paraphrase the flagged text, and the model is instructed to write
//   it that way. A gate that echoes what it caught becomes the channel it was
//   meant to close. The model's raw output is never printed.
// - It fails OPEN on infrastructure, closed on a verdict. If the endpoint is
//   unreachable, rate-limited, or unavailable (a fork PR has no models access),
//   the step warns and passes: the pattern-based guards are unaffected, so a
//   free-tier hiccup leaves the repository exactly as well defended as before,
//   and no one is pushed into deleting the check to merge. A parsed verdict of
//   `violates: true` fails the build.
//
// Escape hatch: a pull request labelled `policy:reviewed` skips the step. The
// judgment is a model's, so a false positive must never be able to hold a merge
// hostage. Deterministic rules have no such hatch and should not.
//
// The rubric below is public on purpose - it names categories, no protected
// content, and every example in it is invented. Real descriptions are not used
// as examples: an example of the thing we do not publish would itself publish
// it.

const MODEL = process.env.POLICY_MODEL || 'openai/gpt-4.1';
const ENDPOINT = process.env.POLICY_ENDPOINT || 'https://models.github.ai/inference/chat/completions';
const TOKEN = process.env.GITHUB_TOKEN || '';
const TITLE = process.env.PR_TITLE || '';
const BODY = process.env.PR_BODY || '';
const MAX_CHARS = 12000;

const RULES = `You are a disclosure gate for pull-request descriptions in a PUBLIC repository. Answer with JSON only.

FLAG a description when it contains any of:
1. Archaeology of a check, guard, audit, sweep or remediation — how many occurrences an audit found; which surface a check did not cover, and until when; that content was previously cleaned, scrubbed, redacted or rewritten for hygiene; before-and-after of a guard; that a check used to pass, was inert, or that nobody was looking; dates of past hygiene work.
2. Business or strategic motivation — market, sector, customers, adopters, prospects, vendors under evaluation, competitive positioning, sales, roadmap priority, "motivated by".
3. A statement that a leak, exposure, or sensitive content existed, was found, or was fixed.

Do NOT flag: what changed and how it works; the mechanics of the rule being enforced and the operative reason a mechanism is what it is; a test plan; file lists; ordinary project history (a file or feature moved, was retired or shipped, with a date); a stale note being corrected; a decision cited by name and date; ordinary engineering rationale (approach, trade-off, limitation, follow-up); a version bump and its cause; and what THIS change itself rewrites or removes, including how many occurrences it touches — that is the change, visible in the diff. The line to hold is between describing THIS change (allowed) and recounting what an earlier audit found or an earlier cleanup did (flag).

Output exactly: {"violates": true|false, "categories": [], "reason": "<one sentence, max 20 words, that does not quote or paraphrase the offending text>"}`;

// Invented examples only — see the header.
const SHOTS = [
  ['## Summary\nThe validator now reads the manifest too. Nothing was checking it before, and the two audits we ran earlier - one over the templates, one over the fixtures - both looked past it, which is why the older files were never corrected.',
   '{"violates": true, "categories": [1], "reason": "Recounts what earlier audits covered and missed."}'],
  ['Adds the naming check to this package. The tree is already clean, so this is prevention.\n\nWhy the stricter form: of the 40-odd names the last review looked at, none needed the long spelling.',
   '{"violates": true, "categories": [1], "reason": "Cites counts produced by an earlier review."}'],
  ['Adds the widget validator so the parser stops accepting a manifest without a root key.\n\nMotivated by a prospect in the widget sector weighing a commercial licence - landing this unblocks the deal.',
   '{"violates": true, "categories": [2], "reason": "States business motivation and competitive positioning."}'],
  ['Adds the schema validator. A document whose root key is missing is rejected, and only the path is reported.\n\nTest plan: valid document passes, missing root fails, malformed YAML fails.',
   '{"violates": false, "categories": [], "reason": "States the rule and its test plan only."}'],
  ['Fixes a stale note in the ignore file: the starter templates live in the separate templates repository now, retired from a local directory here on 2026-07-28. Comment only.',
   '{"violates": false, "categories": [], "reason": "Ordinary project history describing the change itself."}'],
  ['Six occurrences rewritten to the neutral form. Text only - two docs and a test docstring. No behaviour change.',
   '{"violates": false, "categories": [], "reason": "Describes only what this change rewrites."}'],
];

function warn(msg) {
  console.log(`::warning::pr-description-policy: ${msg}`);
}

function buildMessages() {
  const messages = [{ role: 'system', content: RULES }];
  for (const [user, assistant] of SHOTS) {
    messages.push({ role: 'user', content: user });
    messages.push({ role: 'assistant', content: assistant });
  }
  const target = `TITLE: ${TITLE}\n\nBODY:\n${BODY}`.slice(0, MAX_CHARS);
  messages.push({ role: 'user', content: target });
  return messages;
}

function parseVerdict(text) {
  const stripped = String(text ?? '')
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  let parsed;
  try {
    parsed = JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof parsed.violates !== 'boolean') return null;
  return parsed;
}

async function main() {
  if (!TITLE.trim() && !BODY.trim()) {
    console.log('pr-description-policy: no title or body to read - skipping.');
    return 0;
  }
  if (!TOKEN) {
    warn('no token available (a fork pull request has no models access) - skipping.');
    return 0;
  }

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 160,
        messages: buildMessages(),
      }),
    });
  } catch (err) {
    warn(`the endpoint could not be reached (${err.name}) - skipping.`);
    return 0;
  }

  if (!response.ok) {
    warn(`the endpoint returned HTTP ${response.status} - skipping. The pattern-based checks are unaffected.`);
    return 0;
  }

  let verdict = null;
  try {
    const payload = await response.json();
    verdict = parseVerdict(payload?.choices?.[0]?.message?.content);
  } catch {
    verdict = null;
  }

  // Never print the model's raw output: it may restate the text being judged.
  if (!verdict) {
    warn('the verdict could not be read - skipping. The pattern-based checks are unaffected.');
    return 0;
  }

  if (!verdict.violates) {
    console.log('OK - the description states the change, not its motivation.');
    return 0;
  }

  const cats = Array.isArray(verdict.categories) && verdict.categories.length
    ? verdict.categories.join(', ')
    : 'unspecified';
  const reason = String(verdict.reason || '').slice(0, 160);
  console.log(`::error::pr-description-policy: this description carries content the repository does not publish (category ${cats}). ${reason}`);
  console.log('Rewrite the description to state what changed and how it works, and nothing about why it was wanted or how the rule came about. If this is wrong, label the pull request `policy:reviewed` and it will be skipped.');
  return 1;
}

main().then((code) => process.exit(code));
