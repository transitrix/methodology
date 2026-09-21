# Zone enumeration fixtures

Demonstrates the zone enumeration validation rule (CONTRACT §6.5): every file under `canon/`, `field/`, and `codex/` must be validated, narrowly exempted, or reported. The normative contract is [CONTRACT §6.5](../../CONTRACT.md#65-zone-enumeration--every-file-is-validated-or-reported). These are expected conformance outcomes, not evidence that a released validator implements them.

## Positive cases

- `codex/valid-admitted-codex-artefact.yaml` — well-formed codex element with complete admission record; validates
- `field/valid-admitted-field-artefact.yaml` — well-formed field artefact with complete admission record; validates
- `canon/valid-admitted-canon-element.yaml` — well-formed canon element with complete admission record; validates

## Negative cases

- `codex/unadmitted-markdown-file.md` — markdown file in `codex/` with no admission record; ZONE-001 warning (codex zone)
- `field/unadmitted-markdown-file.md` — markdown file in `field/` with no admission record; ZONE-001 error (field zone)
- `codex/malformed-yaml.txt` — non-YAML text file; ZONE-002 error
- `codex/admitted-non-yaml-file.md` — markdown file with an admission record (contradictory); ZONE-003 error

## Sources exception

- `codex/sources/external-document.pdf` — file in `sources/` is not enumerated or validated, regardless of format
- `codex/sources/archived-page.html` — archived external content without an admission record; no schema validation (an admission record would instead require ADMIT-012)

## Empty zones and placeholder conformance

Evaluate each row independently in a catalogue declaring `canon`, `field`, and
`codex`. Here `<zone>` means repeat the case in all three zones; repeat file cases
at both the zone root and a nested directory (including a hidden directory).
An empty directory must be created locally for the first row: Git cannot store it.
The byte strings below describe file content, not YAML fields to add to a model.

| Case / path relative to catalogue root | Exact content or setup | Expected outcome |
|---|---|---|
| Empty `canon/`, `field/`, `codex/` | Directories with no files | No zone-enumeration findings; no model artefacts |
| `<zone>/.gitkeep` | Zero bytes, regular file | Exempt repository metadata; no admission required, no model contribution |
| `<zone>/empty/.gitkeep` | Zero bytes, regular file | Same exemption; the nested directory survives a Git checkout |
| Placeholder beside an admitted model file | Zero-byte `.gitkeep` plus a valid admitted artefact | Placeholder exempt; artefact validated normally |
| `<zone>/.gitkeep` | One LF byte (`0a`), one space (`20`), or UTF-8 BOM (`ef bb bf`), separately | Not exempt; ZONE-001 error in canon/field, warning in codex |
| `<zone>/.gitkeep` | `# keep this directory` followed by LF | Not exempt; same ZONE-001 severity |
| `<zone>/.gitkeep` | `id: [broken` followed by LF | Not exempt; ZONE-001 for unadmitted unsupported content; a parser may additionally report malformed YAML, but must not pass it as metadata |
| `<zone>/.gitkeep` | An otherwise complete admitted YAML artefact copied into this unsupported filename | Not exempt; ZONE-003 error |
| `<zone>/.keep` or `<zone>/.gitignore` | Zero bytes | No name-based exemption; ZONE-001 error in canon/field, warning in codex |
| `<zone>/notes.md` and `<zone>/.notes.md` | `Unadmitted note.` followed by LF, no admission | ZONE-001 error in canon/field, warning in codex; neither file may disappear from enumeration |
| `<zone>/broken.yaml` and `<zone>/.broken.yaml` | `id: [broken` followed by LF | ZONE-002 error, including directly at all three zone roots |
| `<zone>/empty.yaml` | Zero bytes | ZONE-002 error (not a mapping); an empty model file is not a placeholder |
| `canon/elements/broken.yaml` and `canon/elements/.broken.yaml` | `id: [broken` followed by LF | ZONE-002 error; retain these model-discovery controls as well as the root cases |
| `codex/sources/external-document.pdf` or `codex/sources/archived-page.html` | Archival content, no admission | Archival exemption; no schema findings |
| `codex/sources/.gitkeep` | Zero bytes | No findings; no admitted model artefact |
| `codex/sources/admitted.yaml` | YAML mapping containing `zone: codex`, `admitted_at`, `admitted_by`, and `gate_checks` | ADMIT-012 error; archival placement cannot admit an artefact |
| `canon/sources/notes.md`, `field/sources/notes.md`, or `codex/internal/sources/notes.md` | `Unadmitted note.` followed by LF | No archival exemption; ZONE-001 error in canon/field, warning in codex |

A symlink named `.gitkeep` is not the regular zero-byte file defined by the
convention and must not receive its exemption. A directory named `.gitkeep`
does not exempt its contents. No general dotfile or hidden-directory exclusion
is allowed. The examples do not broaden archive handling to arbitrary folders.

To create a placeholder, create a **new empty file** named `.gitkeep` and check
that its size is zero bytes before adding it to Git. Editors that insert a final
newline can make an apparently blank file nonempty. Keep explanatory README files
at the catalogue root, outside the three zones; do not use them as placeholders.

## Evaluation and evidence

Use whole-repository validation with an explicit catalogue root and manifest;
validating only files discovered by a YAML glob cannot establish enumeration.
For CLI versions supporting repository scope, the invocation is:

```bash
transitrix validate --scope=repo --root <catalogue-root> --json
```

The existing files above are illustrative positive and negative inputs, not a
complete passing catalogue. The matrix adds independent byte-level cases so a
consumer can recreate empty directories and hidden files without depending on
Git's directory handling. No test harness or runtime implementation is supplied
by these documentation examples.

For each evaluated case, retain the path, exemption or finding, severity, exit
status, validator source revision, and exact CLI package version. A success exit
alone is insufficient: codex ZONE-001 is a warning, while ZONE-002, ZONE-003, and
ADMIT-012 are errors. Account for every file, including exempt metadata; do not
count a placeholder as a validated model artefact. Diagnostic mappings in an
implementation must preserve the expected finding and severity.

Document runtime results separately from these expected outcomes and from the
methodology and CLI versions actually released. A source change or documentation
merge alone does not establish runtime conformance or release acceptance.

---

Example group: zone-enumeration

Version: 1.1

Last updated: 2026-09-20
