#!/usr/bin/env python3
"""
Transitrix Views Compliance Checker
Validates view notation files against notation-specific rules.

Usage:
  python3 tools/check_views_compliance.py [PATH] [--root REPO_ROOT]

PATH defaults to the current directory (scans canon/views/** recursively).
--root overrides the repository root used to locate the canon element store.

Exit codes: 0 = no errors, 1 = errors found, 2 = usage/IO error.
"""

import argparse
import glob
import os
import re
import sys
import yaml
from pathlib import Path


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Mapping from file-extension token to canonical notation identifier.
# Source: IDS_AND_REFERENCES.md §3.2, file-extension column.
EXT_TO_NOTATION = {
    "bpmn":              "bpmn",
    "dgca":              "dgca",
    "goals":             "goals",
    "fga":               "fga",
    "capabilities":      "capabilities",
    "processmap":        "processmap",
    "activities":        "activities",
    "blocks":            "blocks",
    "scenarios":         "scenarios",
    "applications":      "applications",
    "products":          "products",
    "process-blueprint": "process-blueprint",
    "compliance-impact": "compliance-impact",
    "activity-card":     "activity-card",
    "issues":            "issues",
}

# Notations that place their primary id/name under a process root, not at the
# document root.  For these, the generic "root id required" check does NOT
# apply; per-notation checks handle it instead.
NOTATIONS_WITHOUT_ROOT_ID = {"bpmn"}

# DGCA family exception (CONTRACT.md §3): dgca, goals, and activities all share
# the *.dgca.transitrix.yaml extension.  A file with this extension may declare
# any of the three notations — the extension identifies the family, not the
# specific notation layer.
DGCA_FAMILY_NOTATIONS = {"dgca", "goals", "activities"}
DGCA_FAMILY_EXTENSION = "dgca"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _notation_from_path(path: Path) -> str | None:
    """Derive the notation token from the file's double extension.

    A Transitrix view file is named  <domain>.<notation>.transitrix.yaml.
    We split on '.' and look for the segment immediately before
    'transitrix.yaml'.
    """
    parts = path.name.split(".")
    # expect at minimum: <domain> . <notation> . transitrix . yaml
    if len(parts) >= 4 and parts[-1] == "yaml" and parts[-2] == "transitrix":
        return parts[-3]
    return None


def _find_canon_root(file_path: Path) -> Path | None:
    """Walk up the directory tree from file_path to locate the canon/ root.

    Returns the Path of the directory named 'canon' that is an ancestor of
    file_path, or None if no such ancestor is found.
    """
    current = file_path.parent
    while True:
        if current.name == "canon" and (current / "elements").is_dir():
            return current
        parent = current.parent
        if parent == current:
            return None
        current = parent


def _load_all_element_ids(canon_root: Path) -> dict:
    """Return a mapping {element_id: file_path} for every YAML in canon/elements/**."""
    ids: dict = {}
    for p in canon_root.glob("elements/**/*.yaml"):
        try:
            with open(p, encoding="utf-8") as f:
                data = yaml.safe_load(f)
            if data and isinstance(data, dict) and "id" in data:
                ids[data["id"]] = str(p)
        except Exception:
            pass
    return ids


def _find_id_in_activities_views(canon_root: Path, element_id: str) -> str | None:
    """Search canon/views/activities/** for a file that declares element_id."""
    for p in canon_root.glob("views/activities/**/*.yaml"):
        try:
            with open(p, encoding="utf-8") as f:
                text = f.read()
            # Quick scan before full parse
            if element_id not in text:
                continue
            data = yaml.safe_load(text)
            if _id_in_doc(data, element_id):
                return str(p)
        except Exception:
            pass
    return None


def _id_in_doc(doc, element_id: str) -> bool:
    """Return True if element_id appears as an 'id' value anywhere in doc."""
    if isinstance(doc, dict):
        if doc.get("id") == element_id:
            return True
        return any(_id_in_doc(v, element_id) for v in doc.values())
    if isinstance(doc, list):
        return any(_id_in_doc(item, element_id) for item in doc)
    return False


# ---------------------------------------------------------------------------
# Diagnostic helpers
# ---------------------------------------------------------------------------

