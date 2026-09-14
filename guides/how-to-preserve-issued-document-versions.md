---
title: How to preserve issued versions of generated documents
status: active
last_reviewed: 2026-09-14
audience: public
license: MIT
tags: [transitrix, guide, documents, versioning, governance]
---

# How to preserve issued versions of generated documents

> Recommendations for adopters issuing documents generated from a repository, such as a Functional Requirements Specification (FRS) or a System Design Specification (SDS). This guide describes the working agreement to establish, not a technical implementation.

A repository can keep changing while a document issued from it stays fixed. Treat an **issued version** as a record of what particular readers received at a particular point. Subsequent changes to the model do not silently change that record.

## Distinguish a working document from an issued version

A working document can be regenerated while its authors develop it. An issued version is an identified edition released to other people for a stated purpose: review, approval, implementation, or reference.

Agree where that boundary falls. A document issued for review is already worth preserving, even though it has not been approved: reviewers must be able to identify the exact edition on which they commented.

The version of the methodology, the revision of a document recipe, and the issued version of an FRS or SDS answer different questions. An issued document needs an identity its readers can cite without knowing how it was generated.

## Establish the agreement before the first issue

Adopters should agree:

- **Identity:** how each document and each issued version are named, including its issue date and purpose.
- **Responsibility:** who may issue a version, who may approve it, and who decides which version is current for a particular use.
- **Preservation:** where recipients can obtain the exact issued document, how long it is retained, and who may access it.
- **Change:** how a replacement is identified, what changed, and how affected recipients are informed.

Use the organisation's existing document-control practice where it answers these questions. This recommendation does not prescribe a numbering system or a storage product.

## Keep the issued version unchanged

Once issued, preserve the document as issued. Do not replace its content under the same version identifier, including for a corrected typo, a regenerated illustration, or a formatting change. Readers who cite that identifier must continue to mean the same document.

Preserve enough context to establish which state of the repository and which recipe produced it. This traceability explains its origin; it does not replace the issued document itself. Being able to generate a similar document later is not evidence of what was actually sent.

Working previews may be disposable. A document used for review, agreement, or delivery is a record of that interaction and should follow the agreed retention policy.

## Keep approval attached to the edition reviewed

An approval should identify the document version, the approver, the date, and the scope of the approval. Approval of model content does not by itself establish approval of the generated document's wording, selection, or presentation.

If review copy 1.0 is approved without changes, record that approval against copy 1.0. Do not silently rewrite the preserved copy to add an approval stamp. If the approved deliverable includes a changed cover or other changed content, identify and preserve it as a distinct issued version and record its relationship to the reviewed copy.

Later withdrawal or supersession changes whether an edition should be used; it does not change what that edition contained or erase its prior approval history. Keep those subsequent decisions distinguishable from the original issue.

## Issue changes as a successor

When a change is needed, prepare a new version, explain the differences, and obtain the review appropriate to their impact. Make clear which previous version it replaces and when it becomes the version to use.

Not every change needs the same approval effort. A spelling correction and a changed safety requirement may have different review paths. Both still need distinguishable issued versions if the delivered document changes.

Do not assume that approval of an earlier edition automatically carries over. Record the decision about whether renewed approval is needed. Retain superseded versions for the agreed period and make their superseded status clear to anyone retrieving them.

## Keep related documents aligned explicitly

An SDS may have been reviewed against FRS 1.0 while the repository now supports FRS 1.1. State which FRS version the SDS relies on. A newer FRS does not automatically invalidate the SDS, but it does require an impact assessment before claiming that the pair remains aligned.

For example:

| Event | What is preserved or decided |
| --- | --- |
| FRS 1.0 is issued and approved | The exact issued FRS and approval referring to that edition. |
| SDS 1.0 is issued against FRS 1.0 | The exact SDS and its stated requirements basis. |
| Requirements change; FRS 1.1 is issued | FRS 1.0 remains available; the differences and replacement decision are recorded. |
| The design is assessed against FRS 1.1 | The assessment says whether SDS 1.0 remains applicable or a successor is needed. A changed SDS is issued separately. |

The numbering in this example is illustrative. The agreement between participants matters more than the particular numbering convention.

## Check that the agreement works

Take one previously issued document and ask someone outside its authoring process to establish:

- the exact edition they received and the purpose for which it was issued;
- whether it was approved, by whom, and for what use;
- what it replaced, whether it has since been replaced, and where the differences are explained;
- which versions of related documents it relies on;
- how to retrieve the unchanged issued copy.

An unanswered question identifies a gap in the document-control practice. Writing this agreement does not itself enforce immutability: adopters must ensure that their chosen process and tools preserve issued records and make substitutions detectable.

## See also

- [How a model-backed document is versioned](how-a-document-is-versioned.md) — the separate technical guide to recipe versions, baselines, and document revision tables.
