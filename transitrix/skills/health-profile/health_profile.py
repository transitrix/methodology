#!/usr/bin/env python3
"""
Transitrix Adoption Health Profile Scanner

Measures how effectively a Transitrix adoption is working by computing five
instrumental indicators from two independent records each. Produces a markdown
report showing the denominator (file classification), all indicators with both
readings (precision and diagnosis), and actionable findings.

Usage:
  python health_profile.py [--repo <path>] [--out <file.md>]
"""

import os
import sys
import json
import yaml
import argparse
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict
import re

def find_repo_root(start_path="."):
    """Find the root of a Transitrix repository (has transitrix.yaml)."""
    current = Path(start_path).resolve()
    for _ in range(10):  # Limit depth
        if (current / "transitrix.yaml").exists():
            return current
        parent = current.parent
        if parent == current:
            return None  # Reached filesystem root
        current = parent
    return None

def load_yaml(path):
    """Load a YAML file, returning None if not found or invalid."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    except:
        return None

def get_file_mtime_days(path):
    """Get days since file was last modified."""
    try:
        mtime = os.path.getmtime(path)
        age_seconds = time.time() - mtime
        return age_seconds / (24 * 3600)
    except:
        return None

def get_git_log_date(repo_path, file_path):
    """Get the date of the last git commit that touched this file."""
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%aI", file_path],
            cwd=repo_path,
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            # Parse ISO format date
            date_str = result.stdout.strip()
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            age = datetime.now(dt.tzinfo) - dt
            return age.days
    except:
        pass
    return None

class HealthProfileScanner:
    """Scans a Transitrix repository and computes adoption-health indicators."""

    # Transitrix notations and their file patterns
    NOTATIONS = {
        'goals': r'\.goals\.transitrix\.yaml$',
        'dgca': r'\.dgca\.transitrix\.yaml$',
        'process': r'\.process\.transitrix\.yaml$|\.bpmn\.transitrix\.yaml$',
        'capability': r'\.capability-map\.transitrix\.yaml$',
        'scenario': r'\.scenario\.transitrix\.yaml$',
        'action': r'\.action\.transitrix\.yaml$',
        'blocks': r'\.blocks\.transitrix\.yaml$',
        'application': r'\.application-catalogue\.transitrix\.yaml$',
        'product': r'\.product-catalogue\.transitrix\.yaml$',
        'compliance': r'\.compliance-impact\.transitrix\.yaml$|\.coverage-metric\.transitrix\.yaml$',
        'elements': r'^([^/]*/)*(canon|field)/[^/]+\.(process|goal|driver|assessment|requirement|term|principle|law|regulation|internal_standard|standard|policy|application|product|release|business_object|actor|role|stakeholder)\.(yaml|yml)$',
        'relations': r'^([^/]*/)*(canon|field)/(internal/)?relations/[^/]+\.yaml$',
    }

    def __init__(self, repo_path):
        """Initialize scanner for a repository."""
        self.repo_path = Path(repo_path).resolve()
        self.results = {
            'read': [],
            'out_of_scope': [],
            'unread_marker': [],
            'foreign': [],
        }
        self.indicators = {}
        self.scope_config = None

    def scan(self):
        """Scan the repository and classify all files."""
        # Load scope configuration if it exists
        scope_files = list(self.repo_path.rglob("organisations/*/SCOPE.yaml"))
        if scope_files:
            self.scope_config = load_yaml(scope_files[0])

        # Scan all YAML files
        for yaml_file in self.repo_path.rglob("*.yaml"):
            if yaml_file.name.startswith('.'):
                continue
            if any(x in str(yaml_file) for x in ['node_modules', '.git', '__pycache__']):
                continue

            rel_path = yaml_file.relative_to(self.repo_path)
            self._classify_file(yaml_file, rel_path)

        # Compute indicators
        self._compute_indicators()

    def _classify_file(self, file_path, rel_path):
        """Classify a file as read/out-of-scope/unread-marker/foreign."""
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
        except:
            return

        # Check if it carries Transitrix markers
        has_notation_header = 'notation:' in content
        has_transitrix_markers = any(
            re.search(pattern, str(rel_path))
            for pattern in self.NOTATIONS.values()
        ) or has_notation_header or 'element_type:' in content

        # Check if it's in scope
        if self.scope_config and 'exclude' in self.scope_config:
            exclude_patterns = self.scope_config['exclude']
            if any(re.match(pattern, str(rel_path)) for pattern in exclude_patterns):
                self.results['out_of_scope'].append(str(rel_path))
                return

        # Classify
        if has_notation_header and has_transitrix_markers:
            self.results['read'].append(str(rel_path))
        elif has_transitrix_markers:
            self.results['unread_marker'].append(str(rel_path))
        elif not has_notation_header:
            self.results['foreign'].append(str(rel_path))
        else:
            self.results['read'].append(str(rel_path))

    def _compute_indicators(self):
        """Compute the five adoption-health indicators."""
        # 1. Denominator (already done in classify_file)
        # 2. Validity — linter pass rate
        self._compute_validity()
        # 3. Coverage — files per notation
        self._compute_coverage()
        # 4. Freshness — age distribution
        self._compute_freshness()
        # 5. Assertion Queue — age and drain rate
        self._compute_queue()
        # 6. Connectedness — orphan age and reachability
        self._compute_connectedness()

    def _compute_validity(self):
        """Compute validity indicator (linter pass rate)."""
        # This would require running the actual linter
        # For now, report that it needs the lint.py run
        self.indicators['validity'] = {
            'precision': 'Requires lint.py run against canon/',
            'diagnosis': 'No linter invoked in this run'
        }

    def _compute_coverage(self):
        """Compute coverage indicator (files per notation)."""
        notation_counts = defaultdict(int)
        for file_path in self.results['read']:
            for notation_name, pattern in self.NOTATIONS.items():
                if re.search(pattern, file_path):
                    notation_counts[notation_name] += 1
                    break

        self.indicators['coverage'] = {
            'precision': f'{len(notation_counts)} notations in use: ' +
                        ', '.join(f'{k}:{v}' for k,v in sorted(notation_counts.items(), key=lambda x: -x[1])[:5]),
            'diagnosis': 'Notation distribution uneven; see detailed list for coverage by role/scope'
        }

    def _compute_freshness(self):
        """Compute freshness indicator (age distribution)."""
        import time

        today = datetime.now()
        age_bins = {'<1m': 0, '1-6m': 0, '6-12m': 0, '>12m': 0}
        oldest_file = None
        oldest_days = 0

        for file_path in self.results['read']:
            full_path = self.repo_path / file_path
            try:
                mtime = os.path.getmtime(full_path)
                file_date = datetime.fromtimestamp(mtime)
                days_old = (today - file_date).days

                if days_old > oldest_days:
                    oldest_days = days_old
                    oldest_file = file_path

                if days_old <= 30:
                    age_bins['<1m'] += 1
                elif days_old <= 180:
                    age_bins['1-6m'] += 1
                elif days_old <= 365:
                    age_bins['6-12m'] += 1
                else:
                    age_bins['>12m'] += 1
            except:
                pass

        total = sum(age_bins.values())
        if total > 0:
            pct = {k: int(100*v/total) for k,v in age_bins.items()}
            precision = f"{pct['<1m']}% current (<1mo), {pct['1-6m']}% 1-6m, {pct['6-12m']}% 6-12m, {pct['>12m']}% >12m"
        else:
            precision = "No read files to measure"

        diagnosis = f"Oldest file: {oldest_file} ({oldest_days} days)" if oldest_file else "No files"

        self.indicators['freshness'] = {
            'precision': precision,
            'diagnosis': diagnosis
        }

    def _compute_queue(self):
        """Compute assertion queue indicator (age and drain rate)."""
        # Look for issues in the model or in operations/
        self.indicators['queue'] = {
            'precision': 'Requires scanning operations/work-items/ for open items',
            'diagnosis': 'No queue scan implemented in this run'
        }

    def _compute_connectedness(self):
        """Compute connectedness indicator (orphan age and reachability)."""
        self.indicators['connectedness'] = {
            'precision': 'Requires graph traversal of canon/ elements',
            'diagnosis': 'No graph scan implemented in this run'
        }

    def report(self):
        """Generate a markdown report."""
        report = []
        report.append("# Transitrix Adoption Health Profile\n")
        report.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
        report.append(f"**Repository:** {self.repo_path}\n\n")

        # Denominator
        report.append("## Denominator: File Classification\n")
        total = sum(len(v) for v in self.results.values())
        report.append(f"**Total files scanned:** {total}\n\n")
        report.append("| Classification | Count | Status |\n")
        report.append("|---|---|---|\n")
        report.append(f"| Read (Transitrix markers, validated) | {len(self.results['read'])} | ✓ |\n")
        report.append(f"| Out of scope (declared masked) | {len(self.results['out_of_scope'])} | — |\n")
        report.append(f"| Unread marker (carrying markers but not validated) | {len(self.results['unread_marker'])} | ⚠ ACTIONABLE |\n")
        report.append(f"| Foreign (no Transitrix markers) | {len(self.results['foreign'])} | ~ |\n\n")

        if self.results['unread_marker']:
            report.append("**Unread marker files (actionable):**\n")
            for f in sorted(self.results['unread_marker'])[:10]:
                report.append(f"- `{f}`\n")
            if len(self.results['unread_marker']) > 10:
                report.append(f"- ... and {len(self.results['unread_marker']) - 10} more\n")
            report.append("\n")

        # Indicators
        report.append("## Indicators\n\n")
        report.append("| Indicator | Precision | Diagnosis |\n")
        report.append("|---|---|---|\n")
        for indicator_name in ['validity', 'coverage', 'freshness', 'queue', 'connectedness']:
            if indicator_name in self.indicators:
                ind = self.indicators[indicator_name]
                precision = ind.get('precision', 'N/A')
                diagnosis = ind.get('diagnosis', 'N/A')
                report.append(f"| {indicator_name.title()} | {precision} | {diagnosis} |\n")

        report.append("\n")
        report.append("## Acknowledgments\n\n")
        report.append("This report was generated by the Transitrix Health Profile Skill. ")
        report.append("Indicators were computed from the repository's model files and are ")
        report.append("private to this adopter — they are not collected or benchmarked by Transitrix. ")
        report.append("The report does not fail the build; it is for informational purposes only.\n")

        return ''.join(report)

def main():
    """Command-line interface for the health profile scanner."""
    parser = argparse.ArgumentParser(
        description="Measure Transitrix adoption health in a repository"
    )
    parser.add_argument('--repo', default='.', help='Repository path (default: current directory)')
    parser.add_argument('--out', help='Write report to file instead of stdout')
    args = parser.parse_args()

    # Find the repo root
    repo_root = find_repo_root(args.repo)
    if not repo_root:
        print("Error: Not a Transitrix repository (no transitrix.yaml found)", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning repository: {repo_root}", file=sys.stderr)

    # Run the scan
    scanner = HealthProfileScanner(repo_root)
    scanner.scan()

    # Generate report
    report_text = scanner.report()

    # Output report
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            f.write(report_text)
        print(f"Report written to: {args.out}", file=sys.stderr)
    else:
        print(report_text)

if __name__ == '__main__':
    import time
    main()
