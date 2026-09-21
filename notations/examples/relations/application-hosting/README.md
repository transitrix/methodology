# Application hosting through a compute service

This complete synthetic catalogue records a portal consuming container execution:

```text
APPLICATION-PORTAL-1 —uses→ TECHNOLOGY_SERVICE-EXECUTION-1 ←hosts— NODE-CONTAINERS-1
```

All five records carry `example: true`; their admission records describe the
fictional example, not a real deployment. The local `transitrix.yaml` defines
its catalogue boundary. Copy the directory as a unit when inspecting it.

| File | Meaning |
| --- | --- |
| [APPLICATION-PORTAL-1](canon/elements/03_application/applications/APPLICATION-PORTAL-1.yaml) | Business application consuming compute. |
| [NODE-CONTAINERS-1](canon/elements/04_technology/nodes/NODE-CONTAINERS-1.yaml) | Substrate with `type: container_platform`. |
| [TECHNOLOGY_SERVICE-EXECUTION-1](canon/elements/04_technology/services/TECHNOLOGY_SERVICE-EXECUTION-1.yaml) | Platform capability with `type: compute`. |
| [REL-PORTAL-USES-EXECUTION-1](canon/relations/REL-PORTAL-USES-EXECUTION-1.yaml) | APPLICATION → TECHNOLOGY_SERVICE consumption. |
| [REL-CONTAINERS-HOSTS-EXECUTION-1](canon/relations/REL-CONTAINERS-HOSTS-EXECUTION-1.yaml) | NODE → TECHNOLOGY_SERVICE hosting. |

Both relationships are first-class files under `canon/relations/`. There is
no APPLICATION-to-NODE `hosts` link and no inline application dependency field.
The service omits the optional inline `node` back-reference because the `hosts`
REL supplies that fact. Every REL lifecycle fits within both endpoints' windows.

From the methodology repository root, validate the catalogue with:

```sh
npx --yes @transitrix/cli@2.9.2 validate --scope=repo --root notations/examples/relations/application-hosting --strict --include-model --json
```

Expected result: exit 0, `valid: true`, no findings or skipped files, with
three elements and two relations in `model`. This is a bounded CLI check;
passing repo validation alone is not proof that every specification rule is
implemented. Inspect the field enums, admission records, reference resolution
and lifecycle against [ELEMENT_PRIMITIVES](../../../ELEMENT_PRIMITIVES.md)
§§3, 7.7, 7.24–7.25 and [REL](../../../elements/17-relations.md) §§2–3.
In CLI 2.9.2, file-scope NODE and TECHNOLOGY_SERVICE validation also passes.
File-scope APPLICATION validation reports `covered: false`, and file-scope REL
validation rejects `notation: relation` with HDR-002 even though repo-scope
validation loads and checks those relations. Use the repo command above for
this example; do not rename the REL notation to satisfy that file dispatcher.
As negative controls in a disposable copy, changing the service type to
`container_platform`, changing the `hosts` source to the APPLICATION, or
replacing the `uses` target with an unknown ID must each fail repo validation.

The manifest pins the specification version; the command separately pins the
validator version and does not claim a release of either.

See [Model application hosting and external exchange](../../../../guides/modelling-application-hosting-and-exchange.md)
for the distinction from software-to-software integration and actor participation.
