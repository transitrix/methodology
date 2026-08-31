#!/usr/bin/env node

/**
 * Validates that:
 * 1. All PlantUML version strings in integration/plantuml.md are identical
 * 2. The version matches what's locked in transitrix/transitrix-studio package-lock.json
 *
 * Exits non-zero if any check fails.
 */

import fs from 'fs';
import https from 'https';
import { createReadStream } from 'fs';

// Extract version from integration/plantuml.md
const guidePath = 'integration/plantuml.md';
const guideContent = fs.readFileSync(guidePath, 'utf8');

// Find all PlantUML version references in the guide
// Looking for patterns like "1.2024.8" or "1.2026.6"
const versionPattern = /1\.2\d{3}\.\d+/g;
const versionsInGuide = [...new Set(guideContent.match(versionPattern) || [])];

console.log('PlantUML versions found in integration/plantuml.md:');
versionsInGuide.forEach(v => console.log(`  ${v}`));

if (versionsInGuide.length === 0) {
  console.error('ERROR: No PlantUML version found in integration/plantuml.md');
  process.exit(1);
}

if (versionsInGuide.length > 1) {
  console.error(`ERROR: Multiple different PlantUML versions found in guide:`);
  versionsInGuide.forEach(v => console.error(`  ${v}`));
  process.exit(1);
}

const guideVersion = versionsInGuide[0];
console.log(`Guide version: ${guideVersion}`);

// Fetch Studio's package-lock.json to get the canonical version
console.log('\nFetching transitrix-studio package-lock.json...');

const url = 'https://raw.githubusercontent.com/transitrix/transitrix-studio/main/package-lock.json';
let lockfileContent = '';

https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error(`ERROR: Failed to fetch Studio lockfile (status ${res.statusCode})`);
    process.exit(1);
  }

  res.on('data', (chunk) => {
    lockfileContent += chunk;
  });

  res.on('end', () => {
    try {
      const lockfile = JSON.parse(lockfileContent);
      const plantumlNode = lockfile.packages?.['node_modules/@plantuml/core'];

      if (!plantumlNode || !plantumlNode.version) {
        console.error('ERROR: Could not extract PlantUML version from Studio lockfile');
        process.exit(1);
      }

      const studioVersion = plantumlNode.version;
      console.log(`Studio version: ${studioVersion}`);

      // Compare versions
      if (guideVersion !== studioVersion) {
        console.error(`\nERROR: Version mismatch!`);
        console.error(`  Guide has: ${guideVersion}`);
        console.error(`  Studio has: ${studioVersion}`);
        console.error('\nUpdate integration/plantuml.md to match Studio\'s lockfile.');
        process.exit(1);
      }

      console.log('\n✓ All PlantUML versions match');
      process.exit(0);
    } catch (err) {
      console.error(`ERROR: Failed to parse Studio lockfile: ${err.message}`);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error(`ERROR: Failed to fetch Studio lockfile: ${err.message}`);
  process.exit(1);
});
