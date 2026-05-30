# Issues notation — examples

File extension: **`.issues.transitrix.yaml`**

## Format overview

An issues register catalogues the problems, defects, open questions, and risks an organisation is tracking. Each entry records a lifecycle `status` and an optional `parent`, so the flat list also forms a parent/child tree. It complements the `activities` notation: activities are *what work is planned*, issues are *what is wrong or unresolved*.

## Files in this folder

| File | Description |
|---|---|
| [`platform-launch.issues.transitrix.yaml`](platform-launch.issues.transitrix.yaml) | Seven-issue register covering all five statuses, three levels of nesting, and `relates_to` / `owner_role` cross-references |

## Notation header

Every file must start with:

```yaml
notation: issues
```

## Required fields

| Field | Description |
|---|---|
| `issues_catalogue.id` | Unique identifier for the catalogue (`ISSUES-CAT-<integer>`) |
| `issues_catalogue.name` | Display name |
| `issues_catalogue.updated_at` | Date in `YYYY-MM-DD` format |
| `issues[].issue_id` | Unique identifier within the catalogue (`ISSUE-<integer>`) |
| `issues[].name` | One-line summary of the issue |
| `issues[].status` | One of `open`, `in_progress`, `blocked`, `resolved`, `closed` |

See [`../../views/12-issues.md`](../../views/12-issues.md) for the full specification.
