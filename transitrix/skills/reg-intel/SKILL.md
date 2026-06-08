---
name: Transitrix Reg-Intel
description: Collect regulatory-source changes in practice — the operational counterpart to the methodology's codex / SEGMENT / AMENDMENT notation work. Watches codex sources flagged `monitoring_needed: true`, runs a cheap change-signal gate before any expensive extraction, then on signal-moved runs the SCAN → SEGMENT → CLASSIFY → OUTPUT pass: fetches and snapshots the source, slices it into obligation-bearing SEGMENT field artefacts, classifies each segment as a CONSTRAINT or REQUIREMENT candidate (positive obligation → REQUIREMENT by default), emits an AMENDMENT field artefact when an existing source has drifted, updates the codex `scan` block, and stages everything in a review digest for human admission. Never writes canon. Never auto-admits. Never silently drops.
when_to_use: User says "stand up the regulatory watcher", "run the daily reg-intel scan", "scan my codex sources for amendments", "extract obligations from this regulation", "produce the reg-intel review digest", or has a codex repo with `monitoring_needed: true` sources and wants drift detection plus a draft-obligation pipeline routed through a human gate.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch
---

# Transitrix Reg-Intel Skill

The **data-collection process** for the regulatory side of a Transitrix repository: it turns watched **codex sources** (laws, regulations, policies, internal standards) into `field`-zone evidence — `SEGMENT-*` chunks of the source text, `AMENDMENT-*` records when a watched source has drifted — and into `proposed` `REQUIREMENT-*` / `CONSTRAINT-*` canon candidates, then routes everything through a human review digest. It is the operational counterpart to the methodology's codex / SEGMENT / AMENDMENT / REQUIREMENT notation work — the part that watches the registry, runs the change-signal gate, slices and classifies the text, and stages the human gate.

