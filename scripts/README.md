# Transitrix Analytics & Utilities

## generate-action-progress.py

Generates `analytics/action-progress.ndjson` in the `transitrix-hq` repository, tracking completion percentages for ACTION elements that carry GitHub issue links.

### Requirements

- Python 3.8+
- GitHub CLI (`gh`)  
- GitHub credentials configured (`gh auth login`)

### Usage

```bash
python3 scripts/generate-action-progress.py
```

### How it works

1. Scans `transitrix-hq/canon/elements/05_implementation/actions/` for ACTION elements
2. Extracts those carrying a `link:` field pointing to GitHub issues
3. Queries each issue's current state via GitHub API
4. Computes completion percent:
   - Closed issue → 100%
   - Open issue → 0%  
   - (Future: check for sub-issues to get granular percentages)
5. Writes results to `transitrix-hq/analytics/action-progress.ndjson` in NDJSON format:
   ```json
   {"id":"ACTION-DSM-DGCA-1","link":"https://github.com/transitrix/transitrix-hq/issues/32","percent":0,"computed_at":"2026-09-02T14:30:00Z"}
   ```

### Output format

Each line is a JSON object with:
- `id`: ACTION element identifier
- `link`: GitHub issue URL
- `percent`: Completion percentage (0-100)
- `computed_at`: Timestamp (ISO 8601 UTC)

### Integration

This script is designed to run as part of `transitrix-hq`'s scheduled analytics pipeline (similar to `agent-fleet-throughput.ndjson`). Add a daily scheduled task that runs this script and commits the output.

### Future enhancements

- Check for GitHub sub-issues to compute granular completion percentages (when ADR "an-epic-owns-its-tasks-as-sub-issues" adoption increases)
- Handle cross-repo issue links
- Implement idempotency to avoid duplicate rows
