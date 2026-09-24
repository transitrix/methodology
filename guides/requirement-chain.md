# Authoring a requirement chain

The [requirement-chain contract](../notations/views/reports/requirement-chain.md)
is draft version 0.2. Its vocabulary and schema tables specify the additions;
candidate intake recognizes the relation names, but full catalogue validation and
report support still require consumer implementation. Use the proposal and its
shared example for review; do not add its new fields to a production catalogue until your pinned
methodology and consumer versions declare support.

Start with the obligation, its existing stakeholder/system/software level when
known, and the need it serves. A direct need-to-software or stakeholder-to-test
trace is legitimate. An omitted level stays unclassified. Never create filler
requirements to make a diagram rectangular.

Keep research in Field with its real source identity and revision. A driver is
a standing internal or external force, while a research document is evidence.
The proposed `source_trace` records the deliberate citation. Keep permitted codex
citations in `derived_from`; do not put a driver, raw research ID or documents
package ID in REQUIREMENT `derived_from`.

Model the product and the project (an ACTION with `type: Project`) before scoping
requirements. The proposed product/project membership relations name where a
requirement belongs even before any release exists. `required_for` still answers
which release must carry the obligation. A requirement assigned to another release
is not unassigned; a broken release link needs repair, not a clean unassigned label.
No script can safely recover membership from matching names or folder placement.

Use `parent` for decomposition and `depends_on` for dependency. The proposed
`requirement_parent` promotion permits several explicit parents. When moving an
inline link into a REL record, remove the inline copy in the same review; leaving
it behind would preserve an edge after the REL's window closes. Review the union
for cycles and inspect the actual edges, not just the columns they connect.

A VERIFICATION can reserve its method and protocol with `not_yet_run`. Record each
execution separately when its outcome must remain independently visible; qualify
it with `verified_on` for release-specific reporting. A later pass does not cancel
an earlier active fail. Withdraw an incorrect or superseded record with its
lifecycle, preserving the historical record and reason. Do not change a release
qualifier to make old evidence appear to have run on a new release.

Review counts with their contributing lists, selected context, as-at date and
snapshot. Unclassified, unassigned, invalid and unresolved are different states.
The six categories overlap. Neither cardinality nor a child's passing test proves
a parent's completion. See the [worked example](../notations/examples/requirement-chain/README.md)
for the exact expected populations and drill-downs.
