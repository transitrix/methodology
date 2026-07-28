# Transitrix plugin for Claude Code

Transitrix is a text-native methodology for enterprise architecture: every artefact lives in a versioned YAML file, reviewed as a diff, and governed by a published spec. This plugin brings the methodology's operational surface into Claude Code — scaffolding adopter repositories, turning organisational documents into structured canon candidates, running a read-only repo health check, and producing reproducible compliance reports.

**Install command (once the plugin is published):**

```
/plugin install transitrix
```

**Self-hosted install (available now — the `transitrix/methodology` repository acts as a marketplace):**

```
/plugin marketplace add transitrix/methodology
/plugin install transitrix@transitrix-methodology
```

---

## Skills

| Skill | Invocation | What it does | Min methodology version |
|---|---|---|---|
| **Onboard** | `/transitrix:onboard` | Scaffolds a new adopter repository (zoned `canon/` + `field/` + `codex/` layout, assistant-neutral `AGENTS.md`, `transitrix.yaml` manifest) and walks through a first notation file | 0.5.0 |
| **Ingest** | `/transitrix:ingest` | Turns raw organisational documents — interviews, policies, org charts — into `field`-zone artefacts and typed canon candidates, then stages a human review queue | 0.6.0 |
| **Repo-check** | `/transitrix:repo-check` | Read-only health check: methodology version, coverage-profile resolution, per-TYPE element counts, and integrity flags — all data-free, safe to share externally | 0.6.0 |
| **Report** | `/transitrix:report` | Produces a reproducible compliance report (obligation × subject impact matrix or per-regime coverage metric) via a committed view-config artefact and the `cervin` CLI renderer | 0.6.0 |
| **Reg-intel** | `/transitrix:reg-intel` | Monitors regulatory sources, classifies new instruments against the organisation's obligation catalogue, and stages a review digest for human triage | 0.6.0 |
| **ADR** | `/transitrix:adr` | Runs a Context/Decision/Consequences interview and lands the result as a gated Architecture Decision Record (`operations/decisions/ADR-YYYY-MM-DD-*.md`), never self-accepting and never editing an accepted record's body | 0.6.0 |

---

## Prerequisites

- **Claude Code** — the plugin runs inside a Claude Code session.
- **An adopter repository** — a repository following the Transitrix zoned layout (`canon/` + `field/` + `codex/`). Create one with `/transitrix:onboard`, or clone the worked example at `github.com/transitrix/acme-corp`.
- **Methodology version pin** — the repository must declare its methodology version in `transitrix.yaml`. Skills check the declared version against their `min_version` field and warn if the repo is on an older release.
- **Transitrix Studio / CLI** (optional) — the `ingest` and `report` skills delegate deterministic work to `@transitrix/ingest-cli` and `cervin` respectively. Both skills run a pre-check (Step 0) and tell the user to install the CLI if it is absent; they do not hand-roll the logic.

---

## What the plugin does not do

- It does not vendor a copy of the methodology canon. When a skill needs the full spec it fetches it from `github.com/transitrix/methodology` via `WebFetch`.
- It never writes **admitted canon** directly. Admission stays a deliberate human gate (`admitted_by` field). The ingest skill emits candidates and a review queue; the human decides what to promote.
- It does not run in the background or send data to external services beyond `github.com/transitrix/methodology`.

---

## Methodology

Full specification, notation reference, and migration guides: [`github.com/transitrix/methodology`](https://github.com/transitrix/methodology).

---

## License

MIT — see [`LICENSE`](https://github.com/transitrix/methodology/blob/main/LICENSE) in the methodology repository.
