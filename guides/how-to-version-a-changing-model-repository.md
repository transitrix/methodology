---
title: How to version a changing model repository
status: active
last_reviewed: 2026-09-24
audience: public
license: MIT
tags: [transitrix, guide, versioning, baseline, provenance]
---

# How to version a changing model repository

A model repository may change hundreds of times a day while supporting product releases, reviews and issued documents. Keep the identity of the repository, the versions of its processing tools, and the state of its information distinguishable. A content edit does not automatically constitute a new software release of the system used to maintain it.

This guide recommends a way to organise the evidence using existing release, baseline and document conventions. It introduces no schema, automatic collector or universal approval requirement. The organisation defines its system boundary, change controls and retention obligations.

## Separate the questions

| Question | Record |
| --- | --- |
| Which repository or knowledge system is this? | Its stable identity and agreed boundary, including relevant external services. |
| Which means processed the information? | Exact versions or content identities of the methodology, validators, generators, recipes, configuration and dependencies actually used. |
| What did the information say? | Repository identity and the exact commit containing the inputs. |
| Which part was used for this result? | The selection or query, its parameters and the input identities it resolved to at that commit. |
| What was issued? | The identified product release, build or document edition, its evidence and the preserved output. |

`methodology_version` identifies the method release to which the repository conforms. It does not identify every installed tool, the current data state, or an issued document. A version label for a tool likewise does not identify the model it processed.

A repository may be managed as a system without treating every commit as a new `RELEASE`. Use the existing [RELEASE specification](../notations/ELEMENT_PRIMITIVES.md) only for eligible subjects and actual identified releases. Do not reclassify a repository just to satisfy an endpoint constraint.

## Do not exclude information zones from provenance

Separating the software configuration from frequently changing information can be useful. Excluding `canon/`, `codex/` and `knowledge/` from all release evidence is not the same separation: their contents may determine the result.

Classify changes by their effect, not solely by their folder:

- A requirement change in `canon/` changes model content.
- A rule in `codex/` that is evaluated during a check is also an input to that check.
- A finding in `knowledge/` may support a conclusion or generated passage.
- A generator or configuration change can alter how identical content is processed.
- An unrelated note need not require reissuing every document.

Keep ordinary history for committed content. At an issue or review boundary, identify the relevant inputs and their dependency closure across zones. A commit pins tracked repository content; it does not capture ignored files, external services, remote documents or uncommitted changes. Record and retain material external inputs separately. Unknown inputs remain explicit gaps.

## Freeze the reference at a meaningful event

Choose baseline events under the organisation's policy: a design review, an approved requirements set, a product release or a document issue. Everyday edits continue between those events.

1. Identify the actual committed input state. Resolve a branch or tag to its commit identity; do not record only a moving name such as `main` or `latest`.
2. Record the scope used, including selection parameters. A query evaluated against today's model does not reconstruct its old result.
3. Identify the actual processing configuration, including rule sets, recipe, tool versions and material inputs outside the repository.
4. Retain the resulting evidence and the exact issued files under the agreed access and retention policy. A checksum identifies bytes but does not preserve them or establish approval.
5. Record issue identity, responsibility and approval where required. Protect baseline references under the organisation's policy and retain the underlying objects and external evidence for the required period.

The [baseline pattern](../patterns/baseline-audit-trail.md) uses a tag to name a committed state. The tag is a movable reference unless protected; retain the commit identity as well. Its manifest script reports admitted `canon/` content and is not a complete inventory of tools, all zones or external inputs.

Do not freeze the working repository while the issued baseline is in use. Subsequent commits leave the original input identity unchanged. Preserve historical release links and document issues; record corrections and successors explicitly instead of rewriting the evidence of what was issued.

## Example: frequent edits, one issued package

The following is an illustrative evidence checklist, not a new Transitrix record format.

| Item | Identified state |
| --- | --- |
| Product | Portal, release 3.2 |
| Build | Build 154, with its output identities and assembly evidence |
| Model input | Model repository identity and full commit identity recorded at issue |
| Scope | Requirements for Portal 3.2, their relevant links and supporting evidence at that commit; selection parameters retained |
| Processing | Actual validator, rule-set, generator and dependency identities |
| Recipe | `portal.srs`, edition 1.4, source at the recorded commit |
| Issued package | Package edition 2: specification issue C and verification-report issue B |
| Retained evidence | Exact issued files, output checksums, generation record and applicable approval records |

Another hundred commits can follow without changing package edition 2. If a document is corrected and reissued while Portal remains at 3.2, identify the new document issue and updated package association under the document-control agreement. A product release and a document edition need not advance together.

If two builds share the same product version label but use different inputs, keep their build and artifact identities distinguishable. The label alone cannot establish which output was tested or issued.

## Connect product, assembly and document evidence

For eligible modelled releases, [`assembled_on`](how-a-release-records-the-systems-it-was-assembled-on.md) records the identified system releases used for assembly. It does not stand for included components, deployment, test results or the model commit used to generate a document. Retain evidence for inputs that do not fit the existing relation; do not invent a relation type or imply support through an example.

For generated documents, follow [recipe and render versioning](how-a-document-is-versioned.md) and [preservation of issued versions](how-to-preserve-issued-document-versions.md). A recipe version, model baseline and document issue answer different questions. Preserve the issued bytes: regeneration, especially with generated prose, need not reproduce them exactly.

The useful retrieval questions are concrete: which model and rules produced this document; which tool versions were used for this build; and which issued outputs need assessment after a relevant input is found defective? Traceable provenance supports that assessment. It does not by itself prove compatibility, correctness or compliance.
