// Tests for figure caption formatting and HTML wrapping (render-vivliostyle.mjs)
// Verifies formatFigureCaptions() and wrapHtmlForPrintRendering() functions

import { formatFigureCaptions, wrapHtmlForPrintRendering } from '../src/render-vivliostyle.mjs';

let failures = 0;

function check(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.log(`  ✗ ${message}`);
    failures += 1;
  }
}

// Test 1: formatFigureCaptions processes figures with snapshot IDs
{
  const html = `
    <figure data-snapshot-id="snap-001">
      <img src="diagram.svg" />
      <figcaption>System Architecture</figcaption>
    </figure>
  `;
  const snapshots = {
    'snap-001': {
      generated_at: '2026-09-02T14:45:00Z'
    }
  };
  const result = formatFigureCaptions(html, snapshots);
  check(result.includes('System Architecture (Sep 2, 2026)'), 'Caption includes snapshot date');
  check(result.includes('data-snapshot-id="snap-001"'), 'Snapshot ID preserved');
}

// Test 2: formatFigureCaptions handles missing snapshots gracefully
{
  const html = `
    <figure data-snapshot-id="snap-missing">
      <figcaption>Orphaned diagram</figcaption>
    </figure>
  `;
  const snapshots = {};
  const result = formatFigureCaptions(html, snapshots);
  check(result === html, 'HTML unchanged when snapshot missing');
}

// Test 3: formatFigureCaptions skips figures without snapshot IDs
{
  const html = `
    <figure>
      <figcaption>Unsourced diagram</figcaption>
    </figure>
  `;
  const snapshots = { 'snap-001': { generated_at: '2026-09-02T14:45:00Z' } };
  const result = formatFigureCaptions(html, snapshots);
  check(result === html, 'Figures without snapshot-id unchanged');
}

// Test 4: formatFigureCaptions handles empty snapshots
{
  const html = `<figure data-snapshot-id="snap-001"><figcaption>Test</figcaption></figure>`;
  const result = formatFigureCaptions(html, {});
  check(result === html, 'HTML unchanged when snapshots object is empty');
}

// Test 5: formatFigureCaptions handles null/undefined snapshots
{
  const html = `<figure data-snapshot-id="snap-001"><figcaption>Test</figcaption></figure>`;
  const result1 = formatFigureCaptions(html, null);
  const result2 = formatFigureCaptions(html, undefined);
  check(result1 === html, 'HTML unchanged when snapshots is null');
  check(result2 === html, 'HTML unchanged when snapshots is undefined');
}

// Test 6: formatFigureCaptions handles invalid dates gracefully
{
  const html = `
    <figure data-snapshot-id="snap-bad">
      <figcaption>Bad date test</figcaption>
    </figure>
  `;
  const snapshots = {
    'snap-bad': {
      generated_at: 'not-a-date'
    }
  };
  const result = formatFigureCaptions(html, snapshots);
  check(result.includes('Bad date test (Unknown date)'), 'Invalid date uses fallback');
}

// Test 7: formatFigureCaptions handles multiple figures
{
  const html = `
    <figure data-snapshot-id="snap-001">
      <figcaption>First diagram</figcaption>
    </figure>
    <figure data-snapshot-id="snap-002">
      <figcaption>Second diagram</figcaption>
    </figure>
  `;
  const snapshots = {
    'snap-001': { generated_at: '2026-09-02T14:45:00Z' },
    'snap-002': { generated_at: '2026-09-03T10:30:00Z' }
  };
  const result = formatFigureCaptions(html, snapshots);
  check(result.includes('First diagram (Sep 2, 2026)'), 'First caption formatted');
  check(result.includes('Second diagram (Sep 3, 2026)'), 'Second caption formatted');
}

// Test 8: formatFigureCaptions preserves figure content
{
  const html = `
    <figure data-snapshot-id="snap-001">
      <img src="diagram.svg" alt="Test diagram" />
      <figcaption>Original caption</figcaption>
      <p>Additional content</p>
    </figure>
  `;
  const snapshots = {
    'snap-001': { generated_at: '2026-09-02T14:45:00Z' }
  };
  const result = formatFigureCaptions(html, snapshots);
  check(result.includes('src="diagram.svg"'), 'Image source preserved');
  check(result.includes('<p>Additional content</p>'), 'Additional content preserved');
  check(result.includes('Original caption (Sep 2, 2026)'), 'Caption appended with date');
}

