# Repository MCP for enterprises

**Status:** recommended architecture, not an available server, deployed product, or supported Transitrix API.

**Audience:** model owners, enterprise architects, managers, and implementation teams adopting Transitrix.

## 1. Relationship to the existing pattern

Start with the [Repository MCP pattern](../patterns/transitrix-repository-mcp.md) for the governance boundary and extension model. This companion provides deployment, authorization, recovery, and acceptance guidance for an implementation team. For a reader-oriented introduction, see [Repository MCP on Transitrix.com](https://transitrix.com/repository-mcp/?utm_source=methodology-repository-mcp-enterprise).

The target model separates professional expertise, accessible model scope, permissions, and assignments in a change process. Validator is an expert-review function rather than a separate professional role. Analysis and modeling are activities that the same person may perform within an authorized scope.

All tool and field names below are **proposed contracts**, not existing APIs. Implementation and hosting are outside this guide's scope. Existing adopter files can transition without renaming: see [compatible migration](#14-compatible-role-and-onboarding-migration).

For a consumer walkthrough, see [Set up a desktop model workplace](desktop-model-workplace.md): qualified client paths, read-only connection checks, first diagrams and evidence-based review prompts.

## 2. Purpose

Repository MCP gives employees and their AI clients governed access to an enterprise model: retrieval, search, relationship analysis, automated checks, and reviewable change proposals. Users do not need Git access when the service provides access to their permitted data.

The central requirement is collaboration on one logical model with different permissions. For example, management may access strategy, engineers may access data and infrastructure, and both groups may read explicitly shared requirements.

MCP is the client interface. An application authorization layer makes access decisions, and established model governance controls admission. The MCP protocol itself does not define Transitrix layers or role semantics.

## 3. Expertise, responsibilities, and permissions

### 3.1. Four independent dimensions

| Dimension | Meaning | Examples |
|---|---|---|
| Domain expertise | Where a person can exercise professional judgment | Business analysis, data engineering, infrastructure, quality |
| Access scope | Which model content is available | Layer, domain, business unit, element set, access classification |
| Permissions | Which operations are allowed | Read, propose, review, approve, administer policy |
| Change assignment | Responsibility for a particular change | Author, expert reviewer, approver |

A profession does not automatically grant access. Permissions apply to a defined scope. Assignment as a reviewer does not open unrelated restricted areas.

### 3.2. Recommended responsibilities

| Responsibility | Accountability |
|---|---|
| Domain specialist | Uses the model and prepares proposals within their domain |
| Expert reviewer | Assesses the substantive correctness of an assigned change |
| Model scope owner | Owns the condition of a scope and approves changes within their mandate |
| Access administrator | Maintains access assignments and policies |
| Service operator | Operates, updates, and restores the service infrastructure |

One person may hold several responsibilities where enterprise policy permits. Significant changes may require an independent approver. Service administration does not confer authority to approve model content. Privileged infrastructure administrators may nevertheless have technical access to storage; deployment must recognize this trust boundary.

### 3.3. Three distinct outcomes

1. **Automated validation:** schemas, required fields, types, references, and formal constraints.
2. **Expert review:** meaning, feasibility, completeness, or quality requirements.
3. **Approval:** authorized admission of a change into canon.

Automated success does not replace expert judgment, and a favorable review does not itself approve a change. AI may prepare analysis but does not inherit an approver's authority. A business analyst, engineer, or quality specialist may perform expert review according to competence and assignment.

## 4. Access control

An access decision considers verified identity, enterprise groups, element scope, requested operation, and applicable workflow conditions. The default is denial without an explicit grant.

The initial implementation can combine groups and model scopes. Add business-unit, project, time-bound assignment, or classification conditions when a real requirement justifies them.

### 4.1. Example matrix

| Scope | Managers | Engineers | Quality specialists |
|---|---|---|---|
| Strategy | Read and propose within assigned scope | No default access | Explicit assignment |
| Data | Explicit assignment | Read and propose within assigned scope | Explicit assignment |
| Infrastructure | Explicit assignment | Read and propose within assigned scope | Explicit assignment |
| Shared approved requirements | Read | Read | Read and review within assigned scope |

Review and approval permissions are assigned separately from reading. Multiple group memberships may expand access; explicit denials take documented precedence over grants. Each right is scoped independently: `read` retrieves content; `propose` submits a change; `review` records an assigned expert conclusion; `approve` admits the exact change; `policy` changes access rules. None implies the next. A reviewer also needs access to the material being reviewed.

### 4.2. Policy ownership and storage

Use a versioned policy registry protected from ordinary model editing. It maps enterprise groups to scopes and operations. A basic scope can use layer and domain; an extended policy can support controlled element-level exceptions.

Changing a layer or classification that affects visibility is an access-boundary change. Permission to edit an element does not confer permission to disclose it to another audience. New or unclassified elements remain closed until assigned a scope. Policy changes require separately authorized review and an audit record, including reclassification through a model change. Protect policy repositories, deployment credentials, backups, database consoles, and CI configuration from ordinary proposal writers.

Identity and groups come from a trusted enterprise identity system. User or group values supplied by the language model in tool arguments are not evidence of authority.

### 4.3. Relationships and derived output

Filter content before supplying it to the language model. Enforcement covers elements, relationships, search snippets, history, documents, diagrams, errors, and analysis results.

By default, a relationship is visible only when the relationship and both endpoints are authorized. An accessible infrastructure project must not reveal a restricted strategic objective through a relationship label. Even the existence of an object may be sensitive: the service must not become an oracle for hidden identifiers.

Analysis runs on the authorized graph and reports its coverage without enumerating hidden objects. Missing dependencies in an authorized fragment are not proof that the full model has none.

Shared model content is explicitly approved for its audience. For example, engineers may receive an approved requirement to connect a new legal entity within a specified period while its strategic motivation remains restricted. The service must not automatically summarize restricted sources for a less privileged audience.

Cache entries are isolated by effective access scope and policy revision. Revocation affects subsequent requests and retrieval of stored results; already downloaded material cannot be technically recalled. Historical model revisions are also checked against current access restrictions rather than relying only on old classifications.

## 5. Sources of truth and service boundaries

Git and admitted canon remain authoritative for model content. `canon/` holds admitted elements and relationships; `views/` holds derived representations; `field/` holds material not admitted to canon. Indexing preserves these distinctions.

The SQL database stores a derived index of elements, relationships, attributes, sources, revisions, and access labels. Losing the index must not lose canon. Reviews, approvals, audit records, and idempotency records are not rebuildable index data: assign each an authoritative system and a separate retention policy.

```text
Employee's AI client
    → internal HTTPS /mcp endpoint
    → identity and permission checks
    → model operations service
    → authorized query over the index and Git snapshot
    → result with provenance and coverage
```

Keep the MCP adapter separate from model operations. Web interfaces and other integrations use the same authorization layer. A shared Git service account never transfers its broader permissions to an end user.

Responses carry repository identity, commit SHA, authorized source paths, element identifiers, material status, indexing time, and result coverage. An unavailable source produces an explicit unavailable state, not an empty result that resembles absence of data.

## 6. Basic and extended capabilities

Authorization, audit, provenance, and revision correctness are mandatory in both tiers. Security is not an optional extension.

### 6.1. Basic capabilities

| Proposed tool | Purpose |
|---|---|
| `repository_describe` | Available scopes, revision, index state, and supported capabilities |
| `element_get` | Retrieve an authorized element with provenance |
| `model_search` | Search identifiers, types, attributes, and text |
| `relations_trace` | Depth-bounded traversal of authorized relationships |
| `model_validate` | Automated checks with actual coverage stated |
| `change_propose` | Prepare a reviewable proposal against a specified revision |
| `change_get` | Read an accessible proposal and its review state |

A basic proposal can be a patch or proposal package without a Git write. An enabled change-system adapter may create a scoped branch or PR. Direct default-branch writes are unnecessary. A read-only first deployment is a delivery stage of the basic tier.

Pagination, response-size limits, graph-depth limits, timeouts, and quotas are mandatory. Do not expose arbitrary SQL, shell commands, or filesystem reads.

### 6.2. Extended capabilities

| Capability | Additional condition |
|---|---|
| Change impact analysis | Distinguish authorized coverage from the complete model |
| Revision and baseline comparison | Reauthorize historical content |
| Repository federation | Record the vector of source revisions and preserve each access boundary |
| Expert review through MCP | Verify reviewer assignment and bind conclusions to the exact revision |
| Approval requests | Route to the authoritative approval system without automatic admission |
| Diagrams and documents | Authorize every source and the delivery of generated output |
| Business analysis and design control | Check compatibility with enabled repository add-ons |
| Semantic search | Apply access restrictions before returning results to AI; isolate indexes where needed |
| Long-running operations and notifications | Bind jobs to callers, support cancellation and retention, and reauthorize result delivery |

Discovery distinguishes declared repository add-ons, compatible implementations, installed server extensions, and capabilities authorized for this caller. An installed extension does not grant permission. Discovery itself must not disclose inaccessible repository, extension, or scope names.

## 7. Repository organization

### 7.1. One restricted repository

Only trusted owners and services have complete Git access. Other users access permitted content through MCP or an interface using the same controls. This is the simplest organization when most users do not need Git.

Access to a complete clone bypasses MCP restrictions for that user. Git `sparse-checkout` selects working-tree content; it is not an authorization boundary [6].

### 7.2. Federated repositories

Strategy and engineering scopes can reside in separate repositories with independent permissions. Stable identifiers and authorized cross-repository relationships form one logical model.

Choose federation when teams need direct Git access or storage-level isolation. Split repositories along stable access boundaries, not automatically one per layer. A central service able to read every repository remains privileged. Stricter isolation may require separate services and credentials per scope.

Model size and isolation are independent: a small model may require strict separation, while a large model can use one repository.

## 8. Small repository: one node and SQLite

Use one Linux VM or container host with an HTTPS reverse proxy, MCP application, Git synchronizer, and SQLite on local storage. Enterprise identity and centralized audit remain in place.

```text
Enterprise network → HTTPS proxy → Python or TypeScript MCP
                                      ├─ local Git snapshot
                                      └─ SQLite derived index
```

One writer updates the index. Build and validate a new snapshot separately, then switch to it atomically. Each request remains pinned to one snapshot.

SQLite is appropriate when competing writes are limited and multi-node serving is unnecessary. It permits one writer at a time; do not share its database file across service hosts through a network filesystem [3].

A starting experiment could use 2–4 vCPU, 4–8 GB RAM, and SSD capacity for Git, two index snapshots, and temporary outputs. This is a pilot assumption, not measured sizing. Refine it using actual content, indexing duration, and concurrent requests.

An existing managed MySQL or PostgreSQL service is also reasonable for a small model. SQLite is not mandatory when database operations are already available.

## 9. Large repository: PostgreSQL or MySQL

Use a server database for multiple MCP instances, concurrent background work, high availability, or more demanding search.

```text
HTTPS gateway / load balancer
    → Repository MCP instances
    → model operations and authorization
    → PostgreSQL OR MySQL

Git synchronizer → validation → publish database snapshot
Workers → analysis / document generation → controlled result storage
```

Instances must not depend on unshared state on one host. If the selected transport or SDK requires session state, use its supported shared-state mechanism or session routing. Background jobs serve indexing and model analysis; they do not constitute a project execution orchestrator.

### 9.1. Database choices

| Criterion | PostgreSQL | MySQL |
|---|---|---|
| Best fit | No existing enterprise preference; richer text search and an additional row-security barrier are useful | Existing enterprise MySQL operations, backup, and support |
| Model index | Element and relationship tables with structured attributes | Equivalent logical model with adapted queries |
| Text search | Built-in text-search facilities and configurations [4] | `FULLTEXT`, with language quality and documented restrictions tested [5] |
| Authorization | Application enforcement is mandatory; RLS can add defense in depth | Application enforcement is mandatory; design SQL views, privileges, and scope isolation separately |
| Operations | Requires PostgreSQL competence | Requires MySQL competence |

**Without an existing enterprise constraint, PostgreSQL is the recommended default.** This is a design recommendation based on query needs and RLS, not a claim that MySQL is unsuitable or that PostgreSQL automatically provides security.

For PostgreSQL RLS, the service role must not be a superuser or have `BYPASSRLS`. Check table-owner behavior and whether `FORCE ROW LEVEL SECURITY` is needed. Trusted application code sets user context per transaction; pooled connections must not carry context between users [4].

For MySQL, a filter in one handler is insufficient: every read path must pass through the common authorization layer. Sensitive scopes may require separate schemas, credentials, or services with verified isolation. Equivalent isolation is also possible with PostgreSQL.

The first release need not support both databases. Select one. If portability is promised, provide migrations and integration coverage for both adapters. Do not maintain two competing copies of canon or dual-write an index to both databases without a separate justified requirement.

### 9.2. Migration triggers

Move beyond the small deployment based on measured latency, write contention, indexing duration, multi-node requirements, recovery objectives, or federation. A universal element-count threshold would be misleading because document size, graph density, and query complexity vary.

Build the new database index from Git and compare revisions, element and relationship counts, query results, and user permissions. Migrate non-derived records separately. Switch with a rollback path and without two editable sources of canon.

## 10. Python and TypeScript implementations

Both implementations use an official MCP SDK and the same operations contract [2]. Language choice does not determine access semantics or database choice. Pin SDK and protocol versions after testing compatibility with target clients.

| Aspect | Python | TypeScript |
|---|---|---|
| Foundation | Official Python MCP SDK | Official TypeScript MCP SDK on Node.js |
| Typical fit | Analytics, document processing, existing Python checks | Existing Node.js/TypeScript services and web-interface development |
| Modules | MCP adapter, domain operations, policies, Git/database adapters | The same module boundaries |
| Input checks | Explicit schemas and runtime validation | Runtime validation is mandatory; static TypeScript types are insufficient |
| Long computations | Separate worker processes | Worker threads or separate worker processes |
| Storage | SQLite, PostgreSQL, or MySQL | SQLite, PostgreSQL, or MySQL |

Choose according to team competence and existing libraries. Both languages support the small and large deployment profiles; scaling does not require a language migration.

Do not build two complete servers at once. Start with one reference implementation and language-independent contract scenarios against which a later alternative can be tested.

## 11. Synchronization, changes, and operations

A webhook or periodic poll detects a new Git revision. The synchronizer fetches, parses, validates, and indexes it, then atomically publishes the completed snapshot. If processing fails, keep the previous snapshot with an explicit stale/error state. A failed policy check must never silently become a grant.

Access revocation applies independently of model refresh success. If a required authorization check is unavailable, protected operations fail closed.

A proposal records base revision, author, scope, diff, and automated-check results. Mutations have idempotency keys bound to caller, operation, and payload; a reused key with a different payload is rejected. Persist the outcome so a timeout followed by a retry returns the original proposal, even after restart. When the base changes, check for conflicts; do not silently apply a review of old content to a new revision. A PR and its CI logs must have an audience compatible with the proposal's content.

Use an internal HTTPS endpoint, validate `Origin`, and accept tokens intended for this MCP resource. Never forward an inbound MCP token as a Git service credential [1]. Keep service secrets outside the model.

Audit records identify caller, operation, scope, authorization decision, model revision, policy revision, and outcome. Do not copy full restricted content or tokens into routine logs. Logs have access controls of their own.

Back up authoritative records, configuration, and non-derived state. A rebuildable index may use a tested recovery procedure where recovery objectives allow rebuilding. The enterprise sets and tests recovery-time and data-loss objectives.

Internal MCP hosting does not guarantee that data stays inside the enterprise: a client may send responses to a cloud model. A closed deployment needs the agent and model inside the approved boundary, or an explicitly approved enterprise processing route.

## 12. Acceptance criteria

Every control needs an allowed and a denied scenario. The minimum acceptance set is:

| Scenario | Expected result |
|---|---|
| Manager reads an authorized strategic objective | Content is returned with source and revision |
| Engineer requests the same restricted objective | No restricted content or sensitive existence information is disclosed |
| User follows a relationship with readable endpoints and relationship | The authorized relationship is returned with provenance |
| User follows a relationship with a hidden endpoint or restricted relationship | No hidden endpoint, label, or existence information is returned |
| Engineer searches a phrase from restricted strategy | No leak through snippets, relationships, suggestions, or cache |
| Assigned expert reviews a change | Conclusion is bound to identity and exact revision |
| Reviewer without approval authority tries to admit a change | Denied |
| Author without policy authority moves an element into a more open scope | Denied; model editing rights do not grant disclosure rights |
| Authorized policy owner approves a scope change | Reviewed policy revision and disclosure decision are audited before access expands |
| Authorized user retrieves a cached or historical result | Content is checked against current policy before delivery |
| User access is revoked | Subsequent requests and background-result delivery are denied |
| Required policy service is unavailable | Protected operations fail closed even when the model index is healthy |
| New snapshot passes all checks | Requests switch atomically; in-flight requests retain their pinned revision |
| New-revision indexing fails | Old snapshot is explicitly identified; revisions are not mixed |
| Mutation is retried after a timeout | No duplicate proposal is created |
| Only an authorized graph fragment is checked | The result explicitly states that coverage |
| Index is lost | It is rebuilt from the recorded Git revision without losing expert reviews |

Test performance on representative content and an agreed workload, including expensive graph queries and repeated denied requests.

## 13. Adoption sequence

1. Agree domain responsibilities, scopes, and permissions using manager, engineer, and quality-review scenarios.
2. Choose one restricted repository or federation according to direct Git-access needs.
3. Deploy retrieval, search, relationships, provenance, authorization, and audit for one repository.
4. Connect proposals to the established expert-review and approval process.
5. Add extended capabilities and a server database when measured requirements justify them.

Before implementation, select the enterprise identity provider, approved AI clients, approval system, policy owner, and operating objectives. These choices do not change the separation of responsibilities, permissions, and data.

Repository MCP remains an interface to the model and its governed change process. Development-factory control, project dispatch, releases, and deployments are outside this contract.

## 14. Compatible role and onboarding migration

Keep `AGENTS.md`, `ANALYST.md`, `VALIDATOR.md`, `INGEST.md`, and their tool-specific pointers. These filenames select assistant activities; they are not enterprise identities, group names, or permission grants. The same qualified person can analyze, model, or review in different assignments. Validator denotes expert review by a qualified business analyst, engineer, quality specialist, or other domain expert; the assistant supplies evidence within its competence and accessible scope.

| Existing consumer | Compatible interpretation and transition |
|---|---|
| Adopter `AGENTS.md` and per-tool pointers | Keep the entrypoint and local rules. Describe Modeler as an authoring mode. Record expertise, accessible scope, operation grants, and change assignment separately; a prompt does not grant any of them. |
| `ANALYST.md` | Keep cited, read-only Q&A as an assistant mode. Use only authorized sources; report incomplete coverage or unavailability instead of claiming missing model facts. |
| `VALIDATOR.md` | Keep structural, whole-repository, and blast-radius checks. Separate automated results, assigned expert conclusions, and authorized approval. A review report is not an admission record. |
| `INGEST.md` and `FINDINGS.md` | Keep candidate-only intake and propose → route → scrub. Historical labels such as `raised_by: Validator` identify the activity that produced the record; do not rewrite them as new identities. |
| Onboarding instructions and role tables | Scaffold the same filenames for new adopters. Update existing files by reviewed diffs, retaining local policy, responsibilities, and pointers. Do not overwrite adopter customizations. |
| `analyst-mcp.json` / adopter `.mcp.json` | The filesystem example is a local convenience, not Repository MCP or a read-only security policy. Retain existing configuration until an explicitly reviewed replacement is ready; preserve unrelated servers and do not replace an existing `canon` entry automatically. |
| Validation tools, CI, and admission schemas | Keep commands, error codes, required checks, and reviewer-authority records. This vocabulary transition changes no mechanical validation contract. |

The methodology repository's own operating instructions govern maintenance of the specification; they are a different consumer from the adopter `AGENTS.md` template. Do not copy them into an adopter repository.

For an existing adopter:

1. Inventory guide references, tool pointers, MCP entries, actual filesystem/Git permissions, CI checks, and approval integrations. Record who needs direct Git access.
2. Map each current assistant mode to explicit scope and operations. Keep existing grants pending review; do not infer broader access from a new label. Confirm expert competence and per-change assignments separately.
3. Apply reviewed prose updates in place. Retain historical reviews, decisions, feedback labels, IDs, and schema values. Validate local customizations and existing formal checks before rollout.
4. Choose a local trusted-reader setup or a governed service. The [filesystem reference server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) exposes write operations as well as reads. Its directory arguments and a read-only prompt do not implement enterprise scope/operation authorization. For local read-only use, enforce OS or container read-only access and constrain all alternative tools; test denied writes and out-of-scope reads. Do not use a full clone for a user whose scope excludes part of it.
5. Pilot the allowed/denied scenarios above, then update clients deliberately. Never fall back from a denied or unavailable governed service to a broader filesystem or Git credential. Rollback restores compatible guides/configuration without restoring revoked access.

## 15. Technical sources

Technical sources were checked on 17 September 2026. The role model, capability tiers, and deployment recommendations are proposals in this document.

1. MCP: [authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization), [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports). Select a mutually supported version during implementation.
2. Official SDKs: [Python](https://github.com/modelcontextprotocol/python-sdk), [TypeScript](https://github.com/modelcontextprotocol/typescript-sdk).
3. SQLite: [appropriate uses](https://www.sqlite.org/whentouse.html), [isolation](https://www.sqlite.org/isolation.html).
4. PostgreSQL: [row security policies](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), [full-text search](https://www.postgresql.org/docs/17/textsearch.html). These links pin documented behavior, not a required deployment version.
5. MySQL 8.4: [full-text restrictions](https://dev.mysql.com/doc/refman/8.4/en/fulltext-restrictions.html).
6. Git: [sparse-checkout](https://git-scm.com/docs/sparse-checkout).
