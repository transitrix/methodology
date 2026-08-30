import { scanText } from './privacy-scan.mjs';
import { test } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';

test('PII-004: ISO 8601 dates are not flagged', () => {
  const result = scanText('The decision was made on 2026-06-07.');
  strictEqual(result.outcome, 'CLEAN', 'ISO date should not trigger PII detection');
});

test('PII-004: ISO 8601 dates standalone are not flagged', () => {
  const result = scanText('2026-06-07');
  strictEqual(result.outcome, 'CLEAN', 'Standalone ISO date should be CLEAN');
});

test('PII-004: emails are still flagged', () => {
  const result = scanText('Contact john.doe@example.com for details.');
  strictEqual(result.outcome, 'STRIPPED', 'Email should be detected and stripped by default');
});

test('PII-004: phone-shaped tokens are still flagged', () => {
  const result = scanText('Call +1-555-123-4567 for support.');
  strictEqual(result.outcome, 'STRIPPED', 'Phone number should be detected and stripped');
});

test('PII-004: quoted ISO date in paragraph is not redacted', () => {
  const result = scanText('The policy effective date is 2026-06-07 and supersedes all prior versions.');
  strictEqual(result.outcome, 'CLEAN', 'ISO date in longer paragraph should not be redacted');
  strictEqual(result.redactedText, undefined, 'No redaction should occur');
});

test('PII-004: mixed content with email and ISO date', () => {
  const result = scanText('Email me at test@example.com by 2026-06-07.');
  strictEqual(result.outcome, 'STRIPPED', 'Email should be detected; date should not');
});
