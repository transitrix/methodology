# HTML-to-PDF adapter and caller-owned engine

The standing shape is a **caller-supplied engine**. This package supplies HTML/CSS
preparation and a callable conversion boundary; it bundles, installs and chooses
no external rendering runtime. The historical Vivliostyle reference is a
recommendation, not an installed/version-pinned engine or conformance receipt.

## Callable API

Import `convertToPdf` from `src/convert-to-pdf.mjs`. It is an asynchronous exported
function with no subprocess, file-output or network behavior. It invokes the
caller's engine once and the caller's PDF verifier once after envelope checks.
It never falls back to the plain Markdown PDF writer or retries a failed engine.

```javascript
import { wrapHtmlForPrintRendering } from './src/render-vivliostyle.mjs';
import { convertToPdf } from './src/convert-to-pdf.mjs';

// These are actual function arguments supplied by the owning application.
export async function renderWithCaller({ engine, verifyPdf, binding, assets, fonts }) {
  const html = wrapHtmlForPrintRendering('<h1>Synthetic document</h1>', {
    issuer: 'Synthetic issuer', issued_at: '2026-10-01T12:00:00Z',
    document_identity: 'explicit caller text', repository_commit: 'explicit baseline',
  });
  return convertToPdf({ html, css: '', assets, fonts, options: {}, binding,
    engine, verifyPdf, requiredOrientations: ['portrait'] });
}
```

The caller must supply an already authorized executable engine and PDF verifier.
This example does not select an engine, construct an issue identity, observe Git,
attest a baseline, capture a diagram, or create a handoff/issuance event.

### Input

| Argument | Contract |
| --- | --- |
| `html` | Nonempty HTML string, normally the complete output of the existing `wrapHtmlForPrintRendering` helper. No Markdown-to-HTML conversion or sanitization is implicit. |
| `css` | Additional CSS string, default empty; passed separately and unchanged. The engine applies it in its documented cascade order. |
| `assets`, `fonts` | Arrays of `{uri, mediaType, bytes}`; bytes are Buffer/Uint8Array. Each URI is unique across both arrays. Copies are passed to the engine; no path/URL is opened by the adapter. |
| `options` | Object of finite JSON-compatible conversion options, default `{}`. The caller/engine defines their meaning and must refuse unsupported options. Cycles, sparse arrays, functions and non-JSON values are refused. |
| `binding` | Object with nonempty strings `owner`, `authority`, `name`, `version`, `environment`, `verifier`. These identify the caller's engine owner, admission evidence reference, exact executable/build version, environment/configuration reference and verifier/version reference. |
| `engine` | Required function `({html, css, assets, fonts, options, binding}) => Buffer/Uint8Array` or a promise of those bytes. Wrap a caller-owned stdin/file/stdout tool here if that is its existing admitted interface. |
| `verifyPdf` | Required function `(pdfBytes) => {valid, pages}` or a promise of that report. `valid: true` must mean the verifier parsed a valid PDF and enumerated every page; an envelope sniff is insufficient. |
| `requiredOrientations` | Optional list containing `portrait` and/or `landscape`. Each requested orientation must occur. Even an empty list still requires nonempty verified A4 pages. |

An engine wrapper must resolve referenced fonts/assets from the supplied bytes
under its own explicit resource policy, or refuse an unresolved/unsupported
resource. Define relative/base URI handling and CSS ordering in that wrapper's
versioned contract. HTML/CSS can contain active or external references: this
adapter is not a sandbox and grants no filesystem/network permission. The owner
must constrain the engine before invoking it. Resource availability, font
embedding and diagram fidelity need actual output checks; passing bytes is not
proof they were consumed. The adapter copies resources/options/binding so engine
mutation cannot overwrite caller inputs or change the retained binding.

The binding fields are caller assertions/references, **not** an authorization
validator. Resolve and authorize the exact callbacks/executable/environment before
calling. Supplying a plausible owner/version string does not admit an engine.
No secret, credential or confidential input is needed in this descriptor.

### Output and validation

The result is `{pdf, adapter, binding, verification, runtime}`:

