# Transitrix Repository MCP Server

**Pattern type:** integration · **Complexity:** moderate

**Status:** recommended architecture; no available server or supported Transitrix MCP API is implied.

## Problem

AI clients need to retrieve and analyze an enterprise model without turning search results into another source of truth or bypassing its admission process. Different readers may need different parts of the same logical model. A prompt, repository folder, or assistant role name cannot enforce that boundary.

## Solution

Expose model operations through MCP with trusted identity, explicit scoped permissions, provenance, and governed proposals. Git and admitted canon remain authoritative. Indexes, query responses, and generated views are derived and rebuildable; reviews, approvals, audit records, and retry records have separately declared authoritative storage.

The [enterprise reference](../guides/repository-mcp-enterprise.md) develops this pattern with authorization rules, deployment choices, storage, recovery, implementation alternatives, acceptance scenarios, and a compatible role/onboarding migration. It is the detailed design reference for implementation teams.

```text
AI client (within an approved data-processing boundary)
    |
    v
MCP adapter -> trusted identity + scope/operation authorization
    |
    v
Model operations -> authorized queries over a pinned Git/index snapshot
    |                   |
    |                   +-> derived answers, diagrams, documents
    v
Proposal -> automated checks -> expert review -> authorized approval
    |
    v
Git + admitted canon
```

The adapter is an interface, not the policy owner. Web interfaces and other integrations use the same application authorization layer. An internal endpoint alone does not confine the AI client's processing of returned content.

## Capabilities and governance

Separate four dimensions: **expertise**, **accessible scope**, **operation permissions**, and **assignment to a change**. Analysis and modeling are activities or assistant modes. Validator is an expert-review function performed by a qualified domain specialist; it is not a standalone profession or an authorization role.

| Capability | Required boundary |
|---|---|
| Retrieve, search, trace relationships | Trusted caller identity; explicit read scope; authorize each relationship and both endpoints |
| Validate schemas and model integrity | State the actual checks, source revision, and authorized coverage; never infer expert correctness from a pass |
| Propose an element, relation, or view change | Scoped proposal permission; base revision, diff, provenance, and check results; no direct default-branch write |
| Record expert review | Qualified and assigned reviewer; review permission; conclusion bound to the exact revision |
| Approve admission | Separate approval authority and admission record; favorable review alone is insufficient |
| Change access policy | Separately protected policy authority, including changes to classifications or visibility |
| Governed automation | Explicit operation and scope grants, bounded inputs, audit, and the same admission gates |

Default to denial. Do not accept identity claims from tool arguments. Filter before content reaches the model, including hidden identifiers, search snippets, diagrams, history, errors, caches, and job results. Apply current policy to historical content and reauthorize result delivery after revocation. A complete Git clone bypasses MCP restrictions; sparse checkout is not access enforcement.

Basic capabilities include retrieval, search, bounded relationship traversal, automated checks, and reviewable proposals. Extended capabilities include impact analysis, federation, revision comparisons, review integration, generated artefacts, semantic search, and long-running jobs. **Authorization, audit, provenance, and revision correctness are mandatory in both.** Simple/Full methodology tiers and basic/extended service capabilities are separate choices.

## Add-ons and discovery

Preserve the boundary between repository add-ons and server extensions:

- **Diagrams:** render declared views from authorized model sources; output remains derived.
- **Documents:** compose selected elements and traceability into documents; generated content does not admit new facts. Retained issued versions follow the [documents contract](../notations/packages/documents.md).
- **Business analysis:** provide cross-section views and assessments with stated coverage and evidence.
- **Design control:** assemble required evidence and route proposals through established review and approval gates.

Discovery distinguishes repository declarations, compatible implementations, installed extensions, and capabilities authorized for this caller. Useful states are **declared**, **present**, **compatible**, **available**, **partial**, **disabled**, and **unavailable**. Define them in the implementation contract: installed does not mean permitted, and absent is not disabled. Do not reveal restricted capabilities or scopes through discovery.

## Proposals, provenance, and federation

A proposal may be a patch or a package without Git writes. An enabled adapter can create a scoped branch or PR in the established change system. Proposals to model content, views, governance records, or extension policy retain their respective admission rules. Bind proposals and reviews to exact revisions; recheck conflicts and authority before admission. Retries must not create duplicate proposals. PRs, tracker records, and CI logs need an audience compatible with their content.

Each answer identifies its repository, commit, authorized paths and IDs, material status, indexing time, and coverage. Validation reports distinguish schema checks, required fields, references, notation compatibility, and evidence coverage. A check that needs inaccessible or unavailable evidence reports **cannot determine**. Automated validation, expert review, and approval remain distinct outcomes.

Federation joins independently governed repositories using stable identifiers and authorized relationships. Record the vector of source revisions rather than implying one simultaneous global commit. Cross-repository changes go through each owner's proposal and approval process. Dependency notifications are separately authorized disclosures; tracker integration must not forward restricted content to a broader audience. A central service with all repository credentials remains privileged.

## Failure behavior

- **Denied:** return no restricted content or sensitive existence information. Keep detailed decision evidence in access-controlled audit records.
- **Incomplete or unavailable:** distinguish unavailable sources from empty results. Partial answers state coverage without enumerating hidden objects.
- **Stale:** keep the last complete snapshot after failed indexing, identify it explicitly, and never mix revisions. Revocation still applies independently of refresh success.
- **Requires an executor:** report the missing human, capability, or environment through the adopter's established workflow; do not fabricate completion.

## How to start

1. Agree responsibilities, access scopes, and read/propose/review/approve/policy rights using concrete manager, engineer, and quality-review scenarios.
2. Choose one restricted repository or federation according to direct Git-access and isolation needs.
3. Pilot authorized retrieval, search, relationships, provenance, and audit for one repository. A single node with local SQLite and one index writer is a valid starting point.
4. Connect proposals to existing expert review and approval. Retain formal checks and historical records when migrating assistant guides.
5. Add extended capabilities or PostgreSQL/MySQL when measured contention, latency, recovery, or multi-node requirements justify them. Python and TypeScript are alternatives for either profile.

Follow the [reference adoption sequence and acceptance scenarios](../guides/repository-mcp-enterprise.md#12-acceptance-criteria) before production use. Choose and pin compatible protocol, SDK, and client versions against their primary documentation. Policy files, tool names, and extension configuration are implementation-specific proposals, not MCP-standard APIs. The model linter does not validate an invented server-policy schema; an implementation must supply and test that schema and its enforcement.

## Related patterns

- [Transitrix Alone](transitrix-alone.md): establish the canonical model.
- [Knowledge Store](knowledge-store.md): curate inputs before model admission.
- [Network Catalogue](network-catalogue.md): bind independently governed repositories.
- [Baseline & Audit Trail](baseline-audit-trail.md): retain baseline and admission evidence.
