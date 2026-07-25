# RACI matrix on a Nested Block Diagram

A recommended layout for expressing a RACI matrix (who is **R**esponsible,
**A**ccountable, **C**onsulted, **I**nformed per activity) using the
[Nested Block Diagram](../../notations/views/08-blocks.md) notation — no new
notation required.

## What this is (and isn't)

Nested Block Diagrams express **containment only** — "what is inside what"
([`08-blocks.md`](../../notations/views/08-blocks.md) §1, §8). A RACI matrix
is really a many-to-many cross-tab: one role is Accountable across many
activities, one activity has several roles in different capacities. This
template lays a RACI matrix out as a tree because that's what the notation
draws — activities containing their role assignments.

**This is a document-local visual convention, not a queryable RACI data
model.** There is no first-class "assignment" relation between a role and an
activity in the methodology today, so you cannot ask "what is the CFO
accountable for across the whole organisation" and get an answer from this
file — only "what does this one diagram say about this one process." If you
need that kind of query, treat this template as a stopgap and raise the need
for a dedicated, typed RACI notation with your Transitrix contact.

## Layout convention

- **Top-level blocks are activities** (or process steps), in the order they
  occur.
- **Child blocks are role assignments** — one child per role that has an R,
  A, C, or I stake in that activity. Name each child `"<CODE> — <Role>"`
  (e.g. `"A — CFO"`) so the code is visible directly in the rendered box.
- Use the block `description` to say *why* the role has that stake — it
  renders as a tooltip/detail panel and is what makes the diagram
  self-explanatory without a separate legend.

### ID convention

Block IDs must be unique within the document (`BL-007`). Since the same role
recurs across many activities, scope each child ID to its activity:

```
<ACTIVITY_ID>_<CODE>_<ROLE_ID>
```

e.g. `APPROVE_BUDGET_A_CFO`. Don't reuse a bare role ID (`CFO`) across
multiple activities — it will collide.

### Alternative: role-first orientation

If your audience cares more about "what does this role do across the
process" than "who's involved in this step," flip the tree: top-level blocks
become roles, children become the activities they're assigned to, named the
same `"<CODE> — <Activity>"` way. Pick one orientation per document — don't
mix both in the same file.

## Modelling reminders

RACI convention (not enforced by the notation or its validator):

- Exactly **one Accountable** per activity. Two accountables usually means
  the decision owner hasn't actually been decided.
- Keep **Responsible** to as few roles as practical — RACI works best when
  "who does the work" is unambiguous.
- Don't assign a code to every role on every activity. A role with no stake
  in an activity simply isn't listed as a child there.

## Using this template

1. Copy [`raci-matrix.blocks.transitrix.yaml`](raci-matrix.blocks.transitrix.yaml)
   into your own repo (e.g. `views/blocks/`).
2. Rename `nested_blocks.id`, `name`, and `description` to your process.
3. Replace the four sample activities with your own, and the four sample
   roles with your own — add or remove child blocks per activity as needed.
4. Validate: `npx @transitrix/cli validate <your-file>` (Windows PowerShell:
   `npx.cmd`).
5. Preview in Transitrix Studio, or render with any tool that consumes the
   shared diagram engine.

See [`08-blocks.md`](../../notations/views/08-blocks.md) for the full notation
spec.
