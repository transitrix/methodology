#!/usr/bin/env node
// Standalone preflight: no vocabulary or extraction dependencies.
import { checkIntakeProfile, selectIntakeProfile } from './src/intake-profile.mjs';

const [command, root, flag, profile, ...extra] = process.argv.slice(2);
if (command === '--help') {
  console.log('transitrix-intake-profile check|select <org-root> --profile ingest|knowledge-store');
} else if (!['check', 'select'].includes(command) || !root || flag !== '--profile' || !profile || extra.length) {
  console.error('Usage: transitrix-intake-profile check|select <org-root> --profile ingest|knowledge-store');
  process.exitCode = 1;
} else {
  try {
    const operation = command === 'select' ? selectIntakeProfile : checkIntakeProfile;
    console.log(JSON.stringify(await operation(root, profile), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
