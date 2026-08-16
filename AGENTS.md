# AGENTS.md — agent guide for the methodology canon repository

> This file governs an AI coding assistant working **inside this repository** — the Transitrix methodology canon itself (public, MIT, `transitrix/methodology`). If you are instead working inside an **adopter's** repository that *uses* Transitrix to model an organisation, this is the wrong file: read that repo's own `AGENTS.md` (scaffolded by `/transitrix:onboard` from [`transitrix/skills/onboard/templates/AGENTS.md`](transitrix/skills/onboard/templates/AGENTS.md)) instead. This repo has no `canon/` / `field/` / `codex/` zones of its own — it *defines* the notation those zones use.

---

## 1. What this repo is

The methodology specification, notation schemas, deployment patterns, and Claude Code skills that let any organisation model itself as text. It is documentation and tooling, not a worked model — there is no organisation being described here.

- **`notations/`** — the canonical notation specs (schemas, validation rules, ID grammar).
- **`method/`** — methodology mechanics: the change lifecycle, per-repo team operations, the multi-repo Architecture Decision Log, update propagation.
- **`patterns/`** — deployment guides ("when to use / how to start") for common adopter scenarios. Read [`patterns/index.md`](patterns/index.md) first.
- **`transitrix/skills/`** — Claude Code skills, chiefly the onboarding skill that scaffolds new adopter repos.
- **`packages/`, `tools/`, `scripts/`** — validators, CLI, and CI tooling (including doc-lint scripts run in CI).
- **`integration/`** — CI workflow templates adopters fetch at scaffold time.
- **`docs/`, `migrations/`** — supporting documentation and version-to-version migration notes.

## 2. Contribution flow

Full human-facing policy: [`CONTRIBUTING.md`](CONTRIBUTING.md) — branch naming, DCO sign-off, review expectations. The agent-relevant summary:

1. Non-trivial changes (new notation, schema change, validation rule) need an issue first; phrasing/doc fixes can go straight to a PR.
2. Branch from `main`. One concern per PR — don't bundle unrelated fixes into one commit.
3. Sign off commits (`git commit -s`) — the repo honours DCO, no CLA.
4. Open a PR; do not merge it. A maintainer reviews and merges.

## 3. Validation before committing

- **Any notation or example edit** — run `node scripts/check-notations.mjs` before committing. It checks example extensions, `notation:` headers, internal-link resolution, and `methodology_version` pin consistency.
- **Before editing an existing example or notation spec** — re-read [`NOTATIONS_AUDIT.md`](NOTATIONS_AUDIT.md) at repo root for open judgement-call decisions a linter can't make (root-prefix conventions, ID scheme questions, reclassifications still under discussion).
- **This repo's own architecture decisions** are recorded centrally by the project maintainer, not as files in this repo — the single-hub ADR decision retired the old `docs/decisions/` folder (tombstone kept for git history; see the folder's own `README.md`). This is unrelated to the `operations/decisions/` pattern this methodology *specifies* for adopters (`method/07-decisions.md`); `scripts/check-adl.mjs` explicitly excludes `docs/decisions/` from its scope for this reason. Don't conflate the two.

## 4. What NOT to do

- Do **not** commit a file named `CLAUDE.md` at the repo root — reserved for a private, gitignored coordination file; this `AGENTS.md` is the canonical guide here.
- Do **not** treat the adopter-facing templates under `transitrix/skills/onboard/templates/` as this repo's own agent guide — they describe how an *adopter* repo should behave, not this one.
- Do **not** invent new notations, TYPE prefixes, or validation codes without an issue first — see §2.
- Do **not** rewrite an example to match a spec change in isolation when the same shape question is open for a sibling notation — see `NOTATIONS_AUDIT.md` and raise a cross-notation question before diverging further.

## 5. Language and licensing

English only in code, comments, commit messages, and canonical content (translations live under `translations/<lang>/`, marked derivative). Published under the MIT license; see [`CONTRIBUTING.md`](CONTRIBUTING.md) for the DCO and authorship statement.
