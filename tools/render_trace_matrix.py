#!/usr/bin/env python3
"""Design-controls trace matrix — deterministic renderer.

Renders the audit table specified in notations/views/24-design-controls-trace-matrix.md
from an adopter repository's canon, as Markdown on stdout.

The view document carries no facts: every cell here is read from REQUIREMENT /
VERIFICATION / HAZARD / RISK_CONTROL primitives, and every gap annotation is a
rendering of a completeness rule already defined on those elements
(REQ-VERIF-COVERAGE-001/-002, HAZ-RISKCTL-COVERAGE-001/-002,
RISKCTL-VERIF-COVERAGE-001) — no new judgement is made here.

Usage:
    render_trace_matrix.py [--root <adopter-repo>] [--view <view-config.yaml>]
                           [--out <file.md>]

With no --view, the zero-configuration default of the spec (§4.1) applies:
report_type combined, every REQUIREMENT and every HAZARD in canon, all
outcomes shown, rows ordered by id.

Exit codes: 0 rendered (with or without gaps) · 2 error (unreadable canon,
unresolvable reference in the view's subject list).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def _ensure_utf8_stdio() -> None:
    # Same class of bug as tools/lint.py: the "✓ traced" / "⚠ traced"
    # cells below aren't encodable on a legacy Windows console code page, and
    # this renderer writes straight to stdout when --out is omitted.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")


_ensure_utf8_stdio()

try:
    import yaml
except ImportError:  # pragma: no cover - environment guard
    sys.stderr.write("PyYAML is required: pip install pyyaml\n")
    raise SystemExit(2)


# --- canon loading ---------------------------------------------------------

CANON_DIRS = {
    "requirement": "canon/elements/01_motivation/requirements",
    "hazard": "canon/elements/01_motivation/hazards",
    "risk-control": "canon/elements/01_motivation/risk-controls",
    "verification": "canon/verifications",
}

DEFAULT_GAP_LABELS = {
    "req_verif_coverage_001": "No verification recorded",
    "req_verif_coverage_002": "Verification recorded but not yet closed",
    "haz_riskctl_coverage_001": "No risk control recorded",
    "haz_riskctl_coverage_002": "Control recorded but not shown adequate",
    "riskctl_verif_coverage_001": "Risk-mitigating requirement lacks V&V closure",
}

CLOSED_OUTCOMES = {"pass", "fail"}


def load_dir(root: Path, rel: str) -> dict:
    """Load every *.yaml in a canon folder, keyed by element id. Admitted only."""
    out = {}
    folder = root / rel
    if not folder.is_dir():
        return out
    for path in sorted(folder.glob("*.yaml")):
        try:
            doc = yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as exc:
            sys.stderr.write(f"error: {path}: {exc}\n")
            raise SystemExit(2)
        if not isinstance(doc, dict) or "id" not in doc:
            continue
        # CONTRACT.md §6.1 — only admitted (active) artefacts are canon.
        if doc.get("admission_state") in {"proposed", "rejected"}:
            continue
        doc["__file"] = str(path.relative_to(root))
        out[doc["id"]] = doc
    return out


def load_canon(root: Path) -> dict:
    return {kind: load_dir(root, rel) for kind, rel in CANON_DIRS.items()}


# --- completeness rules ----------------------------------------------------


def verifications_for(req_id: str, verifications: dict) -> list:
    return [v for v in verifications.values() if v.get("verifies") == req_id]


def controls_for(hazard_id: str, controls: dict) -> list:
    return [c for c in controls.values() if hazard_id in (c.get("mitigates") or [])]


def requirement_gaps(req_id: str, verifications: dict, labels: dict) -> list:
    """REQ-VERIF-COVERAGE-001 / -002."""
    found = verifications_for(req_id, verifications)
    if not found:
        return [("REQ-VERIF-COVERAGE-001", labels["req_verif_coverage_001"])]
    if not any(v.get("outcome") in CLOSED_OUTCOMES for v in found):
        return [("REQ-VERIF-COVERAGE-002", labels["req_verif_coverage_002"])]
    return []


def hazard_gaps(hazard_id: str, controls: dict, verifications: dict, labels: dict) -> list:
    """HAZ-RISKCTL-COVERAGE-001 / -002 and RISKCTL-VERIF-COVERAGE-001."""
    gaps = []
    found = controls_for(hazard_id, controls)
    if not found:
        return [("HAZ-RISKCTL-COVERAGE-001", labels["haz_riskctl_coverage_001"])]
    if all(c.get("residual_risk") in {None, "unacceptable"} for c in found):
        gaps.append(("HAZ-RISKCTL-COVERAGE-002", labels["haz_riskctl_coverage_002"]))
    for control in found:
        req_id = control.get("satisfies")
        if not req_id:
            continue
        closed = [
            v for v in verifications_for(req_id, verifications)
            if v.get("outcome") in CLOSED_OUTCOMES
        ]
        if not closed:
            gaps.append(
                ("RISKCTL-VERIF-COVERAGE-001", labels["riskctl_verif_coverage_001"])
            )
            break
    return gaps


# --- rendering -------------------------------------------------------------


def fmt_verifications(req_id: str, verifications: dict, shown: list) -> str:
    found = sorted(verifications_for(req_id, verifications), key=lambda v: v["id"])
    if not found:
        return "—"
    cells = []
    for v in found:
        outcome = v.get("outcome", "not_yet_run")
        if outcome not in shown:
            cells.append(f"`{v['id']}` (hidden by status_display)")
            continue
        cells.append(f"`{v['id']}` · {v.get('method', '?')} · **{outcome}**")
    return "<br>".join(cells)


def fmt_gaps(gaps: list, outcomes: list | None = None) -> str:
    """Trace status for a row.

    "Traced" means the chain closes — a verification exists and reached a
    judgement. It does NOT mean the verification passed: a `fail` is a closed
    trace with a failing result, and the two must not read as the same thing.
    """
    if gaps:
        return "<br>".join(f"**{rule}** — {label}" for rule, label in gaps)
    if outcomes and "fail" in outcomes:
        return "⚠ traced — verification **failed**"
    return "✓ traced — verified"


def render(root: Path, view: dict) -> tuple[str, int]:
    canon = load_canon(root)
    reqs, hazards = canon["requirement"], canon["hazard"]
    controls, verifications = canon["risk-control"], canon["verification"]

    cfg = view.get("view", {}) if view else {}
    report_type = cfg.get("report_type", "combined")
    labels = {**DEFAULT_GAP_LABELS, **(cfg.get("gap_labels") or {})}
    status = cfg.get("status_display") or {}
    shown_outcomes = status.get("show_outcomes") or ["pass", "fail", "inconclusive", "not_yet_run"]
    order_by = cfg.get("order_rows_by", "id")
    subjects = cfg.get("subjects") or {}

    def pick(catalogue: dict, listed, kind: str) -> list:
        if listed is None:
            chosen = list(catalogue.values())
        else:
            chosen = []
            for element_id in listed:
                if element_id not in catalogue:
                    sys.stderr.write(
                        f"error: view names {kind} '{element_id}', which is not in canon\n"
                    )
                    raise SystemExit(2)
                chosen.append(catalogue[element_id])
        key = (lambda e: e.get("name", "")) if order_by == "name" else (lambda e: e["id"])
        return sorted(chosen, key=key)

    lines = []
    name = view.get("name") if view else "Full design-controls trace matrix"
    lines.append(f"# {name}")
    lines.append("")
    lines.append(
        f"Rendered from `{root.name}` canon — "
        f"{len(reqs)} requirement(s), {len(verifications)} verification(s), "
        f"{len(hazards)} hazard(s), {len(controls)} risk control(s) in scope of the model."
    )
    lines.append("")
    lines.append(
        "> Derived document. Every cell is read from canon; every gap is a completeness "
        "rule defined on the elements themselves, not a judgement made in this table."
    )
    lines.append("")

    gap_count = 0

    if report_type in {"requirement", "combined"}:
        chosen = pick(reqs, subjects.get("requirements"), "REQUIREMENT")
        lines.append("## Requirement chain — REQUIREMENT → VERIFICATION")
        lines.append("")
        lines.append("| Requirement | Origin | Verification | Trace status |")
        lines.append("|---|---|---|---|")
        for req in chosen:
            gaps = requirement_gaps(req["id"], verifications, labels)
            gap_count += len(gaps)
            origin = ", ".join(f"`{s}`" for s in (req.get("derived_from") or [])) or "internal"
            outcomes = [v.get("outcome") for v in verifications_for(req["id"], verifications)]
            lines.append(
                f"| `{req['id']}`<br>{req.get('name', '')} | {origin} | "
                f"{fmt_verifications(req['id'], verifications, shown_outcomes)} | "
                f"{fmt_gaps(gaps, outcomes)} |"
            )
        lines.append("")

    if report_type in {"risk", "combined"}:
        chosen = pick(hazards, subjects.get("hazards"), "HAZARD")
        lines.append("## Risk chain — HAZARD → RISK_CONTROL → REQUIREMENT → VERIFICATION")
        lines.append("")
        lines.append("| Hazard | Severity | Risk control | Realised as | Verification | Trace status |")
        lines.append("|---|---|---|---|---|---|")
        for haz in chosen:
            gaps = hazard_gaps(haz["id"], controls, verifications, labels)
            gap_count += len(gaps)
            found = sorted(controls_for(haz["id"], controls), key=lambda c: c["id"])
            if not found:
                control_cell = requirement_cell = verification_cell = "—"
            else:
                control_cell = "<br>".join(
                    f"`{c['id']}`<br>{c.get('name','')} · residual: {c.get('residual_risk', 'not_recorded')}"
                    for c in found
                )
                requirement_cell = "<br>".join(
                    f"`{c['satisfies']}`" if c.get("satisfies") else "— (not yet a design requirement)"
                    for c in found
                )
                verification_cell = "<br>".join(
                    fmt_verifications(c["satisfies"], verifications, shown_outcomes)
                    if c.get("satisfies") else "—"
                    for c in found
                )
            outcomes = [
                v.get("outcome")
                for c in found if c.get("satisfies")
                for v in verifications_for(c["satisfies"], verifications)
            ]
            lines.append(
                f"| `{haz['id']}`<br>{haz.get('name','')} | {haz.get('severity','?')} | "
                f"{control_cell} | {requirement_cell} | {verification_cell} | "
                f"{fmt_gaps(gaps, outcomes)} |"
            )
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(
        f"**{gap_count} open gap(s)** across the rendered rows."
        if gap_count
        else "**No open gaps** across the rendered rows."
    )
    lines.append("")
    return "\n".join(lines), gap_count


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=".", help="adopter repository root (default: cwd)")
    ap.add_argument("--view", help="path to a *.design-controls-trace-matrix.transitrix.yaml view-config")
    ap.add_argument("--out", help="write to this file instead of stdout")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    if not (root / "canon").is_dir():
        sys.stderr.write(f"error: no canon/ under {root}\n")
        return 2

    view = {}
    if args.view:
        view_path = Path(args.view)
        if not view_path.is_absolute():
            view_path = root / view_path
        view = yaml.safe_load(view_path.read_text(encoding="utf-8")) or {}
        if view.get("notation") != "design-controls-trace-matrix":
            sys.stderr.write(
                f"error: {view_path} is not a design-controls-trace-matrix document\n"
            )
            return 2

    text, _ = render(root, view)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        sys.stderr.write(f"written: {args.out}\n")
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
