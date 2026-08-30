# Zone enumeration fixtures

Demonstrates the zone enumeration validation rule (CONTRACT §6.5): every file under `canon/`, `field/`, and `codex/` must either be a validated YAML artefact with an admission record, or be formally reported as unenumerated.

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
- `codex/sources/archived-page.html` — archived external content; not checked for admission record

## Usage

Run the validator over this example directory to verify zone enumeration rules are enforced:
```bash
npx @transitrix/cli validate notations/examples/zone-enumeration/
```

Expected output:
- Positive cases: all PASS
- Negative cases: ZONE-001 (field/codex), ZONE-002, ZONE-003 as documented
- Sources: no findings

---

Example group: zone-enumeration  
Version: 1.0  
Last updated: 2026-08-31