class CheckResult:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, code: str, msg: str):
        self.errors.append(f"  [{code}] {msg}")

    def warning(self, code: str, msg: str):
        self.warnings.append(f"  [{code}] {msg}")

    @property
    def ok(self) -> bool:
        return not self.errors


# ---------------------------------------------------------------------------
# Per-notation validators
# ---------------------------------------------------------------------------

def _check_common_header(data: dict, notation_from_ext: str | None, result: CheckResult):
    """HDR-001: notation: present.  CONTRACT.md (sect. 1.1): name: required."""
    notation_in_file = data.get("notation")
    if not notation_in_file:
        result.error("HDR-001", "Missing required 'notation:' field.")
    elif notation_from_ext:
        # DGCA family exception (CONTRACT.md sect. 3): dgca / goals / activities
        # all share the *.dgca.transitrix.yaml extension.
        is_dgca_family_ok = (
            notation_from_ext == DGCA_FAMILY_EXTENSION
            and notation_in_file in DGCA_FAMILY_NOTATIONS
        )
        if not is_dgca_family_ok and notation_in_file != notation_from_ext:
            result.error(
                "HDR-003",
                f"'notation: {notation_in_file}' does not match the file "
                f"extension '{notation_from_ext}'. Rename the file or correct "
                f"the notation header. (DGCA-family files using .dgca.transitrix.yaml "
                f"may declare notation: dgca, goals, or activities.)",
            )

    name = data.get("name")
    if not name or not str(name).strip():
        result.error("HDR-005", "Missing required 'name:' field (CONTRACT.md sect. 1.1).")


def _check_bpmn(data: dict, result: CheckResult):
    """BPMN-specific rules (01-bpmn.md §3).

    BPMN places the process identifier at process.id, not at the document root.
    Checking for a root-level 'id:' field is a false positive for BPMN files.
    """
    process = data.get("process")
    if not isinstance(process, dict):
        result.error(
            "BPMN-PROC-001",
            "Missing required 'process:' root key. "
            "BPMN files must have a 'process:' object (01-bpmn.md §3).",
        )
        return

    pid = process.get("id")
    if not pid:
        result.error(
            "BPMN-PROC-002",
            "Missing required 'process.id'. "
            "BPMN identifiers live at process.id, not at the document root.",
        )
    elif not re.match(r"^[A-Za-z][A-Za-z0-9_-]*$", str(pid)):
        result.error(
            "BPMN-PROC-003",
            f"'process.id: {pid}' does not match the required pattern "
            r"^[A-Za-z][A-Za-z0-9_-]*$ (01-bpmn.md §3).",
        )

    pname = process.get("name")
    if not pname or not str(pname).strip():
        result.error(
            "BPMN-PROC-004",
            "Missing required 'process.name'. "
            "BPMN process names live at process.name, not at the document root.",
        )


def _check_dgca(data: dict, result: CheckResult):
    """DGCA-specific rules (02-dgca.md §Validation rules).

    DGCA-016: `activities:` at root is deprecated; use `actions:`.
    DGCA-017: `view_config.layers.activities:` is deprecated; use `layers.actions:`.
    DGCA-018: `actions[].type` must be one of the project-domain enum when present.
    """
    _VALID_ACTION_TYPES = {"initiative", "programme", "project", "work_package"}

    # DGCA-016: deprecated root-level key
    if "activities" in data:
        result.warning(
            "DGCA-016",
            "'activities:' is deprecated as the DGCA fourth-column key; "
            "rename to 'actions:' (02-dgca.md §DGCA-016).",
        )

    view_config = data.get("view_config") or {}

    # DGCA-016: deprecated view_config.activities key
    if isinstance(view_config, dict) and "activities" in view_config:
        result.warning(
            "DGCA-016",
            "'view_config.activities:' is deprecated; rename to "
            "'view_config.actions:' (02-dgca.md §DGCA-016).",
        )

    # DGCA-017: deprecated view_config.layers.activities key
    layers = view_config.get("layers") if isinstance(view_config, dict) else None
    if isinstance(layers, dict) and "activities" in layers:
        result.warning(
            "DGCA-017",
            "'view_config.layers.activities:' is deprecated; rename to "
            "'view_config.layers.actions:' (02-dgca.md §DGCA-017).",
        )

    # DGCA-018: validate type enum on actions[] (canonical key)
    actions = data.get("actions") or []
    if isinstance(actions, list):
        for entry in actions:
            if not isinstance(entry, dict):
                continue
            action_type = entry.get("type")
            if action_type is not None and action_type not in _VALID_ACTION_TYPES:
                entry_id = entry.get("id", "<unknown>")
                result.warning(
                    "DGCA-018",
                    f"Action '{entry_id}': type '{action_type}' is not one of "
                    f"{sorted(_VALID_ACTION_TYPES)}. "
                    f"Treated as 'initiative' for backward compat (02-dgca.md §DGCA-018).",
                )


