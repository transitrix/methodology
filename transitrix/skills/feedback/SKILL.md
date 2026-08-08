---
name: Transitrix Feedback
description: Author an upstream methodology-directed finding as a gated, anonymised entry in the repo's own operations/feedback.md register — the input door to the upstream feedback channel method/02-team-operations.md §3.3 specifies but ships no workflow for. Routes non-methodology observations away first, runs an interview, composes and shows the scrubbed wording for confirmation before writing, allocates the next FB-NNNN, and (on request only) renders a ready-to-send message for hello@transitrix.com without ever transmitting it itself.
when_to_use: User says "log this as feedback for the methodology", "this is a gap in the notation, write it up", "raise a finding upstream", "update FB-0002 to triaged", "what feedback have we filed", or an agent operating under FINDINGS.md's propose → route → scrub protocol resolves an incidental finding's routing to escalate-methodology and needs to write the resulting entry.
min_version: "2.1.0"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Transitrix Feedback Skill

Turns "the methodology can't express X" (or "the tooling made Y harder than it should
be") into a scrubbed, committed entry in the repo's own
[`operations/feedback.md`](../../../method/02-team-operations.md) register — without
the user hand-writing the front-matter-free block, allocating the `FB-NNNN` id, or
remembering the anonymisation discipline themselves. This is the **entry point** to
the upstream feedback channel
[`method/02-team-operations.md`](../../../method/02-team-operations.md) §3.3
specifies but ships no workflow for.

This directory is the **`feedback` skill** within the `transitrix` plugin (the plugin
root is [`transitrix/`](../../), which carries the shared
[`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) manifest, one
`skills/<name>/` directory per skill). Invoked as `/transitrix:feedback`. Written for
any coding agent that can read/write files and run shell commands, not only Claude
Code — same portability discipline as the `adr` skill
([`transitrix/skills/adr`](../adr/)) — check its structure before changing this one.

Mechanism this skill sequences (read before or during first use):
[`method/02-team-operations.md`](../../../method/02-team-operations.md) §3.3 (the
Feedback Record shape, its `id`/`type`/`status`/`upstream` fields) and the repo's own
`FINDINGS.md` (the propose → route → scrub protocol this skill is the tail end of).
This `SKILL.md` does not restate the mechanism — it sequences it.

---

## The three invariants this skill enforces

1. **Route first — a data or model problem is never written here.** A problem with
   the modelled enterprise (wrong owner, stale relation, canon disagreeing with its
   source) is an `ASSESSMENT` in canon or a `WI`, never a Feedback Record
   (`method/02` §1's hard distinction). This skill rejects that shape and says where
   it belongs instead of writing it. See Step 1.
2. **Scrub gate — mandatory, before writing, every time.** This skill composes the
   anonymised wording itself and shows the **exact text** it is about to write for
   confirmation. It refuses to write an entry carrying a canonical-grammar element ID,
   a `canon/`/`field/` path, or organisation-identifying detail — this is a hard
   refusal, not a suggestion the user can wave through. See Step 3.
3. **No network, ever, from this skill.** Writing an entry is a local commit to the
   adopter's own repo (Step 5, PR — same as `adr`). Exporting an entry (Step 7) only
   renders text for the user to paste into an email themselves — it never sends,
   never opens an issue or PR on any other repo, and never calls a network endpoint.
   The worst this skill can do unattended is leave a `proposed`-shaped local entry
   sitting in a PR.

---

## Step 0 — Locate (or scaffold) `operations/feedback.md`

- **Already scaffolded** — most repos onboarded at methodology ≥ 2.1.0 already have
  `operations/feedback.md` (the `onboard` skill writes it unconditionally, empty,
  alongside the other root files). Use it as-is.
- **Missing** — a repo onboarded before the Feedback Record convention shipped, or one
  that hand-rolled its `operations/` folder, may not have it yet. Scaffold it now,
  at exactly this path, with exactly this shape (matching what `onboard` would have
  written, so the file is identical regardless of which path created it):

  ```markdown
  # Feedback register

  Methodology-directed findings raised from this repo — see
  [`method/02-team-operations.md`](https://github.com/transitrix/methodology/blob/main/method/02-team-operations.md)
  §3.3. Sending an entry on to the project is opt-in and manual — see this repo's
  `CONTRIBUTING.md` (or `hello@transitrix.com` directly).

  ## Register
  ```

  No entries yet — the first `FB-0001` is added the first time a finding is actually
  raised (Step 4), not at scaffold time.
- **Never** create a second, parallel file (`FEEDBACK.md`, `docs/feedback.md`,
  a per-entry folder) — `operations/feedback.md` is the single, canonical location
  (`method/02` §3.3: "not one-file-per-record like ADR/WI").

---

## Step 1 — Route: is this actually a methodology-directed finding?

Ask what was observed, then classify before doing anything else:

- **A problem with the modelled enterprise or its data** ("this capability's owner
  looks wrong", "canon disagrees with the source doc", "we should model this
  differently given our own data") → **not** feedback. This is an `ASSESSMENT` written
  into canon, or a `WI` if it's a piece of work to queue. Tell the user which, and
  stop — do not write a Feedback Record for it (`method/02` §1; `FINDINGS.md` §2's
  `apply` / `escalate-owner` routes).
- **A limitation in the notation, schema, tooling, or documentation itself** — the
  methodology cannot express something needed, a skill/validator/CLI command made the
  task harder than it should have been, a spec is silent or wrong, or canon is valid
  but the methodology could guide adopters toward a better shape → **is** feedback.
  Continue to Step 2.

If genuinely ambiguous, ask the user directly rather than guessing — writing a data
problem into the anonymised register loses the very model detail (element IDs, the
organisation's own judgement about ownership) that an `ASSESSMENT` or `WI` needs to
keep, and the scrub gate (Step 3) would refuse to carry that detail anyway.

---

## Step 2 — Interview

Extract, conversationally, in this order:

1. **Observation** — what was seen, in plain language.
2. **`methodology_version`** — read `transitrix.yaml`'s pinned version in this repo;
   confirm with the user if it looks stale. **Required** — a finding is always raised
   against a specific version (`method/02` §3.3).
3. **`type`** — one of `notation-gap` | `tooling-friction` | `doc-gap` |
   `model-suggestion` (`method/02` §6.4). If the user isn't sure which, ask what kind
   of limitation it was — "couldn't model something" (`notation-gap`), "the skill/CLI
   made this harder than it should be" (`tooling-friction`), "the docs didn't say" or
   said something wrong (`doc-gap`), "this works but could be guided better"
   (`model-suggestion`).
4. **`raised_by`** — the role that raised it: `Ingest` | `Modeler` | `Analyst` |
   `Validator` (if this skill is being invoked as the tail end of `FINDINGS.md`'s
   protocol from one of those roles), or ask the user directly if invoked standalone.
5. **`proposed`** (optional) — what the team believes the fix would be.

State your understanding back before composing the entry — the scrub gate in Step 3
is a hard gate on the *wording*, not on whether you understood the observation
correctly.

---

## Step 3 — Scrub gate (mandatory, every time)

1. Compose the anonymised `observation` (and `proposed`, if given) yourself: a
   *generic limitation only* — strip every adopter specific. Same discipline
   `FINDINGS.md` §2 step 3 already states, applied at the moment of writing.
2. **Show the user the exact text** you are about to write — the full entry block,
   verbatim, not a paraphrase — and ask for confirmation before proceeding.
3. **Refuse to write** (state why, then return to Step 2 to rephrase) if the composed
   text contains any of:
   - a token matching the canonical ID grammar, `<TYPE>-[<middle>-]<INTEGER>`
     (`notations/IDS_AND_REFERENCES.md` §1) — e.g. `GOAL-RETENTION-12`,
     `CAPABILITY-ORDER_FULFIL-3` — this is an element ID, not a generic description;
   - a path under `canon/`, `field/`, or `codex/`;
   - an organisation name, a real person's name, or any other organisation-identifying
     detail (the same real-names / "publish pattern, not client instance" rule applied
     elsewhere in the methodology).
4. This is a hard refusal, not a warning the user can override — if the observation
   cannot be stated without one of the above, ask the user to rephrase it more
   generically. Loop until the text is clean or the user abandons the entry.

**Worked negative example** — an observation stated as *"our `CAPABILITY-ORDER_FULFIL-3`
element has no relation kind to link it to `GOAL-RETENTION-12` at Acme Corp"* is
refused on all three grounds (two element IDs, one organisation name) and rewritten,
with the user, as *"no relation kind connects a CAPABILITY element to a GOAL
element"* — which passes.

---

## Step 4 — Allocate `FB-NNNN`, write the entry

1. Read `operations/feedback.md`; find every `FB-NNNN` already present (checklist
   lines and/or `###` headings) and take the highest `NNNN`. The next id is that
   value + 1, zero-padded to four digits — `FB-0001` if the register is still empty.
2. Append **one checklist line** at the bottom of the `## Register` section:

   ```markdown
   - [ ] FB-0003 — <short summary, plain language, ≤ ~12 words> — open
   ```

   Leave the checkbox unchecked — it only becomes `[x]` when `status` reaches
   `closed` or `wont-fix` (`method/02` §3.3, §6.5).
3. Append **one detail block** below the register, in append order (oldest first,
   matching the checklist order):

   ```markdown
   ---
   ### FB-0003
   type: notation-gap
   methodology_version: "3.3.0"
   raised_by: Modeler
   date: "2026-07-28"
   status: open
   upstream: not-sent
   observation: <the scrubbed text confirmed in Step 3>
   proposed: <optional — omit the line entirely if none was given>
   ```

   `date` is today; `status` starts `open`; `upstream` starts `not-sent` — this skill
   never writes an entry pre-marked `sent-upstream` or `answered`, since neither has
   happened yet by definition of a freshly-authored entry.
4. Never renumber or reuse an id, even if an earlier entry was later marked
   `wont-fix` or `closed` — the sequence is monotonic within the file (`method/02` §5).

---

## Step 5 — Update status on a later invocation

Triggered by "update FB-0002 to triaged", "mark FB-0001 sent-upstream", "FB-0004 got
an answer", or similar, instead of a fresh observation:

1. Locate the `### FB-NNNN` block and its matching checklist line.
2. Update `status:` to the new value (`open` → `triaged` → `resolved-locally` /
   `sent-upstream` → `answered` → `closed` / `wont-fix`, per `method/02` §6.5 — these
   are not required to be strictly linear; `triaged` may resolve straight to
   `resolved-locally` or `wont-fix` without ever going upstream).
3. If the status change is about actually sending the entry, also update `upstream:`
   to `sent <date>` (or `answered <date>` once a reply arrives) — a distinct field
   from `status`, per `method/02` §6.6. This skill never sets `upstream:` on its own;
   only when the user reports they actually sent (or received a reply to) the entry.
4. Update the checklist line's trailing status text to match, and flip its checkbox
   to `[x]` only when the new `status` is `closed` or `wont-fix` — every other status
   keeps the checkbox open.
5. Never edit `observation`, `proposed`, `type`, `methodology_version`, or the id
   itself on a status-update invocation — those are fixed at authoring time; only
   `status` and `upstream` (and the checklist line's mirrored text) change later.

---

## Step 6 — Land the change: PR, not merge

1. Branch: `feedback/FB-NNNN` (or `feedback/update-FB-NNNN` for a Step 5 status-only
   change).
2. Commit only the `operations/feedback.md` change (and, on Step 0's first-ever
   scaffold, that addition, called out explicitly rather than buried silently in the
   same diff).
3. Open a PR. **Never merge it** — same discipline as every other skill in this
   plugin; a human accepts the change to their own repo's operations state.
4. `operations/feedback.md` carries no CI gate (`method/02` §4–§5: outside the ID
   grammar, outside `scripts/check-notations.mjs`) — there is no validator script to
   run before committing, unlike the `adr` skill's `check-adl.mjs` step. Correctness
   here rests entirely on Steps 3–4 of this skill.

---

## Step 7 — Export on request only

Only when the user explicitly asks to send an entry upstream (never automatically,
never as part of Steps 4–6):

1. Render the entry's `type`, `methodology_version`, `observation`, and `proposed`
   (if present) as **plain text**, addressed to `hello@transitrix.com` — a
   ready-to-send message, not a partial fragment the user has to reassemble.
2. State plainly that **sending it is the team's call** — this skill hands over text,
   it does not act on it.
3. Do **not**: send an email, call any network endpoint, open a PR or an issue on
   `transitrix/methodology` or any other repo, or otherwise transmit the entry
   anywhere. If the user then reports they sent it, that is a separate Step 5
   invocation to set `upstream: sent <date>` — this step never sets that field
   itself.
4. A grep of this skill's own instructions (and any script it would run) finds no
   `curl`, no SMTP call, no `gh issue create` / `gh pr create` aimed at any repo other
   than the adopter's own (Step 6), and no `WebFetch`/HTTP call that transmits
   content outward — export is text-out, nothing more.

---

## What this skill does NOT do

- Does **not** write a data problem or an enterprise-model finding as a Feedback
  Record — Step 1 routes those to `ASSESSMENT` / `WI` instead.
- Does **not** skip or soften the scrub gate — an entry carrying an element ID, a
  canon path, or organisation-identifying detail is refused, not flagged as a
  warning the user can override (Step 3).
- Does **not** send, transmit, or push an entry anywhere on its own, at any step —
  export (Step 7) only renders text; the human sends it, if they choose to at all.
- Does **not** invent a second feedback location — `operations/feedback.md` is the
  only place, per `method/02` §3.3.
- Does **not** renumber or reuse an `FB-NNNN` id, and does not edit an entry's
  `observation`/`proposed`/`type`/`methodology_version` after authoring — only
  `status`/`upstream` change on a later invocation (Step 5).
- Does **not** merge its own PR.