// Test 9: wrapHtmlForPrintRendering generates complete HTML document
{
  const html = '<p>Test content</p>';
  const metadata = {
    issuer: 'Test Org',
    document_identity: 'TEST-DOC',
  };
  const result = wrapHtmlForPrintRendering(html, metadata);
  check(result.includes('<!DOCTYPE html>'), 'Includes DOCTYPE');
  check(result.includes('<html lang="en">'), 'Includes html tag');
  check(result.includes('<style>'), 'Includes style tag');
  check(result.includes('<p>Test content</p>'), 'Preserves content');
  check(result.includes('TEST-DOC'), 'Includes document identity');
}

// Test 10: wrapHtmlForPrintRendering formats figure captions
{
  const html = `
    <figure data-snapshot-id="snap-001">
      <figcaption>Diagram</figcaption>
    </figure>
  `;
  const metadata = {
    snapshots: {
      'snap-001': { generated_at: '2026-09-02T14:45:00Z' }
    }
  };
  const result = wrapHtmlForPrintRendering(html, metadata);
  check(result.includes('Diagram (Sep 2, 2026)'), 'Figure caption formatted in wrapper');
}

// Test 11: wrapHtmlForPrintRendering escapes metadata
{
  const html = '<p>Content</p>';
  const metadata = {
    issuer: '<script>alert("xss")</script>',
    document_identity: 'DOC & MORE'
  };
  const result = wrapHtmlForPrintRendering(html, metadata);
  check(!result.includes('<script>'), 'Script tags escaped in issuer');
  check(result.includes('&amp;'), 'Ampersands escaped in identity');
}

// Test 12: formatFigureCaptions handles figures without figcaption
{
  const html = `
    <figure data-snapshot-id="snap-001">
      <img src="diagram.svg" />
    </figure>
  `;
  const snapshots = {
    'snap-001': { generated_at: '2026-09-02T14:45:00Z' }
  };
  const result = formatFigureCaptions(html, snapshots);
  check(result === html, 'Figures without figcaption are skipped');
}

// Test 13: formatFigureCaptions date formatting for various dates
{
  const tests = [
    { generated_at: '2026-01-15T10:00:00Z', shouldContain: 'Jan' },
    { generated_at: '2026-12-31T23:59:00Z', shouldContain: '', isYearEdge: true }, // Timezone-dependent edge case
    { generated_at: '2025-06-01T00:00:00Z', shouldContain: 'Jun' },
  ];

  for (const test of tests) {
    const html = `<figure data-snapshot-id="snap"><figcaption>Test</figcaption></figure>`;
    const snapshots = { 'snap': { generated_at: test.generated_at } };
    const result = formatFigureCaptions(html, snapshots);
    const hasDate = /Test \([A-Za-z]+ \d+, \d{4}\)/.test(result);
    if (test.isYearEdge) {
      check(hasDate, `Date formats correctly (edge case): ${test.generated_at}`);
    } else {
      check(result.includes('Test (') && result.includes(test.shouldContain), `Date formats correctly: ${test.generated_at}`);
    }
  }
}

// Test 14: formatFigureCaptions preserves figure attributes
{
  const html = `
    <figure data-snapshot-id="snap-001" class="diagram" id="fig-arch">
      <figcaption>Architecture</figcaption>
    </figure>
  `;
  const snapshots = {
    'snap-001': { generated_at: '2026-09-02T14:45:00Z' }
  };
  const result = formatFigureCaptions(html, snapshots);
  check(result.includes('class="diagram"'), 'CSS class preserved');
  check(result.includes('id="fig-arch"'), 'ID preserved');
}

console.log(`\nExit: ${failures === 0 ? 0 : 1} (${failures === 0 ? 'all pass' : failures + ' failures'})`);
process.exit(failures === 0 ? 0 : 1);
