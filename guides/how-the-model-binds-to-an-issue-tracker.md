# How the Model Binds to an Issue Tracker

Your work breakdown already exists twice: as `ACTION` elements in the model, and as issues in
whatever tracker your delivery teams actually use. This guide is how to join the two so that
"how is this initiative going" is answered by reading, not by asking around.

Jira is the worked example throughout because it is the common case. Nothing here depends on
Jira: the same two pointers work in GitHub, GitLab, Linear, Azure Boards, or a spreadsheet.

## The rule that makes this portable: the hierarchy stays in the model

An `ACTION` is recursive. One TYPE covers every scale — `Initiative`, `Programme`, `Project`,
`Task` — and each level names the one above it through `parent`
([`ELEMENT_PRIMITIVES.md`](../notations/ELEMENT_PRIMITIVES.md) §6.1,
[`elements/24-action.md`](../notations/elements/24-action.md)).

**So the tracker is never asked to carry the hierarchy.** It carries at most one level of it —
the work item a team actually opens and closes — and everything above that is model. This is not
a stylistic preference; it is what keeps the binding cheap:

- Jira's own hierarchy above Epic (Initiative, Theme) is a **paid tier** feature. An adopter on a
  free or standard plan cannot express Initiative → Programme → Project in Jira at all. They do
  not need to.
- Trackers disagree about hierarchy. Epics, parents, sub-tasks and task lists all behave
  differently and some are new. Anything you encode in those shapes is a migration next time the
  team changes tools.
- A model outlives a tracker. Teams change trackers; the reason the work exists should not be
  re-entered when they do.

> **Model the scale you steer at, not every card on a board.** Where you stop is a judgement:
> many adopters model down to `Project` and let the tracker own everything below it. That is a
> complete adoption, not a partial one — see *Choosing where to stop*, below.

## Two pointers, one in each direction

| Direction | Carried by | Purpose |
|---|---|---|
| model → tracker | `ACTION.link` | find the work item for this element |
| tracker → model | a tag on the work item | find the element this item is delivering |

Both are needed, and for different readers. `link` answers "we decided this — is anyone doing
it?". The tag answers "this ticket is moving — what was it for?", which is the question a
delivery team is actually in a position to ask, and the one that decides whether the model gets
consulted or ignored.

**One tag value: the element's ID**, exactly as it appears in canon — `ACTION-CUSTOMER-ONBOARDING-1`.
Not a URL, not a title. IDs are stable, titles are not, and a URL binds you to today's hosting.

## Where the tag goes in Jira — two options

### Option 1 — a line in the issue description

Put one line, on its own, in the description of the Jira issue:

```
Action: ACTION-CUSTOMER-ONBOARDING-1
```

The convention is deliberately narrow so a reader and a script agree on what counts:

- the line **starts** with `Action:` — a mention of the ID in a sentence elsewhere is prose about
  the work, not a claim to be it;
- one ID per line, one `Action:` line per work item;
- put it at the top or the bottom of the description consistently, so a human skimming knows where
  to look.

**Choose this first.** It needs no administrator, no plan, and no configuration; it survives an
import or export; and it is the one form that is identical in every tracker you might move to. Its
limits are honest ones: Jira's text search is fuzzy, so a description tag is awkward to query
precisely at scale, and nothing stops someone deleting the line.

### Option 2 — a dedicated custom field

Add a single-line text custom field on the issue types you use — call it `Transitrix Action` — and
put the ID in it.

**Choose this when you have grown into it**: when you want reliable JQL
(`"Transitrix Action" ~ "ACTION-CUSTOMER-ONBOARDING-*"`), a column in a board or filter, or a
required field so the binding cannot be forgotten at creation. It gives you exactly what the
description line cannot: an unambiguous, queryable, validatable slot.

What it costs, stated plainly:

- **An administrator.** Adding a field to a company-managed project is a Jira administrator's
  action, not a team's. Some organisations gate this behind a request queue measured in weeks.
- **A shared namespace.** Custom fields are an instance-wide resource, and large Jira instances
  accumulate them until search and screen performance suffers. Your one field is not the problem,
  but "we do not add custom fields" may already be the standing answer.
- **Portability.** The field does not travel. If the team moves tracker, or a second team on a
  different Jira instance joins, you are back to option 1 for them.

### Moving between them costs nothing

Both options carry the same value under the same name. Graduating from a description line to a
custom field is a change of location, not of meaning: read the IDs out of the descriptions, write
them into the field, and keep the line or drop it. Nothing in the model changes, and no ID is
rewritten. **Start with option 1 on the day you start; adopt option 2 when a query you actually
need makes it worth an administrator's time.**

## What you get once both pointers exist

- **Progress is computed from the model, not assembled from the tracker.** Roll a status up through
  `parent` and you have an initiative's state without any tool understanding your hierarchy.
- **Unattributed work becomes visible.** Work items with no `Action:` tag are the delivery that no
  decision asked for. That count is a finding, not an error — report it, do not distribute it
  across initiatives to make the total agree.
- **Elements with no work item are equally visible.** An `ACTION` in canon with no `link` and no
  tagged item is a decision nobody has started. Both blind spots are the same query, run from
  opposite ends.

## Choosing where to stop

Model down to the scale at which you make decisions and defend budget; let the tracker own
everything finer.

| Modelled to | Tag lives on | Typical fit |
|---|---|---|
| `Project` | the tracker's epic-equivalent | most adoptions; teams keep full freedom below it |
| `Task` | the individual work item | regulated or traceability-driven work, where each item must answer to something |

If you model to `Project` and your teams work in Jira epics, tag the epic and stop. The stories
under it inherit their reason through the epic, and Jira's own parent field already holds that
relationship — which is the one hierarchy level a tracker is genuinely good at.

## Related

- [`ELEMENT_PRIMITIVES.md`](../notations/ELEMENT_PRIMITIVES.md) §6.1 — `ACTION` is recursive.
- [`elements/24-action.md`](../notations/elements/24-action.md) — the field set, including `type`,
  `parent` and `link`.
- [`guides/adoption-health-profile.md`](adoption-health-profile.md) — the coverage and
  connectedness readings this binding feeds.
