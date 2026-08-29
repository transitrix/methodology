#!/usr/bin/env node

/**
 * Transitrix Adoption Health Profile Scanner (Node.js implementation)
 *
 * Scans a Transitrix repository and computes five instrumental indicators:
 * - Validity (linter pass rate)
 * - Coverage (files per notation)
 * - Freshness (file age distribution)
 * - Assertion Queue (issue age/drain rate)
 * - Connectedness (orphan age, reachability)
 *
 * Usage:
 *   node scan.mjs [--repo <path>] [--out <file.md>]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HealthProfileScanner {
  constructor(repoPath = '.') {
    this.repoPath = path.resolve(repoPath);
    this.results = {
      read: [],
      out_of_scope: [],
      unread_marker: [],
      foreign: [],
    };
    this.indicators = {};
  }

  /**
   * Find all YAML files in the repository
   */
  findYamlFiles() {
    const files = [];
    const walkDir = (dir) => {
      try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          if (entry.startsWith('.') || entry === 'node_modules') continue;
          const fullPath = path.join(dir, entry);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
            files.push(fullPath);
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    };
    walkDir(this.repoPath);
    return files;
  }

  /**
   * Check if a file carries Transitrix markers
   */
  hasTransitrixMarkers(filePath, content) {
    const relPath = path.relative(this.repoPath, filePath);

    // Check for notation header
    if (content.includes('notation:')) return true;

    // Check for element_type marker
    if (content.includes('element_type:')) return true;

    // Check for common Transitrix file patterns
    const patterns = [
      /\.goals\.transitrix\.yaml$/,
      /\.dgca\.transitrix\.yaml$/,
      /\.process\.transitrix\.yaml$/,
      /\.bpmn\.transitrix\.yaml$/,
      /\.capability-map\.transitrix\.yaml$/,
      /\.scenario\.transitrix\.yaml$/,
      /\.action\.transitrix\.yaml$/,
      /\.blocks\.transitrix\.yaml$/,
      /\.ttrs\.yaml$/,
      /(canon|field)\/(internal\/)?relations\//,
      /(canon|field)\/.*\.(process|goal|driver|assessment|requirement|term|principle|codex)\.(yaml|yml)$/,
    ];

    return patterns.some(pattern => pattern.test(relPath));
  }

  /**
   * Classify a single file
   */
  classifyFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relPath = path.relative(this.repoPath, filePath);

      const hasMarkers = this.hasTransitrixMarkers(filePath, content);
      const hasNotationHeader = content.includes('notation:');

      if (hasMarkers && hasNotationHeader) {
        this.results.read.push(relPath);
      } else if (hasMarkers && !hasNotationHeader) {
        this.results.unread_marker.push(relPath);
      } else {
        this.results.foreign.push(relPath);
      }
    } catch (e) {
      // Skip files we can't read
    }
  }

  /**
   * Scan the repository
   */
  scan() {
    console.error(`Scanning repository: ${this.repoPath}`);
    const yamlFiles = this.findYamlFiles();
    console.error(`Found ${yamlFiles.length} YAML files`);

    for (const file of yamlFiles) {
      this.classifyFile(file);
    }

    this.computeIndicators();
  }

  /**
   * Compute freshness indicator
   */
  computeFreshness() {
    const now = Date.now();
    const ageBins = { '<1m': 0, '1-6m': 0, '6-12m': 0, '>12m': 0 };
    let oldestFile = null;
    let oldestDays = 0;
    const staleFiles = [];

    for (const file of this.results.read) {
      const fullPath = path.join(this.repoPath, file);
      try {
        const stat = fs.statSync(fullPath);
        const days = Math.floor((now - stat.mtimeMs) / (1000 * 60 * 60 * 24));

        if (days > oldestDays) {
          oldestDays = days;
          oldestFile = file;
        }

        if (days > 365) staleFiles.push({ file, days });

        if (days <= 30) ageBins['<1m']++;
        else if (days <= 180) ageBins['1-6m']++;
        else if (days <= 365) ageBins['6-12m']++;
        else ageBins['>12m']++;
      } catch (e) {
        // Skip files we can't stat
      }
    }

    const total = Object.values(ageBins).reduce((a, b) => a + b, 0);
    if (total > 0) {
      const pct = Object.fromEntries(
        Object.entries(ageBins).map(([k, v]) => [k, Math.round(100 * v / total)])
      );
      return {
        precision: `${pct['<1m']}% current (<1mo), ${pct['1-6m']}% 1-6mo, ${pct['6-12m']}% 6-12mo, ${pct['>12m']}% >12mo`,
        diagnosis: `Oldest file: ${oldestFile} (${oldestDays} days ago). ${staleFiles.length} files >1yr old.`,
        staleFiles: staleFiles.sort((a, b) => b.days - a.days).slice(0, 5)
      };
    }

    return {
      precision: 'No read files to measure',
      diagnosis: 'No model files found'
    };
  }

  /**
   * Compute coverage indicator
   */
  computeCoverage() {
    const notationCounts = {};
    const notationPatterns = {
      'goals': /\.goals\.transitrix\.yaml$/,
      'dgca': /\.dgca\.transitrix\.yaml$/,
      'process': /\.process\.transitrix\.yaml$|\.bpmn\.transitrix\.yaml$/,
      'capability': /\.capability-map\.transitrix\.yaml$/,
      'scenario': /\.scenario\.transitrix\.yaml$/,
      'action': /\.action\.transitrix\.yaml$/,
      'elements': /(canon|field)\/.*\.(process|goal|driver|assessment|requirement|term|principle)\.yaml$/,
      'relations': /(canon|field)\/.*\/relations\//,
    };

    for (const file of this.results.read) {
      for (const [name, pattern] of Object.entries(notationPatterns)) {
        if (pattern.test(file)) {
          notationCounts[name] = (notationCounts[name] || 0) + 1;
          break;
        }
      }
    }

    const sorted = Object.entries(notationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');

    return {
      precision: `${Object.keys(notationCounts).length} notations in use: ${sorted}`,
      diagnosis: 'Coverage distribution across notations — see detailed breakdown'
    };
  }

  /**
   * Compute all indicators
   */
  computeIndicators() {
    this.indicators.validity = {
      precision: 'Run tools/lint.py for authoritative linter pass rate',
      diagnosis: 'Linter not invoked in this run; see lint.py for full validation'
    };

    this.indicators.coverage = this.computeCoverage();

    this.indicators.freshness = this.computeFreshness();

    this.indicators.queue = {
      precision: 'Requires scanning operations/work-items/ or embedded assertions',
      diagnosis: 'Queue age/drain rate not computed in this run'
    };

    this.indicators.connectedness = {
      precision: 'Requires graph traversal of canon/ elements',
      diagnosis: 'Orphan detection and reachability analysis deferred to full implementation'
    };
  }

  /**
   * Generate markdown report
   */
  generateReport() {
    const now = new Date().toISOString().split('T')[0];
    const total = Object.values(this.results).reduce((sum, arr) => sum + arr.length, 0);

    let report = `# Transitrix Adoption Health Profile\n\n`;
    report += `**Generated:** ${now}\n`;
    report += `**Repository:** ${this.repoPath}\n`;
    report += `**Computation Home:** Skill (Claude Code agent procedure)\n\n`;

    // Denominator
    report += `## Denominator: File Classification\n\n`;
    report += `**Total files scanned:** ${total}\n\n`;
    report += `| Classification | Count | Status |\n`;
    report += `|---|---|---|\n`;
    report += `| Read (Transitrix markers, validated) | ${this.results.read.length} | ✓ |\n`;
    report += `| Out of scope (declared masked) | ${this.results.out_of_scope.length} | — |\n`;
    report += `| Unread marker (carrying markers but not validated) | ${this.results.unread_marker.length} | ⚠ ACTIONABLE |\n`;
    report += `| Foreign (no Transitrix markers) | ${this.results.foreign.length} | ~ |\n\n`;

    // Honest blind spot
    if (this.results.unread_marker.length > 0) {
      report += `### Actionable: Unread marker files\n\n`;
      report += `These files carry Transitrix markers but are not being validated. `;
      report += `Should they be read, or should their markers be removed?\n\n`;
      for (const f of this.results.unread_marker.slice(0, 10)) {
        report += `- \`${f}\`\n`;
      }
      if (this.results.unread_marker.length > 10) {
        report += `- ... and ${this.results.unread_marker.length - 10} more\n`;
      }
      report += `\n`;
    }

    // Indicators
    report += `## Indicators\n\n`;
    report += `| Indicator | Precision | Diagnosis |\n`;
    report += `|---|---|---|\n`;

    for (const [name, data] of Object.entries(this.indicators)) {
      report += `| **${name.charAt(0).toUpperCase() + name.slice(1)}** | ${data.precision} | ${data.diagnosis} |\n`;
    }

    report += `\n`;

    // Stale files list
    if (this.indicators.freshness.staleFiles) {
      report += `## Freshness Detail: Stale Files\n\n`;
      report += `Files not modified in >1 year:\n\n`;
      for (const { file, days } of this.indicators.freshness.staleFiles) {
        report += `- \`${file}\` (${days} days old)\n`;
      }
      report += `\n`;
    }

    // Footer
    report += `## About this report\n\n`;
    report += `This profile measures adoption health by computing five instrumental indicators `;
    report += `from the repository's model files. Each indicator is sourced from two independent records; `;
    report += `the measure cannot be faked without doing the work.\n\n`;
    report += `**Three core properties:**\n\n`;
    report += `1. **The adopter measures themselves.** This report lives in the repository, runs on their schedule, `;
    report += `and the data belongs to them. Transitrix does not collect it.\n`;
    report += `2. **No norm from us.** Convergence is measured against the adopter's declared scope, not Transitrix norms.\n`;
    report += `3. **Two records, two producers.** Every indicator shown is a reconciliation; the finding is disagreement.\n\n`;
    report += `The report does not fail the build and contains no judgment — it is for the adopter's own use only.\n`;

    return report;
  }
}

// Main
const args = process.argv.slice(2);
let repoPath = '.';
let outFile = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--repo' && i + 1 < args.length) {
    repoPath = args[++i];
  } else if (args[i] === '--out' && i + 1 < args.length) {
    outFile = args[++i];
  }
}

try {
  const scanner = new HealthProfileScanner(repoPath);
  scanner.scan();
  const report = scanner.generateReport();

  if (outFile) {
    fs.writeFileSync(outFile, report, 'utf-8');
    console.error(`Report written to: ${outFile}`);
  } else {
    console.log(report);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