- `pdf`: copied PDF Buffer; the adapter's cheap `%PDF-`/trailing `%%EOF` envelope
  check runs first. It is not a full PDF parser.
- `adapter`: API identifier `caller-html-pdf/1` and SHA-256 of the adapter source
  file read at module initialization. Pin the complete package/source commit
  separately; this file identity is not a complete build or generation attestation.
- `binding`: retained copy of the caller descriptor.
- `verification.pages`: `{number, widthPt, heightPt, orientation}` for every page,
  numbered sequentially from 1. The caller verifier must account for inherited
  boxes, rotation, units and any other PDF representation it supports; unsupported
  representations must fail, never become an empty successful report.
- `runtime`: observed Node version, platform and architecture for the adapter.
  It is not observation of a separate engine process or its environment.

Every reported page must be A4 portrait (approximately 595 × 842 pt) or landscape
(842 × 595 pt), with an explicit one-point tolerance per dimension. Nonfinite,
missing, empty, nonsequential, non-A4 or required-orientation-missing reports
fail. A caller verifier's failed/unsupported report remains a refusal. The
verifier receives a PDF copy and may not alter it. No PDF is returned on refusal.

These checks establish the wrapper's handling of **caller verifier evidence**.
They do not prove that an arbitrary callback inspected honestly, that every-page
furniture is visible, or that figures/fonts/identity/baseline are correct. Those
remain actual engine/provenance acceptance, separate from this API's success.

### Failure convention

The promise rejects with `PdfConversionError` carrying `code`, `message` and,
when a callback threw, its original `cause`. No output file is written by the adapter.

| Code | Cause |
| --- | --- |
| `PDF-INPUT` | Invalid input, binding, resource, JSON options or orientation request |
| `PDF-ENGINE-UNAVAILABLE` | No callable engine |
| `PDF-VERIFIER-UNAVAILABLE` | No callable PDF verifier; engine is not invoked |
| `PDF-ENGINE-FAILED` | Engine throws/rejects; original cause retained |
| `PDF-OUTPUT` | Nonbyte, empty, truncated or non-PDF envelope |
| `PDF-VERIFIER-FAILED` | Verifier throws/rejects or changes its input |
| `PDF-GEOMETRY` | Verifier does not establish supported complete geometry |

These are conversion errors, not producer/issuance status, identity policy,
registration, signature or a new persisted run-record schema. Callers retain
engine stdout/stderr, attempts, configuration and failure evidence through their
existing authorized storage; this library logs or publishes none of it.

## Required engine conformance

The existing HTML preparation supplies A4 named portrait/landscape pages, page
break rules, running page furniture and counters. Issued content (explicit
`issued_at`) retains issuer/date/identity on page one as well as later pages;
non-issued content keeps its existing first-page suppression. Snapshot captions
use captured-at `generated_at` in UTC, independently of valid-at and issue dates.
The conversion seam does not change these helper behaviors.

An admitted engine must demonstrate those features with actual output, including
an embedded diagram and readable first/subsequent-page furniture. Keep exact
HTML/CSS, resource/font bytes, options, source/engine/verifier/environment versions,
PDF bytes/digest, page geometry, rendered inspections and repeatability observations.
Pin actual inputs before each run. A stored commit/identity string does not prove
baseline materialization or capture, and matching output bytes alone do not prove
generation. PDF/A, tagged-PDF certification and a retention/signing service are
outside this adapter.

## Source checks versus actual rendering

`tests/test_convert_to_pdf.mjs` uses a fixture engine and verifier with controlled
PDF bytes from the existing plain writer. The mixed-box fixture changes equal-
length dimension strings, preserving byte offsets. It tests API success/refusal,
argument/resource transport, failure causes and geometry guards **without claiming
HTML conversion or paged-media conformance**. No engine binary is required by CI.

Actual renderer acceptance requires separately evidenced caller-owned capability.
An installed browser, a historical recommendation, generated CSS, or fixture
callbacks do not establish that capability. Until it exists, retain the missing
owner/admission/executable-version/environment/verifier facts and leave real-PDF
acceptance open; do not install a new engine or substitute a text-only PDF.
