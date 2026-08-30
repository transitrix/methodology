---
zone: codex
admitted_at: "2026-08-31"
admitted_by: "automation"
gate_checks:
  source_authority: pass
---

# Contradictory Signal: Admitted Non-YAML File

This markdown file has a YAML frontmatter section with an **admission record**,
but the rest of the file is markdown, not YAML.

This should trigger **ZONE-003** (error) because:
- It has an admission record (`zone`, `admitted_at`, `admitted_by`, `gate_checks`)
- But it is markdown, not a YAML artefact
- The two signals are contradictory

A file is either:
1. A YAML artefact with an admission record (valid), or
2. A file with no admission record (unenumerated, ZONE-001), or
3. Contradictory (ZONE-003 error)

A markdown file carrying an admission record in frontmatter does not match
any published notation that validates such content. This is a configuration error.