> **Status — design v0.** This `SKILL.md` is the agent-neutral protocol. The deterministic CLI (subcommands listed in [§ The CLI](#the-cli)) is the next increment; until it is published, the Step 0 pre-check stops cleanly and the skill defers to manual extraction rather than hand-rolling the pipeline.

The methodology is canon at `github.com/transitrix/methodology`; this skill is the agent-facing protocol for operating the regulatory-intelligence pipeline against it. It is designed to run **agent-neutrally** under Claude and GitHub Copilot — all heavy logic lives in the CLI, and this `SKILL.md` only sequences it.

---

## The two rules that govern everything

1. **Propose, never write canon.** This skill emits `field`-zone artefacts (`SEGMENT-*`, `AMENDMENT-*`) and canon *candidates* (`REQUIREMENT-*` / `CONSTRAINT-*`) in the `proposed` state, runs them through the canonical validators, and produces a review digest. It MUST NOT write into `canon/`, and it MUST NOT silently flip an existing `active` canon element. Admission to canon stays a deliberate, auditable human gate (`admitted_by`). A hallucinated obligation reaching canon unreviewed is the worst-case failure, and the whole design exists to prevent it.

2. **Cheap signal before expensive extraction.** Every scan begins with a change-signal check (`ETag`/`Last-Modified`, API "updated" / version field, or source "last amended" date). Only when the signal has actually moved does the agent fetch, snapshot, segment, and classify. The signal gate exists so the daily run is bounded — running SEGMENT and CLASSIFY against every watched source on every tick would be neither affordable nor low-noise. A source whose signal has not moved gets its `last_scanned_at` and `next_scan_due` bumped and nothing else.

---

## Step 0 — CLI-presence pre-check

The deterministic work (registry read, signal-check, fetch, snapshot, segmentation, classification, artefact emission, validator pass, digest assembly, `scan`-block update) is done by the CLI, never reimplemented in the agent. Confirm it is available:

```
npx @transitrix/reg-intel-cli --version
```

- **Present** → proceed.
- **Absent** → the CLI is not installed (or not published) in this environment. Stop and tell the user; do not hand-roll the pipeline, because hand-rolled extraction has no deterministic validator gate and risks the one rule above.

Also confirm you are operating inside a Transitrix adopter repository (a `transitrix.yaml` manifest at the repo root; see [MANIFEST](https://raw.githubusercontent.com/transitrix/methodology/main/notations/MANIFEST.md)) with at least one `codex/external/<jurisdiction>/REGULATION-*.yaml` or `codex/internal/POLICY-*.yaml` carrying `monitoring_needed: true`. If there is no repo yet, the user wants `/transitrix:onboard` first. If there are no watched codex sources, this skill has nothing to do — the user wants `/transitrix:ingest` to admit codex artefacts first.

---

## Step 1 — Read the source registry

The "source registry" is **the set of codex artefacts the repository already carries**, not a separate database. A codex artefact's `monitoring_needed`, `scan.scan_frequency`, `scan.last_scanned_at`, `scan.next_scan_due`, and (when present) the `monitor_instead[]` URLs are what the scheduler reads — exactly the operating state defined in [`14-codex.md`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/14-codex.md) §3.4–3.5. Keeping the schedule embedded in each codex YAML rather than in a sidecar database is deliberate: it makes the scan history auditable via git and lets each source carry its own cadence.

```
npx @transitrix/reg-intel-cli list-due [--as-of YYYY-MM-DD]
```

Emits the set of codex artefacts whose `scan.next_scan_due <= today` (or the supplied `--as-of` date), grouped by source. A source with `monitoring_needed: false` is skipped; its `monitor_instead[]` entries are surfaced as separate scan targets when present. The list is the daily run's input — nothing not on it gets fetched.

**One scheduled task, not N.** The acceptance criterion is one daily scheduler tick that *filters* by `next_scan_due` — not one cron entry per source. Per-source cadence is expressed by `scan_frequency` on the artefact (`daily` / `weekly` / `monthly` / `quarterly`, per [`14-codex.md`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/14-codex.md) §3.5); the scheduler is the same single job either way.

---

## Step 2 — Change-signal gate (the "whether")

Before any fetch of the full source body, the CLI runs a cheap signal check on each due artefact:

| Signal source | What the agent compares |
|---|---|
| HTTP `ETag` / `Last-Modified` response headers | last seen values, stored on the codex artefact alongside the `scan` block |
| API "updated" / version field (where the source offers a feed or JSON endpoint) | last seen value |
| Source's own "last amended" date (where the page exposes one) | last seen value |
| Hash of a known cheap-to-fetch fragment (TOC, masthead) | last seen hash |

If **no signal source is available** (a plain HTML page with no ETag, no API, no published "last amended" date), the gate degrades to "always proceed to fetch" — the absence of a signal source is recorded on the artefact so adopters can prioritise fixing it.

If the signal **has not moved**: bump `scan.last_scanned_at` to today and `scan.next_scan_due` to today + `scan_frequency`. No SEGMENT / CLASSIFY pass. No AMENDMENT. The artefact is reported in the run's "checked, unchanged" tally and dropped from the rest of the pipeline.

If the signal **has moved**: proceed to Step 3. The signal change alone is not yet an AMENDMENT — a cosmetic re-publication can move `Last-Modified` without changing any normative text. The AMENDMENT is decided in Step 5 against the snapshot diff, not against the signal.

```
npx @transitrix/reg-intel-cli check-signal <CODEX-ID> [--accept-no-signal]
```

---

## Step 3 — Fetch and snapshot (only if the signal moved)

The CLI fetches the source's `source_url` (or each entry in `monitor_instead[]` when the artefact is static and points at live counterparts) and stores a snapshot in `_intake/snapshots/`:

```
_intake/snapshots/<CODEX-ID>-<YYYY-MM-DD>.<ext>
```

Where `<ext>` follows the source format (`.pdf`, `.html`, `.json`, `.xml`). The full bytes are fingerprinted (`source_hash: sha256:<hex>` — the same convention the ingest pipeline uses for field artefacts) and the snapshot is retained for diff and provenance. If the source was previously snapshotted, the new hash is compared to the prior one: a hash match here (despite a moved signal) means the publisher re-stamped the file without changing its bytes, and the pipeline ends with a "signal moved, bytes identical" entry on the digest.

**Fetch preferences and failure handling.**

- **Prefer APIs / feeds over HTML scraping.** When a source publishes a JSON / XML / RSS feed (eCFR API, EUR-Lex CELLAR, Federal Register API, …), use it. HTML scraping is the fallback, not the default — feeds are versioned, structured, and far less prone to cosmetic-diff noise.
- **JS-capable fetch.** Some regulator portals render content via JavaScript; the CLI's fetch supports a headless-browser mode (`--render js`) for these. The mode is opt-in per artefact (recorded as `scan.fetch_mode: js` on the codex YAML) — the cost is real, so the default stays plain HTTP.
- **Source unreachable.** A fetch that fails (DNS, HTTP 5xx, timeout, captcha wall) does **not** bump `next_scan_due` — the source remains in the due set for the next tick. The failure is reported on the digest with the error reason; repeated failures (≥ 3 consecutive ticks) escalate the source on the digest as `fetch_blocked` so an adopter can intervene (proxy, source URL change, robots.txt etc.).
- **Cosmetic / sub-threshold diff.** A snapshot whose normative-text region (after stripping headers, footers, pagination, and tracker IDs) does not differ from the previous snapshot is logged as `cosmetic_change` on the digest and does **not** advance to Step 4. The signal moved; the substance did not.

```
npx @transitrix/reg-intel-cli fetch-snapshot <CODEX-ID>
```

---

## Step 4 — SEGMENT (slice the source into obligation-bearing chunks)

For each snapshot whose normative text has changed (or for a first-harvest of a source with no prior snapshot), the CLI runs segmentation. A **segment** is a self-contained passage of regulatory text that contains at least one obligation signal. Each segment becomes one `SEGMENT-*` field-zone artefact — the canonical TYPE defined in [`23-segment.md`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/23-segment.md).

Segmentation rules:

- A segment is **obligation-bearing** — contains explicit obligation language (the primary signals `must` / `shall` / `is required to` / `must not` / `shall not` / `is prohibited from`; secondary signals weighted lower with context).
- A segment is **self-contained** — can be read and understood without the surrounding paragraphs.
- A segment is **atomic** — covers one distinct obligation. If a paragraph covers three separate obligations ("must register, must list, and must label"), the CLI splits it into three SEGMENTs.
- A segment is **not** a preamble comment, a comment-and-response, or a definition-only passage with no obligation attached.

Boundaries: start at the sentence containing the obligation signal (or the section heading that introduces a normative block); end at the last sentence of the same normative thought. Numbered list items are separate SEGMENTs when each item is an independent obligation.

Each emitted SEGMENT carries:

- a canonical ID (`SEGMENT-[<middle>-]<INTEGER>`, [IDS](https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md) §1; the middle typically encodes the source slug + locator);
- `source: <CODEX-ID>` — the codex artefact this chunk was extracted from (`SEGMENT-002`);
- `locator: "<source-shaped citation>"` — `"Art.30(1)(b)"`, `"§164.312(a)(1)"`, etc.;
- `text_excerpt` (the verbatim text, when length and licensing allow) **or** `text_hash` (a `sha256:<hex>` fingerprint when storing the verbatim text is not possible) — at least one is required (`SEGMENT-003`);
- `extracted_at` and an optional `source_hash` (the whole-source fingerprint at extraction time) so a later amendment is provable against the bytes the segment derived from;
- the field-zone admission record with `zone: field`, `admission_state: proposed`, `proposed_by: reg-intel-scanner`, and `gate_checks.provenance: pending_review` (per [`23-segment.md`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/23-segment.md) §3 and the shared pre-admission lifecycle in [CONTRACT §6.1](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md)).

SEGMENTs are emitted to `_intake/processing/segments/` first; the CLI moves them to `field/segments/` only after the validator pass in Step 6. They are never auto-admitted.

```
npx @transitrix/reg-intel-cli segment <_intake/snapshots/<CODEX-ID>-<DATE>.<ext>>
```

---

## Step 5 — CLASSIFY (CONSTRAINT vs REQUIREMENT, with the default rule)

For each emitted SEGMENT, the CLI derives one canon **candidate** — a `proposed` `REQUIREMENT-*` or `CONSTRAINT-*` artefact whose `derived_from` cites the SEGMENT (and through it, the codex source). The decision tree:

```
Is the passage establishing a classification, definition, or scope boundary?
  YES → CONSTRAINT (type: DEFINITIONAL)
        Example: "IVDs are devices including when the manufacturer is a laboratory"

Is the passage a prohibition (what the org MUST NOT do)?
  YES → CONSTRAINT (type: PRODUCT or PROCESS depending on subject)
        Example: "A device may not be commercially distributed without premarket approval"

Is the passage a positive obligation (something the org MUST actively do)?
  YES → REQUIREMENT  ← the default rule
        Then: what kind of action?
          - Register / list / notify a government body  → REQUIREMENT (ORGANIZATIONAL)
          - Submit a report, file, or application       → REQUIREMENT (REPORTING / PRODUCT)
          - Establish / maintain a process or system    → REQUIREMENT (PROCESS)
          - Ensure a product has specific properties    → REQUIREMENT (PRODUCT)
          - Keep records / maintain documentation       → REQUIREMENT (DOCUMENTATION)
```

The **positive-obligation → REQUIREMENT** branch is the CLASSIFY default. Authoring guidance for CONSTRAINT vs REQUIREMENT lives in the per-notation specs ([`15-requirement.md`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/15-requirement.md)); the skill encodes that guidance as a deterministic default so the same passage classifies the same way across runs and across agents.

**Obligation level** (RFC 2119) is mapped straight from the source language: `must` / `shall` / `is required to` → `SHALL`; `should` / `is expected to` / `recommends` → `SHOULD`; `may` / `at its discretion` → `MAY`; `must not` / `shall not` / `is prohibited from` → `SHALL_NOT`.

Each candidate carries:

- a canonical ID (`REQUIREMENT-[<middle>-]<INTEGER>` or `CONSTRAINT-[<middle>-]<INTEGER>`);
- `derived_from: [<SEGMENT-ID>]` — the typed link back to the SEGMENT (and through it, to the codex source);
- `source_text` — the verbatim segment text, retained for human review;
- an `extraction_confidence` flag (`high | medium | low`) — separate from `source_quality` (see [§ Two axes of trust](#two-axes-of-trust-never-merged) below);
- the canon admission record with `admission_state: proposed`, `proposed_by: reg-intel-scanner`, and `gate_checks` left for the human to complete.

**Ambiguity is not silently resolved.** A segment that the classifier cannot confidently place is emitted with `extraction_confidence: low` and surfaced on the digest with both the CONSTRAINT and REQUIREMENT shapes flagged — the human picks. Forcing a deterministic answer on an ambiguous obligation is the path to a quietly wrong canon.

```
npx @transitrix/reg-intel-cli classify <_intake/processing/segments/>
```

---

## Step 6 — Validate (coverage-profile aware)

Every SEGMENT and every canon candidate is run through the canonical validators — ID grammar, TYPE registry, the SEGMENT / REQUIREMENT / CONSTRAINT field rules ([`SEGMENT-001..008`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/23-segment.md), the REQUIREMENT / CONSTRAINT rules in their specs), and the adopter's **coverage profile** ([COVERAGE_PROFILES](https://raw.githubusercontent.com/transitrix/methodology/main/notations/COVERAGE_PROFILES.md)).

```
npx @transitrix/reg-intel-cli validate <_intake/processing/>
```

Out-of-profile or invalid candidates are **flagged with an actionable reason** — not silently emitted, and not silently dropped. A flagged candidate is a review-digest item, not a rejection. The validator is the same `check-notations`-shaped pass the rest of the methodology uses; nothing reg-intel-specific lives in it.

---

## Step 7 — AMENDMENT (when an existing source drifted)

When the snapshot in Step 3 differs from the prior snapshot of a source that already has admitted canon obligations, the CLI emits a single `AMENDMENT-*` field artefact per detected change set, alongside any newly-extracted SEGMENTs. The canonical TYPE is defined in [`22-amendment.md`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/22-amendment.md); the AMENDMENT records the detection event, not the response.

Each emitted AMENDMENT carries:

- `source: <CODEX-ID>` — the codex artefact that was amended (`AMENDMENT-002`);
- `change_description` — a longer-form description of what moved (the editorial trail of the diff);
- `detected_at` — today; `amended_at` — the source's published amendment date, when the source exposes one;
- `segment_refs: [<SEGMENT-ID>, …]` — the SEGMENTs the amendment touched (whether newly extracted in this run or pre-existing ones whose hash changed) — the structured replacement for the legacy free-text `source_section` (`AMENDMENT-007`);
- `likely_impacted: […]` — typed IDs of canon elements (REQUIREMENT / CONSTRAINT / PROCESS / …) the diff suggests may need re-examination. **Hints, not commitments** — the authoritative impact set is whatever canon `CHANGE` / Gap elements a human authors in response, and back-links to this AMENDMENT via `motivates: [CHANGE-…]`;
- `motivates: []` — empty on first emission. A human fills it during adjudication;
- the field-zone admission record with `zone: field`, `admission_state: proposed`, `proposed_by: reg-intel-scanner`, and `gate_checks.provenance: pending_review`.

**AMENDMENT is the field-zone TYPE, not `CHANGE-*`.** Canon `CHANGE-*` is reserved for the organisation's **planned delta** (an ArchiMate Gap — what the organisation will do to close the resulting compliance gap), per [`IDS_AND_REFERENCES.md`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md) §3.1. The scanner emits the external fact (AMENDMENT); the human authors the response (canon CHANGE).

```
npx @transitrix/reg-intel-cli amendment <CODEX-ID> --since <prior-snapshot>
```

---

## Step 8 — Update the codex `scan` block

After a successful pass — whether signal-unchanged, fetch-failed, snapshot-identical, or full SEGMENT / CLASSIFY / AMENDMENT — the CLI updates the codex artefact's `scan` block ([`14-codex.md`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/14-codex.md) §3.5):

```yaml
scan:
  last_scanned_at: "<today>"
  next_scan_due: "<today + scan_frequency>"
  change_detected: <true | false>
  change_description: <one-line summary | null>
  review_needed: <true | false>
```

The `scan` block is the codex side of the detection. The structured field-zone record is the AMENDMENT (Step 7); the two are complementary. `review_needed: true` is set whenever there is anything for a human to adjudicate — a new AMENDMENT, new SEGMENTs, new candidates, or a validator flag. `review_needed: false` means the scan ran cleanly and produced nothing requiring a human.

**Do not modify any other field on the codex artefact.** The scan block is operating state; the rest of the codex YAML is content owned by the codex admission gate.

```
npx @transitrix/reg-intel-cli update-scan <CODEX-ID>
```

---

## Step 9 — Produce the review digest

```
npx @transitrix/reg-intel-cli digest [--run-id <id>]   # → review-digest.yaml
```

The digest is the human gate. For each source touched in the run, it lists:

- The signal-check outcome (`unchanged` / `moved` / `no-signal` / `fetch_failed` / `cosmetic_change`);
- The snapshot identity (`source_hash`, snapshot file path);
- Each emitted SEGMENT (ID, locator, excerpt or hash, `extraction_confidence`);
- Each emitted REQUIREMENT / CONSTRAINT candidate (ID, classification, source_text, derived_from, `extraction_confidence`, any validator / coverage flags);
- Each emitted AMENDMENT (ID, change_description, segment_refs, likely_impacted);
- The updated `scan` block, before / after;
- A summary tally (`due: N · checked: N · unchanged: N · moved: N · failed: N · proposed: SEGMENT N / REQUIREMENT N / CONSTRAINT N / AMENDMENT N`).

The digest is **read by a human**, who then either runs the canon / field admission gates to admit candidates (flipping `proposed → active`) or records rejections (`proposed → rejected` with a `rejection_reason`) — per the pre-admission lifecycle in [CONTRACT §6.1](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md). The skill **does not** flip those states itself.

---

## The run loop, end-to-end

```
list-due                             (Step 1)
   ↓
   for each due CODEX-ID:
     check-signal                    (Step 2)
        ↓ unchanged ─────────────────→ update-scan (next_scan_due bump only); add to digest tally; continue
        ↓ moved (or no-signal)
     fetch-snapshot                  (Step 3)
        ↓ failed ────────────────────→ update digest (fetch_failed); do NOT bump next_scan_due; continue
        ↓ bytes identical ───────────→ update-scan; add "signal moved, bytes identical" to digest; continue
        ↓ cosmetic_change ───────────→ update-scan; add to digest; continue
        ↓ normative text moved
     segment                         (Step 4)
        ↓
     classify                        (Step 5)
        ↓
     validate                        (Step 6)
        ↓
     amendment   (only if prior canon obligations cite this source)   (Step 7)
        ↓
     update-scan                     (Step 8)
   ↓
digest                               (Step 9)
   ↓
[ human reviews digest; admits or rejects per CONTRACT §6.1 ]
```

The whole loop is one daily scheduler tick. Per-source `scan_frequency` decides which sources land in `list-due` on any given day; the loop body is the same.

---

## Two axes of trust — never merged

- **`source_quality`** — trust in the *source*, on the codex / field artefact's admission record. A codex artefact is *authoritative by construction* and carries **no** `source_quality` (per [`14-codex.md`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/14-codex.md)). A SEGMENT / AMENDMENT extracted by a scanner reading the canonical regulator URL is typically `authoritative`; a human transcribing a press summary might be `single_source`. The closed set is `authoritative` / `corroborated` / `single_source` / `unverified` ([CONTRACT §11.2](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md)).
- **`extraction_confidence`** — "did the model read the segment and classify it correctly". A separate **review flag** on each candidate and SEGMENT. It surfaces in the digest and is **never** folded into `source_quality` and **never** persisted into canon ([CONTRACT §11.8](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md)).

Different questions, different fixes (replace the source vs. re-read the segment). The schemas keep them in separate fields; collapsing them is a defect.

---

## The CLI

All deterministic behaviour lives in **`@transitrix/reg-intel-cli`** — registry read, signal check, fetch, snapshot, segmentation, classification, validator pass, AMENDMENT emission, `scan`-block update, digest assembly. This keeps the deterministic guarantees independent of which agent drives the skill (the same principle as the methodology's CI validators and the ingest skill's CLI): neither Claude nor Copilot reimplements the logic, and both get identical results.

The CLI is resolved as a **published package** (installed / invoked via `npx`), not vendored per skill and not referenced by a sibling path — a sibling-path reference would dangle when only this skill directory ships into a Copilot `.github/skills/` install. Its subcommands are the contract above: `list-due`, `check-signal`, `fetch-snapshot`, `segment`, `classify`, `validate`, `amendment`, `update-scan`, `digest`.

`_intake/` (the operational workspace) is shared with the ingest skill — `_intake/inbox/` for raw drops, `_intake/processing/` for in-flight artefacts and candidates, `_intake/snapshots/` for source snapshots, `_intake/processed/` for completed runs. In v0 the convention is **skill-local** (documented here and in the ingest skill's [`templates/_intake.README.md`](../ingest/templates/_intake.README.md)), not yet reserved in the methodology MANIFEST/CONTRACT.

---

## Portability — Claude + GitHub Copilot

This skill is one shared `SKILL.md` in the converged **Agent Skills** format. It is auto-loaded by Claude (as `/transitrix:reg-intel`) and picked up by Copilot from `.github/skills/reg-intel/` or `~/.copilot/skills/reg-intel/`. Discipline that keeps it portable:

- All heavy logic is in the CLI, not in agent-specific tool calls.
- This `SKILL.md` is **agent-neutral** — it references the CLI and the procedure, with no Claude-only or Copilot-only assumptions.
- The skill directory is self-contained: prompts and schemas live in the bundle, never referenced from a sibling skill.

---

## Scope guards — what this skill does NOT do

- It does **not** write to `canon/`. Ever. It emits candidates and a digest; a human admits.
- It does **not** auto-flip an existing `active` canon element to `deprecated` / `retired` / `superseded`. Re-classifying an existing obligation after an amendment is a human decision; the skill surfaces the AMENDMENT and the affected canon IDs, never edits them.
- It does **not** discover new codex sources. A URL is in scope iff it is the `source_url` of an admitted codex artefact or appears in its `monitor_instead[]`. Discovering new sources is a separate human-driven harvest.
- It does **not** follow links within fetched pages to crawl outward.
- It does **not** scan sources outside the adopter's coverage profile or jurisdiction policy.
- It does **not** scan Russia-based or Russia-disinfo sources — a project-level constraint that survives source selection.
- It does **not** fold `extraction_confidence` into `source_quality`, or persist either extraction-confidence value into canon.
- It does **not** interpret legal ambiguity — an ambiguous passage gets `extraction_confidence: low` and surfaces on the digest with both classifications flagged; the human picks.
