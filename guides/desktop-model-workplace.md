---
title: Set up a desktop model workplace
status: qualified
last_reviewed: 2026-09-26
audience: public
license: MIT
---

# Set up a desktop model workplace

Use this guide to prepare a read-only workplace for asking questions about an authorized model and viewing its diagrams. Start with one synthetic source, then connect real model data after the access checks pass.

**Qualification, 26 September 2026:** the client instructions below are based on current official documentation, not an independently reproduced desktop installation. No client/package combination is certified as working by this guide. Exact installed versions and viewer package versions are **not yet verified**. A working setup requires the [independent walkthrough](#verify-the-installed-setup), including failures and recovery. Do not buy a plan on the assumption that this guide establishes compatibility.

The two target surfaces are **ChatGPT Desktop** and **Claude Code Desktop (Code tab, Local session)**. The earlier Claude Desktop chat target is a different surface: neither its connector setup nor a successful chat diagram establishes Code-tab compatibility. Automated document and link checks qualify this guide; installed-client walkthroughs are post-delivery user acceptance testing (UAT), required before claiming a particular setup works.

## What you are connecting

| Part | What it does | What it does not establish |
| --- | --- | --- |
| Desktop client | ChatGPT Desktop or the Code tab in the Claude desktop app, where you ask questions and inspect results | A browser session does not prove the same feature works here. |
| Authorized model repository | The model sources and revisions you are permitted to read | A full local clone is inappropriate if you may read only part of it. |
| Instructions or skills | Tell the assistant how to cite evidence and prepare analysis | Prompts do not grant permissions or prevent writes. A coding-agent skill is not automatically installed in desktop chat. |
| Repository MCP | A proposed governed interface for retrieving, searching and tracing model evidence | Methodology supplies the [pattern](../patterns/transitrix-repository-mcp.md), not a deployed server. Actual tool names come from your implementation. |
| Viewer | Turns supported model sources into a diagram | A picture is derived output; successful rendering does not validate all facts or save a decision. |

The [enterprise guide](repository-mcp-enterprise.md) remains the contract reference for scope, identity, provenance and change governance. This consumer procedure does not define another API.

## Start with the smallest read-only setup

Use one approved local source and a read-only viewer adapter, if your installed client accepts its transport and UI. This needs neither a hosted Repository MCP service nor an enterprise index. It proves viewing only: broader questions need actual authorized retrieval and analysis capabilities.

If your administrator has supplied only an HTTP endpoint, use the separately qualified remote path below. A local process using **stdio** exchanges messages with the desktop over its standard input/output; it is not a URL. **Streamable HTTP** connects to a server address. An HTTP-only connection cannot launch a stdio adapter by entering its command in the URL field.

### On your workstation

Have the official desktop app, an approved account, permission to install the supplied adapter, and a synthetic practice source. Record the actual OS version, app version/build and date from the installed app or OS package information; a download date is not a version. Use the runtime version required by the adapter's own instructions, if any.

Get the administrator's exact executable and argument list, supported notation list, example source, expected content hash and read-only permission boundary. Use absolute paths in local configuration. Do not install an arbitrary filesystem connector as a substitute: the [existing filesystem example](repository-mcp-enterprise.md#14-compatible-role-and-onboarding-migration) includes write capabilities.

### From the model owner or administrator

Before connection, obtain:

- An approved adapter/package version or immutable source revision and build instructions, artifact checksum, runtime requirements and actual tool names. A source checkout alone is not a desktop installation.
- One synthetic fixture with expected labels and SHA-256, supported rendering features and size limits. Do not assume all Transitrix notations or all PlantUML syntax are supported.
- The exact permitted source bindings, read operations and isolation controls. Local process permissions must enforce the intended boundary across all available tools; a read-only tool annotation or prompt is insufficient.
- For a remote service: the real endpoint, transport/protocol versions, identity provider, granted read scope, network reachability and retention policy. `https://model.example.com/mcp` is a placeholder, not a service.
- The expected source/revision readback and recovery procedure. For a viewer-only adapter, a content hash identifies bytes but is not a repository commit, observation date or admission record.

A package is ready for these steps only when that handoff is complete. This guide supplies no viewer installer, registry package, credentials or default service. Existing [Studio integration guidance](../integration/studio.md) describes the IDE product; its release number does not identify a desktop MCP viewer.

## Client capability and prerequisite table

The vendor facts in this table were checked on **2026-09-26**. They are prerequisites to a trial, not a supported Transitrix desktop combination.

| Dimension | ChatGPT Desktop | Claude Code Desktop (Code tab, Local) |
| --- | --- | --- |
| Official installation / OS | Use the downloads linked from the [desktop page](https://learn.chatgpt.com/docs/app) for macOS, Windows or Linux; its Mac download is Apple Silicon. Check installer OS requirements; exact minimum OS for this walkthrough is unverified. | Use the [Code desktop quickstart](https://code.claude.com/docs/en/desktop-quickstart): macOS, Windows, or Ubuntu/Debian Linux beta. Check current installer requirements; exact OS/build for this walkthrough is unverified. |
| Account / plan | Sign in with an approved ChatGPT account. [Work is included](https://learn.chatgpt.com/docs/pricing) in Free, Go, Plus, Pro, Business, Edu and Enterprise; workspace controls and actual MCP access still need checking. | Approved Anthropic account with Pro, Max, Team or Enterprise for the Code tab, per the quickstart. Organization policy must permit Code and the selected tools; chat-plan access alone is insufficient. |
| Local transport | Official [desktop MCP settings](https://learn.chatgpt.com/docs/extend/mcp) list STDIO and Streamable HTTP. This is a desktop-specific source, not inferred from web support. | [Claude Code MCP](https://code.claude.com/docs/en/mcp) documents stdio. The [desktop reference](https://code.claude.com/docs/en/desktop#shared-configuration) describes shared configuration; verify the effective definition in the Code session. |
| Remote connection | Desktop HTTP supports OAuth/bearer authentication. Hosted ChatGPT plugin registration is a different path; do not treat its success as local desktop evidence. | Claude Code documents HTTP MCP configuration. A manually configured server and an account connector have different connection paths; obtain the actual origin, authentication and scope from the administrator. Do not infer laptop reachability from chat connector availability. |
| Source-available status | Methodology pattern/instructions are available. A supplied adapter still needs a pinned build and compatibility review. | Same; a source prototype is not a published extension or a tested installation. |
| Installed-and-tested versions/date | None recorded: app, OS, viewer package and runtime all unverified; no desktop test date. | None recorded: app, OS, viewer package and runtime all unverified; no desktop test date. |
| Post-delivery evidence | Organization’s authorized tester records the exact ChatGPT combination and outcomes. | Adopter feedback must identify the Code tab, Local session and exact combination; feedback pending. |
| Viewer embedding / interaction | Not yet verified: resource size, sandbox, labels, navigation, expansion and refresh. | Not yet verified: same checks. |
| Unsupported in this walkthrough | Writes/approval; arbitrary files; undocumented renderer features; direct stdio through an HTTP-only connection. | Same. Chat, Cowork, CLI, cloud, SSH and WSL results do not establish this Local Code-tab combination. |

**Source-available** means inspectable instructions or implementation, **installed-and-tested** means an independent reader reproduced the named build, **unsupported** means outside this procedure or an established incompatibility, and **not-yet-verified** means evidence is absent. Keep these states separate when recording your result.

## ChatGPT Desktop path — unverified installation procedure

1. Install from the official desktop page above and sign in. Record the app/build, OS and account plan. Start a local session; check the chosen workspace permits the intended MCP server. Older applications may not match these dated instructions.
2. Open **Settings → MCP servers → Add server**. For the supplied local adapter, choose **STDIO** and enter its exact executable and arguments. For a supplied remote service, choose **Streamable HTTP** and enter its approved URL. Save and select **Restart**. Use **Authenticate** when OAuth is required; inspect connected servers with `/mcp`. These controls are described in the [official MCP guide](https://learn.chatgpt.com/docs/extend/mcp).
3. Confirm only the intended server/tools are available for this session. Keep unrelated configuration intact; disable unrelated capabilities in the practice session according to workspace policy. Verify read-only enforcement with the administrator before using real sources.
4. Apply the short instructions below and run the connection, readback and diagram checks. If the viewer does not embed, record that outcome and stop claiming desktop rendering support.

For an administrator-provided **hosted** plugin, OpenAI documents **Settings → Security and login → Developer mode**, then **Plugins → plus** to register the connection and inspect discovered tools. Availability depends on policy. Follow the [official connection instructions](https://developers.openai.com/plugins/deploy/connect-chatgpt), then independently verify use inside the named installed desktop. This is optional and does not convert a local stdio executable into an HTTP service.

## Claude Code Desktop path — unverified installation procedure

1. Follow the [official Code desktop quickstart](https://code.claude.com/docs/en/desktop-quickstart), sign in, open **Code**, choose **Local**, and select only the approved synthetic practice folder. Record the desktop build, embedded Claude Code version if exposed, OS and plan separately. The app includes Claude Code; the adapter may have its own runtime requirement.
2. Have the administrator supply the reviewed server definition in the project `.mcp.json` or user `~/.claude.json`, following [Claude Code MCP configuration](https://code.claude.com/docs/en/mcp). Use its exact executable/arguments for stdio or approved HTTP URL/authentication. Preserve unrelated entries and keep secrets out of version control. No adapter command is supplied by this guide.
3. Inspect the effective server and tools in this **Code** session. The [desktop reference](https://code.claude.com/docs/en/desktop#shared-configuration) currently documents loading chat-app `claude_desktop_config.json` servers into local Code sessions too, including precedence rules. Check for duplicate names; shared configuration does not establish shared viewer behavior.
4. Confirm administrator-enforced read-only access across file, shell and MCP tools before continuing. A read-only adapter alone cannot constrain the coding client's other tools. Do not enable automatic edits or bypass permissions for this procedure; a prompt or permission-mode label is not an isolation boundary.
5. Run the same connection, readback, diagram and recovery checks below. Record retrieval without an embedded diagram as retrieval only. Report unsupported rendering explicitly.

For account integrations, the [desktop connector controls](https://code.claude.com/docs/en/desktop#connect-external-tools) are **+ → Connectors**, managed under **Settings → Connectors**. Treat that route separately from the manually configured adapter. Confirm connection origin and granted scope before using a remote source. No tunnel, new service or broader credentials are needed for this guide.

## Instructions and data flow

Paste this into the practice conversation, or place it in your organization's supported instruction mechanism:

> Read only the authorized sources. Cite source IDs, paths and revisions for factual claims. Separate admitted model facts, raw observations and your inferences. State missing, stale or contradictory evidence and analysis coverage. Do not write, approve, send, or save decisions. Before showing a diagram, identify its source and revision or content hash. If a needed capability is unavailable, say so.

These instructions guide behavior; access controls enforce it. Skills may package them for a compatible client, but do not assume `/transitrix:onboard` or coding-agent plugin commands work in desktop chat.

**Local does not mean offline.** The adapter reads allowed local bytes and gives results to the client; model-visible tool content may be sent to the AI provider. Viewer resources and source content may also enter the host UI. A locally rendered diagram does not prove that its underlying data stayed on the workstation. For remote connections, requests and responses also pass through the service and its processing/logging boundary; account connectors can introduce a provider-hosted connection path distinct from a manually configured local MCP process. Record the actual path rather than assuming all Claude surfaces use the same origin.

Before using real data, confirm with the administrator which fields/files leave the workstation, model processing and training settings, retention, logging, viewer network access and sharing controls. Grant only the required read scope. Local adapters run under an OS identity; remote OAuth authorizes particular service operations. Neither a client login nor a manager's job title confers model approval rights. Never paste credentials into a prompt or example configuration.

## Connection, readback and first diagram

Use the same synthetic fixture bytes for both clients. If the adapter supports self-contained Goals 0.1, use the existing [six-goal example](../notations/examples/goals/strategy-2026.goals.transitrix.yaml). Its root is **Triple revenue in 3 years**, with child **Launch in 3 EU markets** and grandchild **Open Berlin office**. These are illustrative facts, not an admitted organizational model. The example's SHA-256 at this guide revision is `432c1e72e0790d41610550289000dfa7b919f69f57ae9e5501f2729767d5de7e`. Copy its bytes to the approved practice location and ask the administrator to bind only that copy. If the adapter requires a different fixture, obtain its versioned example and expected hash first; do not assume renderer compatibility.

1. Confirm connection and tool discovery. Ask: “Which read and view operations are actually available to me?” Compare the response with the client tool list. Tool names in the enterprise guide are proposals, not commands to paste.
2. Retrieve the approved example using the discovered read/view operation. Ask: “Show the source identity, revision or SHA-256, and the expected goal labels. State whether this is a fixture or admitted model evidence.” Compare with the administrator's expected bytes/hash. An assistant repeating a hash from this prompt is not a successful readback.
3. Ask: “Render that same source using the available viewer. Show the source identity and revision/hash beside the diagram. Do not redraw the model from memory.” Confirm the six labels and their hierarchy, including the root/child/grandchild chain above. Test fit, zoom, navigation and expansion where the viewer declares them supported.
4. Read the source again and compare identity/hash. Viewing must leave its bytes unchanged. If only a content hash is available, label repository revision **unavailable**. Do not substitute a timestamp or renderer version for source provenance.

An optional browser preview may help isolate a rendering problem. Record it as **browser-only**; it proves no desktop embedding, transport compatibility or in-client interaction.

## Questions for your first model review

Once an actual Repository MCP implementation exposes the required authorized operations, use these prompts. A viewer alone cannot answer them from a picture.

| Purpose | Prompt |
| --- | --- |
| Attention and risks | “Within my authorized scope, what needs attention? Cite modeled risks, unmet requirements and blocking dependencies; distinguish evidence from your prioritization. State coverage and observation dates.” |
| Baseline changes | “Compare revision A with revision B. Identify changed goals, requirements and dependencies, cite both baselines, and separate changed facts from changed interpretation. If either revision is unavailable, stop the comparison.” |
| Traceability | “Trace this permitted action to requirements, decisions and objectives. Cite each relationship. Mark missing links; do not infer hidden endpoints.” |
| Alternatives | “Compare these options against the recorded criteria at revision A. Show supported consequences, assumptions and unknown costs. Keep the alternatives hypothetical and leave accepted sources unchanged.” |
| Decision preparation | “Prepare the question, options, evidence, tradeoffs and recommendation. Name the decision owner only if the model establishes one. State what remains unknown and where an authorized decision would be recorded.” |

Use actual revision identities in place of A/B. Baseline access must be reauthorized under current policy. A fresh index or recent commit is not proof of recent observation. Missing evidence is **unknown**, stale evidence needs its date and limitation, and contradictions need both permitted sources rather than silent reconciliation. No findings does not mean no risk. Operational progress, spend and performance require their own authoritative data; model commitments are not live metrics.

Chat output is neither the authoritative model nor a saved decision. Follow the existing [baseline/audit pattern](../patterns/baseline-audit-trail.md) and [decision guidance](../method/07-decisions.md) where applicable. Canonical proposals, expert review and approval bind to Git branches/PRs and exact revisions. When DSM is used, its existing operational persistence owns durable pending edits and workspace review metadata, with DSM responsible for the API and PR adapter. Methodology supplies the host-independent contract and Studio the shared consumer interfaces. These responsibilities do not establish implemented endpoints or supported editing interfaces, and do not require every adopter to deploy DSM. Until a supported persistence interface is supplied, mark pending edits and review continuity as unsaved/unavailable; an index or chat history is not their authoritative store.

## Verify the installed setup

For post-delivery UAT, an authorized reader should reproduce the procedure without help from its author. Record ChatGPT Desktop results independently from adopter feedback for Claude Code Desktop; a pass in either does not establish the other. Pending feedback does not block delivery of these explicitly qualified instructions. Retain direct in-client evidence in the organization's access-controlled evidence location, not in public examples. Record date, OS/build, app/build, account/plan policy, adapter package/version or commit/build checksum, runtime, transport, protocol, fixture hashes and actual tool names. Record **not run** separately from failure.

| Check | Required observable result |
| --- | --- |
| Connection and readback | Client discovers permitted tools and retrieves the expected fixture bytes/labels with source provenance. |
| First diagram | In-client evidence shows readable labels, source identity/hash, supported navigation/expansion, and the host's resource-size/sandbox result. |
| Denied scope | A prearranged synthetic out-of-scope request is refused without disclosing hidden content or existence. Do not use real restricted data as a probe. |
| Missing source | Remove or rename only a disposable fixture copy; the next read reports unavailable and does not present an old picture as current. Restore and retry. |
| Unsupported renderer | Request a notation deliberately absent from the adapter's declared support; receive a useful unsupported result, not an invented picture. |
| Stale-source recovery | Change a disposable copy, refresh and read back; the new hash/labels must replace the old ones. With a repository service, verify snapshot revision and explicit stale state during failed refresh. |
| Read-only boundary | Source hashes remain unchanged after reads. No write/apply tools are available; authorized negative probes of mutation attempts are rejected by enforcement. |
| Reconnect / restart | Disconnect/reconnect and fully restart the app; repeat discovery and readback without widening scope or mixing revisions. |

Until these checks pass for the exact installed combination, retain **not-yet-verified** status. Source tests, a successful build and browser rendering are useful evidence but do not replace this walkthrough.

## Troubleshooting

| Symptom | Next step |
| --- | --- |
| MCP setting or connector missing | Check exact app/build, account/workspace policy and the dated vendor instructions. Record unavailable capability; do not infer it from another client or browser. |
| Transport cannot connect | Check command versus URL and local versus cloud origin. A stdio adapter needs a stdio-capable path; do not invent an HTTP bridge. Ask the administrator for a compatible artifact. |
| Authentication or scope denied | Reauthenticate through the supported client flow; have the owner verify the intended read grant. Preserve denial and never substitute broader Git/filesystem credentials. |
| Local file missing | Check approved binding, absolute path and process permissions with the administrator. Rebind only the authorized fixture; do not grant a whole home directory. |
| Text response but no diagram | Check declared notation, UI support, resource size and sandbox diagnostics. Treat unsupported rendering separately from successful retrieval. |
| Diagram is stale | Compare source hash/revision, refresh and read again; show the last snapshot as stale while recovery fails. Do not mix it with newer facts. |
| Reconnect does not help | Fully quit/restart the app; inspect client/server diagnostics, without sharing tokens or real model content. Repeat discovery/readback and record the changed version/configuration. |

## Later: governed changes

Enable editing only after the model owner supplies a real proposal workflow: explicit base revision, reviewable diff, automated validation, assigned expert review, separate approval, durable retry/recovery and final source readback. Read, propose, review, approve and policy administration are independent rights. Unsaved alternatives stay visibly unsaved. See the [enterprise acceptance criteria](repository-mcp-enterprise.md#12-acceptance-criteria); this read-only walkthrough accepts none of those write capabilities.
