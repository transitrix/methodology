# Catalogue federation workflow

Use the installed `transitrix-ingest` CLI after the skill's Step 0. Run only the
level requested; L0 does not require a catalogue or a model. An existing project
keeps its own elements and IDs throughout. The contracts are
[releases and propagation §6](https://github.com/transitrix/methodology/blob/main/method/09-releases-and-propagation.md#6-catalogue-integration--joining-a-network-around-a-central-catalogue)
and [the binding envelope §17](https://github.com/transitrix/methodology/blob/main/notations/CONTRACT.md#17-binding-envelope--canon_id-and-origin).

## L0 — join the decision-log network

```bash
transitrix-ingest adopt-adl <org-root> --repo <org>/<repo>
```

Use the joining repository's coordinate. The command creates the decision-log
folder and CI guard and prints an onboarding line for the central maintainer.
Report that line; joining locally does not register the repository centrally.
The command preserves existing files on repeat runs. Follow the
[ADL setup guide](https://github.com/transitrix/methodology/blob/main/guides/adl-adopter-setup.md)
for the central handoff.

## L1 — pin a reviewed catalogue release

Use the central repository, version, and downloaded slice selected by the adopter.
Vendor the release asset locally, then run:

```bash
transitrix-ingest catalogue-pin <central-org>/<central-repo> <version> <slice-path> <org-root>
transitrix-ingest repo-check <org-root>
```

Commit the manifest and vendored slice together. Validation reads the local slice;
it does not download a replacement if the pin is missing, malformed, or mismatched.
An existing pin is preserved: a version bump is a deliberate manifest edit with
the proposed ADR and human ratification described in releases and propagation
§6.4.4. Do not remove a pin to make the command accept a new one.

## L2 — recognise existing local elements

```bash
transitrix-ingest catalogue-recognize <org-root> --scope terms
```

Present the emitted `catalogue-bindings.proposed.yaml` for human review. Each row
names `local_id`, `proposed_canon_id`, and the matching name or alias. Only an
unambiguous match with the same TYPE is proposed. No match or an ambiguous match
leaves the element unbound. The output is a proposal with
`gate.admits_to_canon: false`, not an admission decision.

After the human accepts a specific pair, present the binding command below for
that human to run. Do not treat a successful recognition command as acceptance.

## L3 — propose central admission

For an admitted, unbound standalone local element:

```bash
transitrix-ingest catalogue-promote <local-id> <org-root> --repository <local-org>/<local-repo> --scope terms
```

Present the emitted `promotions.proposed.yaml`. Review the candidate's name,
aliases, and description against the source before handing it off; complete any
fields the CLI could not read faithfully. Its `origin.repository` names the local
repository and `origin.id` retains the local ID. The proposal grants no admission
and allocates no central ID. The central maintainer reviews it through that
repository's own admission gate, assigns a central ID, retains `origin` on the
central element, and publishes a catalogue release containing it. The local
skill does not write to the central repository.

Leave the local element unbound if central admission is declined or has not happened.
When the accepted central ID is returned, vendor and ratify the catalogue version
containing it through L1 before applying the binding. A proposed central ID alone
is insufficient: it must resolve in the local pin.

## Apply the accepted L2 or returned L3 binding

Give the reviewer this command with the accepted IDs filled in:

```bash
transitrix-ingest catalogue-bind <local-id> <accepted-central-id> <org-root>
transitrix-ingest repo-check <org-root>
```

The human runs the write. It adds only `canon_id`; the local `id`, admission
record, relations, and view references remain local. `origin` belongs on the
central element, not on the local copy. An identical binding is a no-op; a
different existing binding is refused. Missing pins, unresolved targets, TYPE
mismatches, and another local element claiming that target block a new binding.
Resolve validation findings before considering the workflow complete; rerunning
the checks must leave files unchanged.

The proposal commands print their output paths. Preserve existing review batches;
use `--scope` to distinguish them and reserve `--out` for an explicitly selected
output file, since that option overwrites the named file. Repeat validation or
binding application does not require a new proposal batch.
