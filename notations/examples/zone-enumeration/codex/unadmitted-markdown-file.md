# Unadmitted Markdown File

This is a markdown file in the codex zone with **no admission record**.

```
No zone: field
No admitted_at: "2026-08-31"
No admitted_by: "automation"
No gate_checks: {}
```

This file should trigger **ZONE-001** (warning in codex zone) because:
- It is in `codex/` (not under `sources/`)
- It is not a YAML artefact (it's markdown)
- It has no admission record
- It does not match any published notation schema

The validator should report this as an unenumerated file.
