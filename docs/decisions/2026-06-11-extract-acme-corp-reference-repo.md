---
status: accepted
date: 2026-06-11
scope: repo
supersedes: none
superseded_by: none
tags: [acme-corp, worked-example, reference-repo, demo, deduplication, fixtures, adopter, tooling]
---

# Extract `acme_corp` into a standalone reference + demo repo (`transitrix/acme-corp`)

## Context

The worked-example adopter org `acme_corp` is currently **duplicated three ways**:

1. **`methodology/organizations/acme_corp/`** — the canonical worked example (≈159 files).
   The onboarding front door ([`2026-06-11-onboarding-entry-front-door.md`](2026-06-11-onboarding-entry-front-door.md))
   links README → this tree; the validator ships under it.
2. **`transitrix-studio/organizations/acme_corp/`** — a hand-maintained **mirror** (the
   `chore/organizations-acme-corp-mirror` branch).
3. **`transitrix-studio/tests/fixtures/notation-corpus/`** (`requirement/`, `assertion/`, …) —
   a second mirror: the `@transitrix/diagrams` **conformance** unit tests load it and the test
   header states it is "mirrored from the acme_corp worked examples; pins the #84 acceptance".

Separately, **`methodology/notations/examples/`** is a *different* corpus — minimal per-notation
spec examples (guarded by `check-notations.mjs`). It is **not** part of this extraction and stays
in methodology.

Two needs drive the change: (a) kill the drift-prone triplication; (b) Valerii wants `acme_corp`
to be a **product-demonstration artefact** — a coherent worked **success story** (a named demo
scenario with narrative), not a folder of disconnected diagrams.

## Decision

Move `acme_corp` out of methodology into a new repo **`transitrix/acme-corp`**, the single source
for every consumer.

1. **A real reference *adopter* repo.** It is itself a Transitrix adopter: pins `methodology_version`
   in `transitrix.yaml`, runs the architecture-validation CI gate, carries `AGENTS.md` — the most
   honest demonstration that the methodology works as a standalone repo, not only as a subfolder.
   Stays **fictional and data-free** (no real client; the prior client-flavoured demo was already
   anonymised).
2. **Doubles as the product demo.** Beyond the bare adopter shape it carries a **named demo
   scenario + narrative** — the success story the product shows. The narrative is **public-facing**,
   so its voice/positioning is owned by the strategy/comms layer (STYLE_GUIDE §3, no retired terms,
   no client names) — **not** a Win-Claude solo authoring call.
3. **methodology** removes `organizations/acme_corp/`, leaving a short pointer/README; the front-door
   README + onboarding `SKILL.md` re-point to the new repo. Coordinate with the onboarding front door
   and with [`2026-06-11-validation-two-axis-model.md`] follow-up #202 (the validator's canonical
   source path) so the Skill fetches the validator from a canonical methodology path, not from the
   example.
4. **transitrix-studio** drops `organizations/acme_corp/`; the **conformance** corpus
   (`tests/fixtures/notation-corpus/`) **consumes the new repo, pinned** (so conformance tracks the
   canonical worked example and can't silently drift). Any *purely synthetic, minimal* unit fixtures
   (edge-case inputs not derived from `acme_corp`) **stay local** in studio — test locality matters;
   only the conformance corpus tracks the external source.

### Consumption mechanism (open sub-decision — recommendation)

Both downstream consumers pin a **released version** of `transitrix/acme-corp`. Recommended: a
**git submodule pinned to a tag** (reproducible, explicit bump) or a CI sparse-checkout of a pinned
ref. Avoid floating `main`. Final choice recorded as a follow-up before T3.

## Alternatives considered

- **Single source in methodology; studio consumes (no new repo).** Lower surface, was the
  DRY-optimal option — **rejected** because it doesn't give the standalone public **reference
  adopter repo** / demo artefact Valerii wants, and doesn't dovetail with the ADL distribution
  story (#200) or the tooling-extraction direction (IG-7).
- **Keep mirrors + a drift-guard CI.** Cheapest — rejected: leaves the triplication in place.
- **Chosen: standalone `transitrix/acme-corp`** (Valerii, 2026-06-11) — single source + real adopter
  + product demo, at the cost of one new repo (its own CI / agent / version pin).

## Consequences

- **New repo = new family member.** Needs its own `CLAUDE.md`, CI, and (optionally) a per-repo agent.
  Creating the repo is **Valerii's gate** (outside Win-Claude's existing writable areas).
- **Public-facing demo surface.** The success-story narrative is a comms/positioning surface — file a
  hub heads-up so the strategy/comms layer shapes the story to canon voice. The structural extraction
  itself is within-family (methodology ↔ studio) and stays a local ADR; only the narrative/voice
  aspect touches comms canon.
- **Cross-repo reach.** Spans methodology (owner→pointer) + transitrix-studio (drop mirror, consume)
  + the new repo. A referencing ADR drops in `transitrix-studio/docs/decisions/`.
- **Sequencing (separate PRs, each Valerii-gated):**
  1. **T0 (gate):** Valerii creates `transitrix/acme-corp`.
  2. **T1:** seed it from `methodology/organizations/acme_corp` **preserving history** (subtree split /
     `git filter-repo`); add `transitrix.yaml` pin + the architecture-validate CI + `AGENTS.md`;
     scaffold the named demo scenario shell.
  3. **T2:** methodology removes `organizations/acme_corp/` (leave pointer), re-points the front-door
     README + onboarding `SKILL.md`; align with #196 / #202.
  4. **T3:** studio drops its org mirror; the conformance corpus consumes the pinned new repo; synthetic
     unit fixtures stay local; referencing ADR added.
  5. **Comms:** strategy/comms layer authors / voice-checks the success-story narrative.
- `methodology/notations/examples/` is untouched (distinct corpus).
- **No interim drift window:** keep the studio mirror working until T3's consume path is green; remove
  it only once tests pass against the pinned external corpus.
