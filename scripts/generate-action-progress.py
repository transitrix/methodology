#!/usr/bin/env python3
"""
Generate analytics/action-progress.ndjson from ACTION elements with GitHub issue links.

Scans transitrix-hq canon for ACTION elements carrying `link:` fields pointing at
GitHub issues, computes completion percentages, and writes results in NDJSON format.
"""

import json
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional

def run_gh(args: list) -> str:
    """Run GitHub CLI command and return stdout."""
    result = subprocess.run(["gh"] + args, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        print(f"Warning: gh {' '.join(args)} failed: {result.stderr}")
        return ""
    return result.stdout.strip()

def get_issue_completion_percent(issue_url: str) -> Optional[float]:
    """
    Compute completion percent for a GitHub issue.
    Returns 0-100 if issue is open, 100 if closed, None if not found.
    """
    # Extract owner/repo/number from URL
    match = re.match(r'https://github\.com/([^/]+)/([^/]+)/issues/(\d+)', issue_url)
    if not match:
        print(f"Warning: Could not parse issue URL: {issue_url}")
        return None

    owner, repo, issue_num = match.groups()

    # Query issue state via GitHub API
    result = run_gh([
        "api",
        f"repos/{owner}/{repo}/issues/{issue_num}",
        "-H", "Accept: application/vnd.github.v3+json"
    ])

    if not result:
        print(f"Warning: Issue not found or inaccessible: {issue_url}")
        return None

    try:
        issue = json.loads(result)
        state = issue.get("state", "open")

        # For now, simple logic: closed = 100%, open = 0%
        # In future, this can check for sub-issues
        return 100.0 if state == "closed" else 0.0
    except json.JSONDecodeError:
        print(f"Warning: Could not parse issue response: {issue_url}")
        return None

def load_action_from_file(file_path: Path) -> Optional[tuple]:
    """
    Load a single ACTION element from a YAML file.
    Returns (id, link) if link exists, otherwise None.
    """
    try:
        with open(file_path, 'r') as f:
            content = f.read()

        # Extract id
        id_match = re.search(r'^id:\s*(ACTION-[A-Z0-9-]+)', content, re.MULTILINE)
        if not id_match:
            return None

        action_id = id_match.group(1)

        # Extract link if present
        link_match = re.search(r'^link:\s*(https://github\.com/[^\s]+)', content, re.MULTILINE)
        if not link_match:
            return None  # No link field

        link = link_match.group(1).strip('"\'')
        return (action_id, link)
    except Exception as e:
        print(f"Warning: Could not parse {file_path}: {e}")
        return None

def main():
    """Main entry point."""
    hq_repo = Path("C:/GitHub/transitrix-hq")
    actions_dir = hq_repo / "canon" / "elements" / "05_implementation" / "actions"
    output_file = hq_repo / "analytics" / "action-progress.ndjson"

    if not actions_dir.exists():
        print(f"Error: ACTION directory not found: {actions_dir}")
        return False

    # Ensure output directory exists
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Scan for ACTION elements
    all_actions = {}

    print(f"Scanning for ACTION elements in {actions_dir}...")
    for yaml_file in sorted(actions_dir.glob("*.yaml")):
        action = load_action_from_file(yaml_file)
        if action:
            action_id, link = action
            all_actions[action_id] = link
            print(f"  Found: {action_id}")

    print(f"\nTotal ACTIONs with links: {len(all_actions)}")

    # Compute completion percentages
    print("Computing completion percentages...")
    results = []
    timestamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

    for action_id in sorted(all_actions.keys()):
        link = all_actions[action_id]
        percent = get_issue_completion_percent(link)
        if percent is not None:
            result = {
                "id": action_id,
                "link": link,
                "percent": int(percent),
                "computed_at": timestamp
            }
            results.append(result)
            print(f"  {action_id}: {percent:.0f}%")

    # Write output file
    print(f"\nWriting {len(results)} rows to {output_file}...")
    with open(output_file, 'w') as f:
        for result in results:
            f.write(json.dumps(result, separators=(',', ':')) + '\n')

    print("Done.")
    return len(results) > 0

if __name__ == "__main__":
    exit(0 if main() else 1)
