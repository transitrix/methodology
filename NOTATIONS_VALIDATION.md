# Notations / examples validation — audit

**Status:** tracked (was a gitignored local snapshot until 2026-05-30).
**Last full review:** 2026-05-30.
**Scope:** conformance of `notations/examples/**` and the per-notation specs in
`notations/` to the canonical contract. Excludes `0. archive/`.

This file is the **judgement half** of the front-door rot defence. The
**mechanical half** is automated: `scripts/check-notations.mjs` (run in CI by
`.github/workflows/notations-doc-lint.yml`) checks the things a script can
decide — example file extensions, `notation:` headers, internal-link
resolution, and `methodology_version` pin consistency. Keep the two disjoint:
anything a linter can verify belongs in the script, not here; anything needing
human judgement (conceptual drift, an unresolved shape decision) belongs here.

> History: the 2026-05-19/20 snapshot that used to live here (gitignored)
> flagged a list of example-drift items — flat-vs-nested FGA/Goals, the
> capability `type`/ID migration, BPMN extension/header/boolean drift, the
> `order-fulfillment`/`order-processing` duplicate. **Every one of those is now
> resolved** (verified 2026-05-30 against the files on `main`). That snapshot is
> superseded by this audit; do not act on it.

---

## 1. Mechanical conformance — clean (and now CI-guarded)

Re-verified 2026-05-30 by reading the files directly; now also enforced by the
doc-lint so it cannot silently rot:

- **BPMN examples** — all use the canonical `*.bpmn.transitrix.yaml` extension
  and carry a `notation: bpmn` header. Boolean conditions are quoted
  (`condition: "yes"`/`"no"`). No `order-processing` duplicate exists.
- **FGA / Goals** — flat shape, consistent with the strategy-chain form rule.
- **Capability-map** — every node carries `type`; IDs use canonical
  `CAPABILITY-V…` / `CAPABILITY_MAP-…` (the 2026-05-28 migration is in).
- **products / applications** — canonical `PRODUCT-…` / `APP-…` / `ROLE-…` /
  `CAPABILITY-V…` IDs throughout, no display-name-as-ID.
- **Internal links** — the doc-lint's first run surfaced 26 broken relative
  links that had silently rotted: `CONTRACT.md` dropped the `elements/` / `views/`
  path segment for `15-requirement` / `16-assertion` / `05-capability-map` /
  `10-applications`, and seven example READMEs dropped the `views/` segment (and
  one pointed at a never-created `docs/repo-layout.md`). **All repaired in the
  same change that added the lint** — links now resolve and the lint is green.
- **Example extensions, `notation:` headers, version pins** — all consistent
  (the four doc-lint checks pass on a clean checkout).

---

## 2. Open judgement items (a linter cannot decide these)

These are unresolved **decisions**, not regressions. Each needs Valerii's
direction before any file moves.

1. **Catalogue-root prefix — `elements/…` vs `canon/elements/…`.**
   `IDS_AND_REFERENCES.md` §3.1/§4 mix `elements/02_business/…` with
   `canon/elements/…` / `canon/relations/` / `canon/assertions/`;
   `CONTRACT.md` §7.1 and `notations/README.md` use `canon/elements/…`.
   Settling the root prefix and sweeping it is a canon change — not yet made.

2. **ArchiMate element IDs — prefix-IDs vs full-word TYPE-IDs.**
   `method/methodology.md` §3a historically used legacy prefix tables
   (`GOAL-`, `APP-`, `ACTR-`, …); `IDS_AND_REFERENCES.md` uses full-word TYPEs
   (`ACTOR`, `CAPABILITY-V…`). The front-door reconcile made IDS authoritative
   and pointed §3a at it, but the underlying scheme choice is unresolved.

3. **SCENARIO / ISSUE reclassification** (`ELEMENT_PRIMITIVES.md` §4.2).
   Both are tagged `view-defined` but are content, not presentation — in tension
   with the reconstruction invariant §1.1. The reclassification (content element
   + report-config view) is a family-wide shape decision; proposal filed,
   awaiting direction. Tracked as its own task.

---

## 3. Minor nits (flagged, not auto-fixed)

Surfaced but left for Valerii — examples are not edited unilaterally.

- `notations/examples/capability-map/northbay-retail.capability-map.transitrix.yaml`:
  capability `V1.2.1` (In-store Retail) has `owner_role: Director of Retail
  Operations` (a display name) where every other node uses a `ROLE-…` ID.
  One-line inconsistency, not structural drift.

- `organizations/acme_corp/NEW_ORGANIZATION_TEMPLATE.md` is stale more broadly —
  still describes the pre-zone `elements/01–04` layout and references
  `create_organization.sh`. Worth a dedicated rewrite to the
  `canon`/`field`/`codex` model rather than a one-line patch.

---

## 4. Coverage honesty

The 2026-05-30 pass verified every family that carried a substantive prior
claim (bpmn, dgca, goals, capability-map, products, applications, process-map).
The specs **not** re-walked schema-line-by-line this pass: `blocks`,
`activities`, `process-blueprint`, `activity-card`. The doc-lint covers their
mechanical invariants (extension / header / links / version) continuously; a
deeper schema re-walk of those five is the next manual audit's job.