def _check_activity_card(data: dict, file_path: Path, result: CheckResult):
    """Activity-card validation rules (18-activity-card.md §7).

    PC-001: activity_card.project must resolve to an admitted ACTIVITY element.
    Resolution order (§6.1):
      1. canon/elements/** — recursive, primary
      2. canon/views/activities/** — secondary fallback
    The diagnostic MUST disclose the paths searched.

    PC-002: The referenced ACTIVITY must not carry an explicit non-project scale.
    PC-003: milestone.delivers_changes[] entries must appear in the project's
            delivers_changes list.
    PC-004: milestone dates should fall within Activity.valid_from/valid_to.
    """
    card_root = data.get("activity_card")
    if not isinstance(card_root, dict):
        result.error(
            "ACTIVITY-CARD-001",
            "Missing required 'activity_card:' root key "
            "(18-activity-card.md §3).",
        )
        return

    project_ref = card_root.get("project")
    if not project_ref:
        result.error(
            "PC-001",
            "'activity_card.project' is missing or empty. "
            "Provide the canonical ACTIVITY-* ID of the project this card covers.",
        )
        return

    canon_root = _find_canon_root(file_path)
    if canon_root is None:
        result.warning(
            "PC-001-SKIP",
            f"Cannot resolve '{project_ref}': no canon/ ancestor found above "
            f"{file_path.parent}. Skipping reference resolution.",
        )
        return

    # --- resolution pass 1: canon/elements/**
    searched = [str(canon_root / "elements")]
    element_ids = _load_all_element_ids(canon_root)
    resolved_data = None
    if project_ref in element_ids:
        try:
            with open(element_ids[project_ref], encoding="utf-8") as f:
                resolved_data = yaml.safe_load(f)
        except Exception:
            pass

    # --- resolution pass 2: canon/views/activities/**
    found_via_view = False
    if resolved_data is None:
        searched.append(str(canon_root / "views" / "activities"))
        view_hit = _find_id_in_activities_views(canon_root, project_ref)
        if view_hit:
            found_via_view = True
            result.warning(
                "PC-001-FALLBACK",
                f"'{project_ref}' resolved via activities view '{view_hit}' "
                f"rather than the element store. Consider promoting this "
                f"element to canon/elements/ for authoritative resolution.",
            )

    if resolved_data is None and not found_via_view:
        paths_searched = " -> ".join(searched)
        result.error(
            "PC-001",
            f"'{project_ref}' was not found after exhausting the canonical "
            f"resolution scope.\n"
            f"    Searched: {paths_searched}\n"
            f"    Expected pattern: "
            f"canon/elements/05_implementation/activities/"
            f"ACTIVITY-<DOMAIN>-<INTEGER>.yaml",
        )
        return

    # --- PC-002: verify activity_type is not an explicit non-project marker
    if resolved_data and isinstance(resolved_data, dict):
        activity_type = resolved_data.get("activity_type")
        if activity_type and activity_type != "Project":
            result.error(
                "PC-002",
                f"The ACTIVITY referenced by 'activity_card.project' "
                f"({project_ref}) carries 'activity_type: {activity_type}'. "
                f"Only Activities without an explicit type, or with "
                f"'activity_type: Project', are valid project references.",
            )

    # --- PC-003: milestone.delivers_changes[] entries must be in the project's list
    project_delivers: list = []
    if resolved_data and isinstance(resolved_data, dict):
        project_delivers = resolved_data.get("delivers_changes", []) or []

    milestones = card_root.get("milestones") or []
    for ms in milestones:
        if not isinstance(ms, dict):
            continue
        ms_id = ms.get("id", "<unknown>")
        for change_ref in ms.get("delivers_changes") or []:
            if project_delivers and change_ref not in project_delivers:
                result.error(
                    "PC-003",
                    f"Milestone '{ms_id}': delivers_changes entry '{change_ref}' "
                    f"is not listed in the project Activity's delivers_changes. "
                    f"A milestone cannot deliver a change the project isn't "
                    f"committed to (18-activity-card.md §7).",
                )

    # --- PC-004: milestone dates within Activity.valid_from/valid_to
    if resolved_data and isinstance(resolved_data, dict):
        valid_from = resolved_data.get("valid_from")
        valid_to = resolved_data.get("valid_to")
        for ms in milestones:
            if not isinstance(ms, dict):
                continue
            ms_id = ms.get("id", "<unknown>")
            ms_date = ms.get("date")
            if not ms_date:
                continue
            ms_date_str = str(ms_date)
            if valid_from and ms_date_str < str(valid_from):
                result.warning(
                    "PC-004",
                    f"Milestone '{ms_id}' date {ms_date_str} precedes the "
                    f"project Activity's valid_from ({valid_from}).",
                )
            if valid_to and ms_date_str > str(valid_to):
                result.warning(
                    "PC-004",
                    f"Milestone '{ms_id}' date {ms_date_str} is after the "
                    f"project Activity's valid_to ({valid_to}).",
                )


