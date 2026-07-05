# Personal Memory

**Pattern type:** dual-layer  
**Complexity:** minimal  
**System-agnostic counterpart:** Enterprise Memory pattern  
**Composes with:** [Enterprise Memory](enterprise-memory.md) (org scale)

---

## Problem

A consultant, researcher, or knowledge worker accumulates context across projects, clients, and decisions — but that context lives in disconnected notes, browser tabs, and fading recollections. When returning to a topic weeks later, or handing off to an AI agent for help, reconstruction starts from scratch. The value of prior work decays instead of compounding.

## Solution

A single Transitrix repository is a personal memory store. Two kinds of memory live together, structured and version-controlled:

- **Semantic memory** — the stable model of your world: goals you are pursuing, capabilities you have or are building, contacts and organisations you engage with. Carried by `DRIVER`, `GOAL`, `CAPABILITY`, `ACTOR`, and `ROLE` elements in `canon/`.
- **Episodic memory** — the record of what happened: decisions made, events attended, observations captured. Carried by ADR records in `operations/decisions/` and field artefacts in `field/` with OKF provenance.

Because the memory is structured YAML with typed elements and named links, it is queryable by humans (search, grep) and by AI agents without any additional infrastructure. Point an agent at the repo; it reads your semantic model and episodic record directly.

## Structure

```
┌────────────────────────────────────────────┐
│            Personal Memory repo            │
│                                            │
│  transitrix.yaml   manifest, version pin   │
│                                            │
│  canon/elements/   semantic layer          │
│    goals           what you are pursuing   │
│    contacts        people and orgs         │
│    projects        ongoing work            │
│    capabilities    what you can do         │
│                                            │
│  operations/decisions/  episodic layer     │
│    ADRs — the decision log                 │
│                                            │
│  field/            episodic layer          │
│    notes, observations, meeting outputs    │
└────────────────────────────────────────────┘
```

No curation pipeline, no promotion gate, no separate knowledge repo. All memory grows in one place.

## Memory kinds in Transitrix notation

| Memory kind | What it captures | Transitrix carrier |
|---|---|---|
| Semantic — intent | Goals you are pursuing | DRIVER, GOAL, FGCA / FGA chains |
| Semantic — contacts | People and organisations | ACTOR, ROLE |
| Semantic — work | Ongoing projects and capabilities | CAPABILITY, PROJECT, PRODUCT |
| Episodic — decisions | Why you made a choice | ADRs in `operations/decisions/` |
| Episodic — observations | Notes, meeting outputs, field findings | `field/` artefacts with OKF frontmatter |
| Episodic — change events | Events that shifted context | CHANGE, AMENDMENT elements |

## When to use

- Individual consultants, analysts, or researchers building a durable personal knowledge base.
- Any person who wants a single place — queryable by themselves and by AI agents — for goals, contacts, and the decisions behind them.
- Early adopters starting solo before expanding Transitrix to a team.
- Knowledge workers who find note tools (Obsidian, Notion, Logseq) lack the structured, typed model a Transitrix repo provides.

**Upgrade path:** when the repo grows to cover an entire organisation and raw material volume exceeds direct review capacity, add the [Knowledge Store](knowledge-store.md) pattern. The repo structure does not change — `canon/` stays the centre.

**Org-scale counterpart:** see [Enterprise Memory](enterprise-memory.md) for the multi-project, EA-governed deployment.

## How to start

1. **Scaffold the repo.** Run `/transitrix:onboard` in a Claude Code session with the methodology plugin, or copy `organizations/acme_corp/` as a reference. The standard layout — `canon/`, `field/`, `operations/` — is your personal memory structure. No extra configuration.
2. **Pin the methodology version.** Set `methodology_version` in `transitrix.yaml` to the current release.
3. **Author your first Goals tree.** One `*.goals.transitrix.yaml` file in `canon/views/` seeds the semantic layer. Write three to five goals; goals require nothing else to be in place.
4. **Add your first contacts.** An `ACTOR` element per person or organisation you engage with regularly. Link them from goals and projects as you add those.
5. **Capture the first episodic entries.** Write an ADR (`operations/decisions/0001-initial-scope.md`) explaining why you started this repo. Every significant personal or professional decision that belongs in the record gets an ADR here.
6. **Put new observations in `field/`.** Meeting notes, research summaries, interview outputs — anything not yet ready for the semantic canon goes in `field/`. If you run a curation step later, these are the inputs.
7. **Wire an AI agent.** Point a Claude Code session at the repo as context. The structured YAML and named ADRs are dense, machine-readable memory. The agent reads your goals, knows your contacts, and checks prior decisions — without you reconstructing context each call.

## OKF frontmatter for field artefacts

Field artefacts use the same OKF frontmatter conventions as the [Enterprise Memory](enterprise-memory.md) pattern — no new fields:

| Field | Required | Notes |
|---|---|---|
| `type:` | **yes** | e.g. `observation`, `note`, `finding`, `source-document` |
| `title:` | recommended | Display name |
| `description:` | recommended | Single-sentence summary |
| `source:` | Transitrix extension | Originating document or meeting |
| `created_at:` | Transitrix extension | Date captured |
| `confidence:` | Transitrix extension | `observed` / `inferred` / `assumed` |
| `timestamp:` | recommended | ISO 8601 datetime of last modification |
