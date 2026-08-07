# Document views

Reserved for the document-view class — specs that render a standard document
(MRD, SRS, SDD, …) from canon. See the 2026-07-30 rendered-documents architecture
decision.

[`DIRECTIVE_LANGUAGE.md`](DIRECTIVE_LANGUAGE.md) is the **normative definition of
the `{{ … }}` directive language** every document source in this class is written
in — one language, defined once, shared by `.ttrs` templates and skeleton files
alike. It is not a notation spec and carries no `notation:` header.

The numbered specs beside it (`29-mrd.md`, `30-srs.md`, `31-sdd.md`) define
document **kinds** — layouts over canon, named by the middle segment of a
document source's filename. **A kind is never a notation of its own**; see
[`DIRECTIVE_LANGUAGE.md`](DIRECTIVE_LANGUAGE.md) §1.

Implementations: the `.ttrs` template parser and its pass-1 resolver live at
[`packages/document-renderer`](../../../packages/document-renderer/README.md);
the skeleton-file parser, evaluator and render profiles at
[`packages/document-view-engine`](../../../packages/document-view-engine/README.md).
Each states which subset of the language it admits and what it defers.
