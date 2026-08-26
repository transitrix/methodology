# Transitrix Alone

**Pattern type:** standalone  
**Complexity:** minimal

---

## Problem

Architecture knowledge is scattered across slide decks, wikis, and individuals. There is no single model, no shared vocabulary, and no review process for architectural change. Teams debate from separate mental models rather than from a shared, authoritative artefact.

## Solution

One Transitrix repository holds everything: goals, drivers, capabilities, processes, relations, and compliance artefacts as typed YAML files. Diagrams are derived on save — there is no separate diagramming tool. Every change is a pull request; code review is architecture review.

## Structure

```
┌────────────────────────────────────────────┐
│              Transitrix repo               │
│                                            │
│  transitrix.yaml   manifest, version pin   │
│  canon/elements/   validated elements      │
│  views/      derived diagrams        │
│  canon/relations/  first-class relations   │
│  field/            raw source material     │
│  codex/            laws and policies       │
│  operations/       ADRs and work items     │
└────────────────────────────────────────────┘
```

Three canonical zones keep content cleanly separated:

- **`canon/`** — the validated model. Elements here are reviewed and stable. Downstream consumers read only this zone.
- **`field/`** — raw source material: interview notes, meeting summaries, observations. Not yet validated; never cited directly from views.
- **`codex/`** — external laws and internal policies. Read into the model; not produced by it.

The `operations/` layer (not a zone) holds the team's ADRs and work items — the governance record of why canon looks the way it does.

`transitrix.yaml` pins the methodology version and declares which notations the repo uses.

## When to use

- Greenfield organisation with no existing architecture knowledge management practice.
- Small or single-domain team: one squad, one business unit, one platform.
- Pilot: validating the value of a structured model before expanding scope.
- Any scenario where all authors have direct access to the repo and raw material volume is low enough to go straight into canon.

## How to start with Transitrix

1. **Scaffold the repo.** Run `/transitrix:onboard` in a Claude Code session with the methodology plugin, or copy `organizations/acme_corp/` as a reference. This creates the `canon/`, `field/`, `codex/`, and `operations/` layout.
2. **Pin the methodology version.** Set `methodology_version` in `transitrix.yaml` to the current release. This is the version all CI validators check against.
3. **Author your first Goals tree.** A Goals view (`*.goals.transitrix.yaml`) in `views/` anchors the model. Goals require no other elements to be in place and force the first alignment conversation.
4. **Add elements top-down.** Goals → Drivers → Capabilities → Processes. Each layer elaborates the one above. Copy templates from `.templates/elements/` for each type.
5. **Run the linter before every PR.** `python3 .validators/lint.py` catches YAML syntax errors, broken cross-references, and missing required fields. Fix all errors before requesting review.
6. **Establish the ADR convention.** Create `operations/decisions/ADR-<today's-date>-initial-scope.md` to record the scope and purpose of this Transitrix deployment.