# ---------------------------------------------------------------------------
# File dispatcher
# ---------------------------------------------------------------------------

NOTATION_CHECKERS = {
    "bpmn":          _check_bpmn,
    "dgca":          _check_dgca,
    "activity-card": _check_activity_card,
}


def check_file(file_path: Path) -> CheckResult:
    result = CheckResult(str(file_path))

    try:
        with open(file_path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        result.error("YAML-001", f"YAML parse error: {e}")
        return result
    except OSError as e:
        result.error("IO-001", f"Cannot read file: {e}")
        return result

    if not isinstance(data, dict):
        result.error("YAML-002", "File does not parse to a YAML mapping.")
        return result

    notation_from_ext = _notation_from_path(file_path)
    _check_common_header(data, notation_from_ext, result)

    notation = data.get("notation") or notation_from_ext
    if notation and notation in NOTATION_CHECKERS:
        checker = NOTATION_CHECKERS[notation]
        if notation == "activity-card":
            checker(data, file_path, result)
        else:
            checker(data, result)

    return result


# ---------------------------------------------------------------------------
# Discovery and main
# ---------------------------------------------------------------------------

def discover_view_files(root: Path) -> list[Path]:
    """Find all *.transitrix.yaml files under root/canon/views/.

    If root/canon/views/ does not exist, returns an empty list and prints a
    diagnostic so the caller can report the discovery miss.
    """
    canon_views = root / "canon" / "views"
    if not canon_views.is_dir():
        return []
    pattern = str(canon_views / "**" / "*.transitrix.yaml")
    return [Path(p) for p in glob.glob(pattern, recursive=True)]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate Transitrix view notation files.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=".",
        help="Directory to scan (default: current directory).",
    )
    parser.add_argument(
        "--file",
        dest="single_file",
        metavar="FILE",
        help="Check a single file instead of scanning a directory.",
    )
    args = parser.parse_args(argv)

    if args.single_file:
        files = [Path(args.single_file)]
    else:
        root = Path(args.path)
        files = discover_view_files(root)
        if not files:
            canon_views = root / "canon" / "views"
            if not canon_views.is_dir():
                print(
                    f"No canon/views/ directory found under '{root}'. "
                    f"Pass the org repo root as the path argument, or use "
                    f"--file to check a single file.",
                    file=sys.stderr,
                )
                return 2

    if not files:
        print("No Transitrix view files found.")
        return 0

    total_errors = 0
    total_warnings = 0
    checked = 0

    for f in sorted(files):
        result = check_file(f)
        checked += 1
        if not result.ok or result.warnings:
            print(f"\n{result.file_path}")
            for msg in result.errors:
                print(msg)
            for msg in result.warnings:
                print(msg)
        total_errors += len(result.errors)
        total_warnings += len(result.warnings)

    print(
        f"\nChecked {checked} file(s): "
        f"{total_errors} error(s), {total_warnings} warning(s)."
    )
    if total_errors:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
