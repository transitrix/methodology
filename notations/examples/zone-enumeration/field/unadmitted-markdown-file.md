# Unadmitted Markdown File in Field Zone

This is a markdown file in the field zone with **no admission record**.

The field zone, unlike codex, does not permit external non-YAML documents.

This file should trigger **ZONE-001** (error in field zone) because:
- It is in `field/` (not under `sources/`)
- It is not a YAML artefact
- It has no admission record

The validator should report this as an error: field zone requires all artefacts to be validated YAML with admission records.
