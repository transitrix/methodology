# `prompts/` — extraction prompts (forthcoming)

The ingest skill's per-layer extraction prompts will live here. They are a **fork** of the onboarding skill's `extraction/` prompts, adapted for the ingest job:

- multi-element **and** typed-relation extraction (not single-notation authoring);
- a proposed `source_quality` on the field artefact (CONTRACT §11.2);
- an `extraction_confidence` review flag on each candidate, kept strictly separate from `source_quality`;
- **relation-conservatism** — relations emitted as candidates only above a high confidence threshold; everything else becomes a review-queue suggestion.

They are copied into this bundle (not referenced from `../onboard/extraction/`) so the skill directory stays self-contained when only `skills/ingest/` ships into a Copilot `.github/skills/` install. If a prompt must stay in lockstep with the onboarding fork, a CI check will flag divergence.

**Status:** these prompts land together with the `@transitrix/ingest-cli` increment (the CLI's `emit-candidates` step runs them). This skeleton increment ships the protocol and schemas only.
