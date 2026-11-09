# Getting started with Transitrix

Create a Goals tree containing one goal, then validate it. The [README picture](README.md) shows how the same kind of file looks with more goals; this session starts with “Triple EU revenue”.

The **onboarding Skill** (`/transitrix:onboard`) is the fastest path for a team repository: it scaffolds the layout and guides your first file. Start it from the [Quick start](README.md#quick-start). The steps below are the manual path.

## Before you start

You need Git, a text editor, and Node.js 20 or later (including `npx`). The first CLI run downloads the validator and may ask you to confirm installation. **Transitrix Studio** in VS Code adds diagram preview and inline validation; it is optional for these steps.

## Step 1 — Create a place for your model

In a terminal, create a practice repository:

```bash
mkdir transitrix-demo
cd transitrix-demo
git init
```

Run the remaining commands from this directory. If you already have an architecture repository, use its organisation root instead.

Save the file in Step 2 under `views/goals/`. `views/` sits beside `canon/`, which holds shared model elements. The other zones are `field/` for retained evidence and `codex/` for laws and policies. You can leave them empty for this first tree.

## Step 2 — Write one goal

In your editor, create `views/goals/strategy-2026.goals.transitrix.yaml` (create the folders if needed) and paste:

```yaml
notation: goals
spec_version: "0.1"
id: GOALS-STRATEGY-2026
name: "Strategy 2026"
description: "Our first revenue goal."
period: "2026"
author: Transitrix

goal_types:
  - { name: "Strategy", level: 0 }

goals:
  - id: GOAL-REVENUE-1
    name: "Triple EU revenue"
    type: "Strategy"
    level: 0
```

Replace `author` with your name. Keep the header and `.goals.transitrix.yaml` extension together: they identify the notation. `GOAL-REVENUE-1` is the goal's stable identifier; `name` is its readable label. With no `parent`, this is a root goal.

This self-contained file keeps the goal inline. A standalone element file becomes necessary when a second document references that goal.

## Step 3 — Validate

Save the file and run:

```bash
npx @transitrix/cli validate views/goals/strategy-2026.goals.transitrix.yaml
```

On Windows PowerShell with a restricted execution policy, use this command instead:

```powershell
npx.cmd @transitrix/cli validate views/goals/strategy-2026.goals.transitrix.yaml
```

Success means the command exits successfully with no validation errors. If it reports an error, correct the named field and run it again. Check YAML indentation (spaces, not tabs), the saved filename, and that the terminal is at the repository root. This checks the file's structure; your team still reviews whether the goal is the right one.

**You now have a validated goal in a Goals tree.** Open it in Studio to preview the diagram.

## Keep your first result

```bash
git checkout -b feature/strategy-2026-goals
git add views/goals/strategy-2026.goals.transitrix.yaml
git commit -m "docs: add first revenue goal"
```

In a team repository with an `origin` remote, push the branch with `git push -u origin feature/strategy-2026-goals` and open a pull request on GitHub. For the practice repository, the local commit is enough to keep this result.

## Add your first source

For a new team repository, use the [onboarding setup](transitrix/skills/onboard/SKILL.md#step-2--scaffold-the-repo) to choose a model-only workspace, ordinary Ingest, or Knowledge Store. Use separate workspaces when you need both intake profiles.

- **Interview notes.** Ask Ingest to add the notes to `field/`. Attach a file or give the notes in chat, with who recorded them, when, and in what context. An explicit request to add your own notes is sufficient when Ingest preserves their meaning and verifies provenance and team access. See [Field admission](transitrix/skills/ingest/README.md#add-a-field-record).
- **Uploaded document.** In Knowledge Store, a card such as `sources/interview.md` sits beside its uploaded original, such as `sources/interview.original.pdf`. A web page or a corporate document gets a card with a link. The card's `source:` points to the original, and reviewed findings in `knowledge/` cite their evidence. See [Knowledge Store](patterns/knowledge-store.md#preserve-uploaded-originals).

If you are upgrading an existing Knowledge Store, follow the [migration instructions](patterns/knowledge-store.md#move-existing-source-cards) to keep old citations working.

## Continue when you need more

- **Grow the tree:** follow the [Goals tree example](notations/examples/goals/strategy-2026.goals.transitrix.yaml). Child goals use `parent: GOAL-REVENUE-1`; the [Goals reference](notations/views/diagrams/04-goals.md) explains the fields.
- **Share a goal across documents:** [element primitives](notations/ELEMENT_PRIMITIVES.md) explain promotion into `canon/elements/01_motivation/goals/<ID>.yaml` and views that reference those elements.
- **Link goals to drivers and delivery:** choose the next view using the [notation index](notations/README.md). For links with their own history, consult [relations](notations/elements/17-relations.md); for ordinary typed-ID links, see [IDs and references](notations/IDS_AND_REFERENCES.md).
- **Set up the full team repository:** use the onboarding Skill or read [repository layout](method/02-repository.md), including multi-organisation layouts, and [working the model](method/05-working-the-model.md) for validation and review.
- **Review a team repository:** use the [adoption health profile](guides/adoption-health-profile.md), including its [source-traceability check](guides/adoption-health-profile.md#check-source-traceability).
- **See a complete organisation:** explore the fictional [acme-corp walkthrough](WALKTHROUGH.md). The [guides](guides/) cover later modelling tasks.
