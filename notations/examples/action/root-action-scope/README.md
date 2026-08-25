# Action Schedule — `root_action` descendant check

A Project with two Tasks. One Task names the Project as `parent`; the other
does not. The Action Schedule is scoped by `view_config.scope.root_action`.
Descendants resolve only through `ACTION.parent`
([`../../../views/diagrams/07-action.md`](../../../views/diagrams/07-action.md)
§5.1, `ACT-021`).

```
ACTION-LAUNCH-1                 (Project — the root; no parent)
  ^
  | parent
ACTION-LAUNCH-PREP-1            (Task — wired)

ACTION-LAUNCH-COMMS-1           (Task — no parent; not a descendant)
```

## What fires, and what does not

| View | `root_action` | `ACT-021` |
|---|---|---|
| [`scoped.action.transitrix.yaml`](scoped.action.transitrix.yaml) | `ACTION-LAUNCH-1` | Warns on `ACTION-LAUNCH-COMMS-1`. Does not warn on `ACTION-LAUNCH-PREP-1` or on the root. |
| [`unscoped.action.transitrix.yaml`](unscoped.action.transitrix.yaml) | absent | Nothing. A missing `parent` on a non-root is not this rule's business until the view is scoped. |

`parent` remaining optional on a true root is unchanged (`ACTION-003`). The
root in this fixture has no `parent` and is not warned.

The files here are valid YAML and valid ACTION envelopes. The scoped view is
the one that carries the warning — it is not a schema-invalid document. Copy
the wired child, not the unwired one, if you are starting from this folder.

## References

- [`../../../views/diagrams/07-action.md`](../../../views/diagrams/07-action.md) §5.1, §6 — `root_action`, `ACT-021`
- [`../../../elements/24-action.md`](../../../elements/24-action.md) §1 — `parent`
