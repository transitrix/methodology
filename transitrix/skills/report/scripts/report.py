#!/usr/bin/env python3
"""Report-skill orchestrator — a thin, agent-neutral layer over the
`@transitrix/cli export-compliance` renderer command.

Per the report-skill architecture decision:
the report's parameters live in a *declarative view-config artefact*, the
deterministic rendering lives in the CLI, and this script only orchestrates —
it resolves parameters, materialises a named view-config, shells out to the
renderer, and reports back the config path it used. It contains NO render
logic; everything that turns (view-config + canon) into a matrix is the CLI's
job.

Two render paths, mirroring the CLI:

  ad-hoc   — a one-off scope (matrix | gap | law:<ID> | product:<ID>); nothing
             is written. Fastest path for "just show me the matrix".
  named    — a reusable, committed view-config artefact addressed by id; this
             script writes/updates it, then renders it. This is the
             reproducible / auditable path the ADR is about.

The script is deliberately dependency-free (stdlib only) and cross-platform.
It does not import any AI-agent runtime — it is invoked the same way under any
agent, or by a human at a shell.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

# --- spec defaults (notations/views/21 §4.1 and 22 §4.1) -------------------
# Mirrored here ONLY so the script can *state* what it assumed; the renderer
# applies them itself. Keep in sync with the specs if their defaults change.
IMPACT_DEFAULTS = {
    "subjects": "all PRODUCTs in canon",
    "obligations": "every REQUIREMENT bearing on the subjects (no filter)",
    "grouping": "obligation x product-stage-task",
    "status_display": "all five statuses; proposed hidden",
    "order": "rows by id, columns in process-order",
}
COVERAGE_DEFAULTS = {
    "subjects": "all PRODUCTs in canon",
    "regimes": "every codex artefact in codex/ (no filter)",
    "grouping": "subject@task x regime",
    "coverage_rule": "any-active-assertion; proposed hidden",
    "order": "rows and columns by id; all summary totals shown",
}

DEFAULT_CLI = os.environ.get("TRANSITRIX_CLI", "transitrix")
CLI_PACKAGE = "@transitrix/cli"


def find_cli(cli: str) -> list[str] | None:
    """Resolve the renderer CLI invocation. Tries the bare binary, then `npx`
    (the `@transitrix/cli` package for the default binary, or the override
    name itself for a custom TRANSITRIX_CLI)."""
    if shutil.which(cli):
        return [cli]
    if shutil.which("npx"):
        return ["npx", CLI_PACKAGE if cli == DEFAULT_CLI else cli]
    return None


def split_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def yaml_list(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


# --- view-config materialisation -------------------------------------------

def methodology_version(root: Path) -> str:
    """Pin the artefact's methodology_version from the adopter manifest if we
    can find one, else fall back to the spec baseline. Keeps a materialised
    artefact conformant in the repo it is written into."""
    for candidate in [root / "transitrix.yaml", *root.glob("organizations/*/transitrix.yaml")]:
        try:
            text = candidate.read_text(encoding="utf-8")
        except OSError:
            continue
        m = re.search(r'^methodology_version:\s*"?([^"\s#]+)"?', text, re.MULTILINE)
        if m:
            return m.group(1)
    return "0.5.0"


def build_view_config(args, notation: str, mver: str) -> tuple[str, list[str]]:
    """Render a canonical view-config document as text. Returns (yaml, applied)
    where `applied` is the human-readable list of spec defaults left to the
    renderer (the fields the caller did NOT pin)."""
    defaults = IMPACT_DEFAULTS if notation == "compliance-impact" else COVERAGE_DEFAULTS
    products = split_list(args.products)
    lines = [
        f"# Materialised by the Transitrix report skill — {notation} view-config.",
        f"# Renders via `@transitrix/cli export-compliance`; spec: notations/views/"
        + ("21-compliance-impact.md" if notation == "compliance-impact" else "22-coverage-metric.md")
        + ".",
        "",
        f"notation: {notation}",
        'spec_version: "0.1"',
        f'methodology_version: "{mver}"',
        "",
        "view:",
        f"  id: {args.report_id}",
        f'  name: "{args.name}"',
    ]
    if args.description:
        lines.append(f'  description: "{args.description}"')

    applied: list[str] = []
    if products:
        lines.append("  subjects:")
        lines.append(f"    products: {yaml_list(products)}")
    else:
        applied.append(f"subjects = {defaults['subjects']}")

    if notation == "compliance-impact":
        obligations = split_list(args.obligations)
        codex = split_list(args.obligations_codex)
        if obligations:
            lines.append("  obligations:")
            lines.append(f"    include: {yaml_list(obligations)}")
        elif codex:
            lines.append("  obligations:")
            lines.append("    filter:")
            lines.append(f"      derived_from_codex: {yaml_list(codex)}")
        else:
            applied.append(f"obligations = {defaults['obligations']}")
        applied.append(f"grouping = {defaults['grouping']}")
        applied.append(f"status display = {defaults['status_display']}")
    else:
        regimes = split_list(args.regimes)
        if regimes:
            lines.append("  regimes:")
            lines.append(f"    include: {yaml_list(regimes)}")
        else:
            applied.append(f"regimes = {defaults['regimes']}")
        applied.append(f"grouping = {defaults['grouping']}")
        applied.append(f"coverage rule = {defaults['coverage_rule']}")
    applied.append(f"ordering = {defaults['order']}")

    return "\n".join(lines) + "\n", applied


def config_path(registry: Path, report_id: str, notation: str) -> Path:
    slug = report_id.lower().replace("_", "-")
    return registry / f"{slug}.{notation}.transitrix.yaml"


# --- commands ---------------------------------------------------------------

def cmd_render(args) -> int:
    root = Path(args.root).resolve()
    cli = find_cli(args.cli)
    if cli is None:
        print(
            f"report: renderer CLI '{args.cli}' not found on PATH (nor via npx). "
            f"Install `@transitrix/cli` (`npm install -g @transitrix/cli`, or use "
            f"`npx @transitrix/cli`) or set TRANSITRIX_CLI.",
            file=sys.stderr,
        )
        return 127

    cmd = [*cli, "export-compliance", "--format", args.format, "--root", str(root)]

    # ── ad-hoc scope path — nothing is materialised ────────────────────────
    if args.scope and not args.report_id:
        cmd += ["--scope", args.scope]
        if args.output:
            cmd += ["--output", args.output]
        print(f"[report] ad-hoc render — scope: {args.scope}, format: {args.format}", file=sys.stderr)
        if args.scope == "matrix":
            print("[report] assumed: full matrix, no filters (zero-config default).", file=sys.stderr)
        return run_cli(cmd, args.output)

    # ── named view-config path — materialise then render ───────────────────
    if not args.report_id:
        print("report: provide --report-id (named view) or --scope (ad-hoc).", file=sys.stderr)
        return 2
    if not args.name:
        print("report: --name is required when materialising a named view-config.", file=sys.stderr)
        return 2

    registry = Path(args.registry).resolve() if args.registry else (root / "canon" / "views" / args.notation)
    cfg_path = config_path(registry, args.report_id, args.notation)
    yaml_text, applied = build_view_config(args, args.notation, methodology_version(root))

    if not args.dry_run:
        registry.mkdir(parents=True, exist_ok=True)
        existed = cfg_path.exists()
        cfg_path.write_text(yaml_text, encoding="utf-8")
        print(f"[report] {'updated' if existed else 'wrote'} view-config: {cfg_path}", file=sys.stderr)
    else:
        print(f"[report] --dry-run — would write: {cfg_path}", file=sys.stderr)
        print(yaml_text, file=sys.stderr)

    if applied:
        print("[report] applied spec defaults (not pinned in the config):", file=sys.stderr)
        for item in applied:
            print(f"           - {item}", file=sys.stderr)

    if args.dry_run:
        return 0

    cmd += ["--report", args.report_id]
    if args.output:
        cmd += ["--output", args.output]
    rc = run_cli(cmd, args.output)
    # The crux of the skill's contract: always hand back the config path used.
    print(f"\n[report] rendered from: {cfg_path}", file=sys.stderr)
    return rc


def cmd_list(args) -> int:
    root = Path(args.root).resolve()
    registry = Path(args.registry).resolve() if args.registry else root
    found = []
    for path in registry.rglob("*.transitrix.yaml"):
        if "node_modules" in path.parts:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if not re.search(r"^notation:\s*(compliance-impact|coverage-metric)", text, re.MULTILINE):
            continue
        idm = re.search(r"^\s*id:\s*(\S+)", text, re.MULTILINE)
        namem = re.search(r'^\s*name:\s*"?([^"\n]+)"?', text, re.MULTILINE)
        found.append((idm.group(1) if idm else "?", namem.group(1).strip() if namem else "", path))
    if not found:
        print(f"No saved compliance/coverage view-configs under {registry}.")
        return 0
    print(f"Saved report view-configs under {registry}:\n")
    for rid, name, path in sorted(found):
        print(f"  {rid:<40} {name}")
        print(f"  {'':<40} {path}")
    return 0


def run_cli(cmd: list[str], output: str | None) -> int:
    """Shell out to the renderer. Markdown without --output streams to stdout
    (so the agent can show it inline); everything else the CLI writes to disk."""
    try:
        result = subprocess.run(cmd)
    except FileNotFoundError as exc:
        print(f"report: failed to launch renderer: {exc}", file=sys.stderr)
        return 127
    return result.returncode


# --- argv -------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="report.py",
        description="Thin orchestrator over `@transitrix/cli export-compliance` (ADR 2026-06-09).",
    )
    p.add_argument("--cli", default=DEFAULT_CLI, help=f"renderer binary (default: {DEFAULT_CLI}; or $TRANSITRIX_CLI)")
    sub = p.add_subparsers(dest="command", required=True)

    r = sub.add_parser("render", help="render a report (ad-hoc scope or named view-config)")
    r.add_argument("--notation", choices=["compliance-impact", "coverage-metric"], default="compliance-impact")
    r.add_argument("--scope", help="ad-hoc scope: matrix | gap | law:<ID> | product:<ID>")
    r.add_argument("--report-id", help="canonical view id (named, reusable view-config)")
    r.add_argument("--name", help="human-readable view name (required for a named view-config)")
    r.add_argument("--description", help="optional view description")
    r.add_argument("--products", help="comma-separated PRODUCT-… ids to scope to")
    r.add_argument("--obligations", help="comma-separated REQUIREMENT-… ids (compliance-impact)")
    r.add_argument("--obligations-codex", help="comma-separated codex ids to filter obligations by (compliance-impact)")
    r.add_argument("--regimes", help="comma-separated codex ids as regime columns (coverage-metric)")
    r.add_argument("--format", choices=["md", "pdf"], default="md")
    r.add_argument("--output", help="output file path (default: stdout for md)")
    r.add_argument("--root", default=".", help="repo root to scan for canon (default: cwd)")
    r.add_argument("--registry", help="directory for named view-configs (default: <root>/canon/views/<notation>)")
    r.add_argument("--dry-run", action="store_true", help="materialise/show the config but do not render")
    r.set_defaults(func=cmd_render)

    ls = sub.add_parser("list", help="list saved report view-configs")
    ls.add_argument("--root", default=".", help="repo root (default: cwd)")
    ls.add_argument("--registry", help="directory to scan (default: <root>)")
    ls.set_defaults(func=cmd_list)

    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
