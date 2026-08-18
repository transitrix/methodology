---
title: Governance — who may change what, and what gates it
status: active
last_reviewed: 2026-08-18
audience: public
license: MIT
tags: [transitrix, methodology, governance, agents]
---

# Governance

> Who may change what, what gates a change, and what an autonomous agent may do unattended. The mechanisms this doctrine draws on are specified in full elsewhere in `method/`; this section states the doctrine once so no source file has to restate it.

## 1. Every change is observable, reviewable, and reversible

Working with a Transitrix repository is structurally identical to working with a software codebase ([`05-working-the-model.md`](05-working-the-model.md) §1): create, describe, validate, review, publish. The implication for governance is the same regardless of which artefact changed — a model element, a decision record, a methodology-version pin: **every change to the enterprise model is observable, reviewable, and reversible. There is no shadow architecture maintained outside the repository.**

**What gates a change.** A pull request is the one path a change takes. Two gates apply, always, to every change:

1. **Validation** — the mechanical gate. A pull request that breaks the validation matrix ([`05-working-the-model.md`](05-working-the-model.md) §2) cannot be merged.
2. **Human review** — the judgement gate. A reviewer reads the change as a diff. For most artefacts this is the whole gate. For a decision record or an agent-prepared upgrade, review is sharpened into the ratification gate below, because the artefact itself asserts a choice was made, not just a fact was recorded.

## 2. Who may change what — human and agent authorship

Transitrix's default is that a human and an autonomous agent author through the same pull-request path, with one asymmetry: **an agent may propose; only a human may commit the repository to a decision.**

This asymmetry is enforced the same way across every mechanism it applies to:

| Mechanism | An agent may | Only a human may | Specified in |
|---|---|---|---|
| Decision records (ADR) | author a record at `status: proposed`, `author: agent` | flip `proposed → accepted` | [`07-decisions.md`](07-decisions.md) §2.1, §4 |
| Methodology / catalog version upgrades | prepare the bounded upgrade PR (pin bump, recipe-scoped diff, the ADR) — and, inside a class ratified in advance (§2.1), land it | ratify the accompanying ADR, or the class ahead of time | [`09-releases-and-propagation.md`](09-releases-and-propagation.md) §5 |
| Catalogue bindings (recognition, promotion) | stage a proposed binding | accept it (the one write to `canon_id`) | [`09-releases-and-propagation.md`](09-releases-and-propagation.md) §6 |

**The rule in one sentence: an agent may author a record or prepare a change; it may never self-ratify, self-accept, or self-merge it.** The worst an unattended agent can do, under every mechanism above, is leave a change no human authorised — and it cannot do that either, because a change is in force only where a human ratified it: the instance, or the class it belongs to (§2.1).

**The authorship limit is also spatial, not only temporal.** An agent may author a decision, a binding proposal, or an upgrade that is local to its own repository. It may **not** write into a central architecture repository, another project repository, or any location its own repository's agent cannot itself read — see [`07-decisions.md`](07-decisions.md) §4 ("the authorship limit — where, not just what"). The boundary is enforced structurally, by who may author where, because the crossing is defined by context (another repository's audience, confidentiality boundary, reasoning) the agent does not have and cannot reliably self-check.

### 2.1 Ratification may precede the change — the standing grant

The asymmetry above is about **who decides**, not about **when**. Read as a rule about timing it produces a false choice, and the choice is false in a way that costs something either way: either every instance of a repeating mechanical change waits for a person, or a change is in force with nothing having ratified it.

Neither is necessary, because **a repeating mechanical change is usually not a decision each time — it is the Nth execution of one decision.** Where that is true, a human ratifies the **class** ahead of time, in a **standing grant**.

A grant is a record like any other: authored by a human, accepted by a human, immutable once accepted, superseded rather than rewritten (§3). What it must name:

1. **The repository and the exact change permitted** — narrow enough that a reader can tell whether a given change is inside it without interpreting intent.
2. **The conditions that must hold on every use** — and **every one of them mechanically checkable**. See the limit below; this is the load-bearing requirement, not a quality note.
3. **The end condition** — stated when the grant is written, not left to whoever remembers to revisit it.

An agent acting inside a ratified class is **executing** a decision, not taking one. The per-instance record is therefore the run — the mechanism, its conditions, and their results — rather than a fresh decision record per instance. A record per instance would document a judgement that was not made.

**What a grant does not do — the part to read if you read nothing else here:**

- **An agent may not author a grant, widen one, or ratify one — including the one it acts under.** A grant is ratified by a human, exactly like the instance it replaces. Nothing in this section gives an agent a path to enlarging its own authority.
- **A change outside every grant in force falls back to the default:** propose, and wait. "No applicable grant" is never read as permission; it is read as the ordinary case.
- **A condition stated in prose is not a condition.** If a class boundary cannot be checked mechanically, there is no grant — this is §4 applied to grants, and it is what keeps a grant from degenerating into a blanket permission written in words the agent itself gets to interpret. A grant whose guard is missing is not a grant operating on trust; it is not in force.
- **A grant does not travel.** It is local to the repository whose maintainers ratified it, by the same reasoning as the spatial limit above. An adopter inherits the mechanism, never anyone else's grants.

