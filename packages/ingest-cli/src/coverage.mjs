// Coverage-profile awareness. Reads the adopter's `coverage_profile` from
// transitrix.yaml (COVERAGE_PROFILES.md) and classifies a candidate's TYPE / REL
// kind as in- or out-of-profile.
//
// v0 scope: the authoritative preset membership (which TYPEs `minimal` / `core` /
// `full` admit) lives in the methodology spec, which a published CLI does not ship.
// So v0 resolves the safe case — `full` (or absent) admits everything — and for any
// narrower or custom profile it FLAGS each candidate for coverage review rather than
// guessing membership. Flagged, never silently emitted and never silently dropped.

import { readManifestText } from './intake.mjs';
import { readTopScalar } from './yaml.mjs';

export async function readCoverageProfile(orgRoot) {
  const text = await readManifestText(orgRoot);
  if (!text) return null;
  return readTopScalar(text, 'coverage_profile'); // preset name, or null when omitted/custom-map
}

// Returns { flag: 'in_profile' | 'out_of_profile', reason? }.
export function classifyCoverage(profile, type) {
  if (!profile || profile === 'full') return { flag: 'in_profile' };
  return {
    flag: 'out_of_profile',
    reason:
      `coverage_profile "${profile}" — CLI v0 does not resolve preset membership; ` +
      `confirm "${type}" is in scope at review (see COVERAGE_PROFILES.md).`,
  };
}
