# `prompts/` — reg-intel extraction prompts

The two **agent-facing extraction prompts** the reg-intel pipeline runs over a fetched source snapshot. They are the LLM steps of the [SKILL.md](../SKILL.md) run loop; the deterministic CLI sequences them and shapes their JSON results into `field`-zone `SEGMENT-*` artefacts and `proposed` `REQUIREMENT-*` / `CONSTRAINT-*` candidates. Each prompt is self-contained (it can be fed to an agent independently) and emits a strict JSON result contract — nothing else.

| File | Step | Reads | Emits |
|---|---|---|---|
| [`segment.md`](segment.md) | 4 — SEGMENT | normative text of a source snapshot | `segments[]` — obligation-bearing chunks (`locator`, `text_excerpt`, `obligation_signal`, `extraction_confidence`) |
| [`classify.md`](classify.md) | 5 — CLASSIFY | the SEGMENTs from Step 4 | `candidates[]` — one `requirement`/`constraint` per segment, with `obligation_level` and `derived_from` |

## The rule the CLASSIFY prompt encodes

**Positive obligation → `REQUIREMENT` is the default.** The decision tree distinguishes by the *form* of the obligation, not its topic: a prohibition or a definition/scope boundary is a `CONSTRAINT`; a positive command to act is a `REQUIREMENT`. Encoding this as a deterministic default means the same passage classifies the same way across runs and across agents (Claude and Copilot). Authoring guidance lives in the per-notation spec ([`15-requirement.md`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/15-requirement.md)); the prompt operationalises it.

## Rules both prompts enforce

- **Verbatim, not paraphrased.** Segment text is the source's own words — a later amendment must be provable against the bytes that were read.
- **Two axes, never merged.** `extraction_confidence` (`high|medium|low`) answers *"did I read / classify correctly"* — a review flag, **separate** from `source_quality` (trust in the source) and **never** persisted into canon.
- **Ambiguity is surfaced, not resolved.** A passage the classifier cannot confidently place is emitted `extraction_confidence: low` with the alternate classification attached; the human picks.
- **Propose, never admit.** The prompts emit `proposed` artefacts/candidates only. Admission to canon (`proposed → active | rejected`) is a separate human gate; nothing here writes `canon/`.

## See also

- The skill protocol: [`../SKILL.md`](../SKILL.md) Steps 4–5.
- SEGMENT / REQUIREMENT TYPEs: [`23-segment.md`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/23-segment.md), [`15-requirement.md`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/15-requirement.md).
- Admission record + confidence model: [CONTRACT §6, §11](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md).