**Why this is stronger than per-instance review rather than a relaxation of it.** A person ratifying a class writes the conditions down once, in a form a machine then enforces on every single use. A person ratifying each instance re-reads a diff whose sameness is precisely what makes attention lapse — and a gate that gets approved without being read is a gate in name. The grant moves the human judgement to where it is actually exercised, and leaves the repetition to the mechanism that does not tire.

## 3. Immutability and supersession

An accepted decision record's body does not change. A course change is a **new** record plus a `superseded_by` / `supersedes` pointer on the old one — never a rewrite ([`07-decisions.md`](07-decisions.md) §6). The same principle extends to a released methodology version: once tagged, it is immutable ([`notations/CONTRACT.md`](../notations/CONTRACT.md) §10.4) — a fix is a new `PATCH`, never a retroactive edit of the old tag.

Two reasons this matters beyond tidiness: a harvested index or a pinned version is only trustworthy if it means the same thing tomorrow as today, and an autonomous agent that could edit accepted history could silently rewrite it. Append-only removes both risks at once.

## 4. Enforcement is mechanical, not advisory

Every rule in §2 and §3 is enforced by a CI guard, not merely documented:

- `scripts/check-adl.mjs` mechanically rejects a body diff to an accepted decision record, and rejects an `author: agent` record introduced already `accepted` ([`07-decisions.md`](07-decisions.md) §7).
- `scripts/check-notations.mjs` gates the model-side validation matrix and the version-pin consistency ([`05-working-the-model.md`](05-working-the-model.md) §2; [`09-releases-and-propagation.md`](09-releases-and-propagation.md) §4).

A standing grant (§2.1) is held to the same standard, and it is the reason the standard is stated as strictly as it is: a grant's conditions are in force only where a guard evaluates them on every use and fails the pull request when one does not hold. A grant whose conditions no guard checks has not moved a judgement earlier — it has removed one.

A discipline that only a human is expected to remember is not a discipline this methodology relies on. Where a rule above matters enough to state as doctrine, it matters enough to have a guard that fails a pull request mechanically when broken.

## 5. The versioning and compatibility promise

Governance extends to the methodology's own releases: an adopter can trust that a `MINOR` release never breaks a previously-valid repository, and that a `MAJOR` release ships with a migration recipe. This is a governance commitment as much as a technical one — it is what lets an adopter (or an agent acting on an adopter's behalf) accept an upgrade without re-auditing the whole repository. The full policy — what each of `MAJOR` / `MINOR` / `PATCH` promises, the release-immutability rule, and the deprecation window — is defined once, in [`notations/CONTRACT.md`](../notations/CONTRACT.md) §10; this document does not restate it.

## 6. What an autonomous agent may do unattended — the summary

Drawing the threads above together, the one test that applies everywhere in this repository and in any repository following this methodology:

> **An agent may prepare, propose, stage, and open a pull request. It may land a change only inside a class a human ratified in advance, on conditions a guard checks every time. It may never ratify its own decision, author or widen the grant it acts under, or write across a repository boundary it does not own.**

The two halves are one rule, not an allowance carved out of a prohibition: **every change in force was ratified by a human** — the instance, or the class. What an agent never does is supply that ratification itself.

Everything else — what counts as "prepared," what a proposal must carry, which CI guard enforces which half of it — is mechanism, specified where the mechanism lives (§2's table). This section is what stays true regardless of which mechanism a future addition to the methodology introduces.

---

**Next:** [`09-releases-and-propagation.md`](09-releases-and-propagation.md) — how a new version reaches an adopter.

**Last reviewed:** 2026-08-18. New §2.1 — a human may ratify a bounded **class** of change in advance (a standing grant), so a repeating mechanical change need not wait for a per-instance decision that nobody is actually making. §2's table row, its closing rule and §6's summary test are amended together, since a reader who skims must not come away with a weaker guarantee than the one that holds: every change in force was ratified by a human — the instance, or the class — and an agent may never author, widen, or ratify the grant it acts under. §4 gains the condition that carries the whole idea: a grant's conditions are in force only where a guard evaluates them on every use. Prior 2026-08-16: New section, assembled from material formerly scattered across `02-team-operations.md` §3.1.1 and §6.1–§6.2, `03-architecture-decision-log.md` §6–§8, `04-methodology-update-propagation.md` §5, and `01-methodology.md` §7 (closing line), §8, and §13 — see those files' redirects. §13's inline paraphrase of the compatibility policy is replaced here by a pointer to [`notations/CONTRACT.md`](../notations/CONTRACT.md) §10, its canonical source.
**Status:** Active.
