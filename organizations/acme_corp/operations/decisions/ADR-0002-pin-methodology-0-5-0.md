---
id: ADR-0002
title: "Pin methodology_version to 0.5.0 for the acme_corp model"
status: proposed
date: "2026-06-11"
author: agent
source: ad-hoc
relates_to: []
superseded_by: null
---

<!--
Worked example of the ADL-extended record (method/architecture-decision-log.md §3):
`author: agent` + `source`. Authored by an agent, so it is `proposed` — a human
ratifies it (flips to `accepted`) in a separate, reviewed change. The ADL guard
(scripts/check-adl.mjs, check A3) rejects an agent record introduced as accepted.
-->

## Context

The methodology released 0.5.0. An agent reconciling the repository against the
methodology noticed `transitrix.yaml` could be brought up to the new version and
prepared this record rather than changing the pin silently. Per the ADL, a
consequential change made by an agent leaves a `proposed` decision for a human to
ratify, not an unannounced edit.

## Decision

Pin `methodology_version: "0.5.0"` in `transitrix.yaml`. (Proposed — not in force
until a maintainer ratifies this record.)

## Consequences

- Once ratified, the model is validated against 0.5.0 semantics; any migration
  notes for the bump apply (`migrations/`).
- Demonstrates the agent-authorship path: the agent proposes, a human gates. The
  acceptance is a separate commit that flips `status` to `accepted` — the body of
  this record does not change.
