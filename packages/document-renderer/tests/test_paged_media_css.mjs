// Tests for paged-media CSS generation (render-vivliostyle.mjs)
// Verifies running footer, page breaks, typography rules

import { generatePagedMediaCss, wrapHtmlForPrintRendering } from '../src/render-vivliostyle.mjs';

let failures = 0;

function check(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.log(`  ✗ ${message}`);
    failures += 1;
  }
}

// Test 1: CSS includes @page rule
{
  const css = generatePagedMediaCss();
  check(css.includes('@page {'), 'CSS includes @page rule');
  check(css.includes('size: A4'), 'CSS declares A4 page size');
  check(css.includes('margin: 20mm 15mm'), 'CSS declares page margins');
}

// Test 2: CSS includes running footer
{
  const css = generatePagedMediaCss({
    issuer: 'Test Corp',
    issued_at: '2026-09-02T15:30:00Z',
    document_identity: 'PRODUCT-MRD-1.0',
  });
  check(css.includes('@bottom-center'), 'CSS includes @bottom-center running footer');
  check(css.includes('counter(page)'), 'CSS includes page counter');
  check(css.includes('counter(pages)'), 'CSS includes pages counter');
}

// Test 3: Footer content includes metadata
{
  const css = generatePagedMediaCss({
    issuer: 'Acme Corp',
    issued_at: '2026-09-02T15:30:00Z',
    document_identity: 'SPEC-v2.0',
    repository_commit: 'a1b2c3d4e5f6g7h8',
  });
  check(css.includes('Acme Corp'), 'CSS includes issuer name');
  check(css.includes('SPEC-v2.0'), 'CSS includes document identity');
  check(css.includes('a1b2c3d'), 'CSS includes commit hash (short form)');
}

// Test 4: Footer content is escaped (no unescaped quotes)
{
  const css = generatePagedMediaCss({
    issuer: 'Corp "Test" <script>',
    document_identity: 'DOC & MORE',
  });
  check(!css.includes('<script>'), 'Dangerous HTML is escaped in issuer');
  check(css.includes('&amp;'), 'Ampersand is escaped');
  // Check that within a CSS content string, ampersands are properly escaped
  const contentMatch = css.match(/content: "([^"]+)"/);
  const hasUnescapedAmpersand = contentMatch && contentMatch[1].includes('&') && !contentMatch[1].includes('&amp;');
  check(!hasUnescapedAmpersand, 'No unescaped ampersands in content string');
}

// Test 5: First page omits footer
{
  const css = generatePagedMediaCss({ issuer: 'Test' });
  check(css.includes('@page :first'), 'CSS includes :first pseudo-page');
  check(css.includes('@page :first') && css.includes('content: ""'), 'First page footer is empty');
}

// Test 6: Landscape pages included
{
  const css = generatePagedMediaCss();
  check(css.includes('@page landscape'), 'CSS includes landscape page rule');
  check(css.includes('size: A4 landscape'), 'Landscape pages use rotated A4');
}

// Test 7: Typography rules for headings and paragraphs
{
  const css = generatePagedMediaCss();
  check(css.includes('h1 {'), 'CSS includes h1 rule');
  check(css.includes('18pt'), 'h1 font size is 18pt');
  check(css.includes('h2 {'), 'CSS includes h2 rule');
  check(css.includes('h3 {'), 'CSS includes h3 rule');
  check(css.includes('p {'), 'CSS includes paragraph rule');
  check(css.includes('page-break-after: avoid'), 'Headings avoid page breaks after them');
}

// Test 8: Figure/diagram rules
{
  const css = generatePagedMediaCss();
  check(css.includes('.diagram'), 'CSS includes diagram styling');
  check(css.includes('page: landscape'), 'Diagrams page to landscape');
  check(css.includes('figure {'), 'CSS includes figure rule');
  check(css.includes('page-break-inside: avoid'), 'Figures avoid page breaks inside');
}

// Test 9: HTML wrapping function
{
  const html = wrapHtmlForPrintRendering('<p>Test content</p>', {
    issuer: 'Test Org',
    document_identity: 'TEST-DOC',
  });
  check(html.includes('<!DOCTYPE html>'), 'HTML wrapper includes doctype');
  check(html.includes('<style>'), 'HTML wrapper includes style tag');
  check(html.includes('<p>Test content</p>'), 'HTML wrapper preserves content');
  check(html.includes('TEST-DOC'), 'HTML wrapper includes document identity in title');
}

// Test 10: Empty metadata handled gracefully
{
  const css = generatePagedMediaCss({});
  check(css.includes('@page {'), 'CSS generated with empty metadata');
  check(!css.includes('undefined'), 'No undefined values in CSS');
}

// Test 11: Wide views detected and landscaped
{
  const css = generatePagedMediaCss({
    views: [
      { id: 'diagram-arch', width: 1200, height: 600 }, // wide
      { id: 'diagram-flow', width: 400, height: 800 },  // portrait
    ],
  });
  check(css.includes('#diagram-arch'), 'Wide view CSS selector generated');
  check(css.includes('page: landscape'), 'Wide view uses landscape page rule');
  check(!css.includes('#diagram-flow'), 'Portrait view not marked as landscape');
}

// Test 12: Empty views array handled
{
  const css = generatePagedMediaCss({ views: [] });
  check(css.includes('@page {'), 'CSS generated with empty views array');
  check(!css.includes('undefined'), 'No undefined values with empty views');
}

// Test 13: Views with missing dimensions ignored
{
  const css = generatePagedMediaCss({
    views: [
      { id: 'no-width', height: 600 },
      { id: 'no-height', width: 800 },
      { id: 'no-dims' },
    ],
  });
  check(!css.includes('#no-width'), 'View without width ignored');
  check(!css.includes('#no-height'), 'View without height ignored');
  check(!css.includes('#no-dims'), 'View without dimensions ignored');
}

// Test 14: Wide view at exact square boundary
{
  const css = generatePagedMediaCss({
    views: [
      { id: 'square', width: 600, height: 600 },       // not wide
      { id: 'slightly-wide', width: 601, height: 600 }, // wide
    ],
  });
  check(!css.includes('#square'), 'Square view not marked as landscape');
  check(css.includes('#slightly-wide'), 'View with width > height marked as landscape');
}

// Test 15: Special characters in view IDs are sanitized
{
  const css = generatePagedMediaCss({
    views: [
      { id: 'diagram-with-"quotes"', width: 800, height: 400 },
      { id: 'diagram<script>', width: 800, height: 400 },
    ],
  });
  check(css.includes('#diagram-with--quotes-'), 'Quotes in view ID are removed/sanitized');
  check(css.includes('#diagram-script-'), 'Special characters in view ID are removed/sanitized');
  check(!css.includes('<script>'), 'No unescaped <script> tags in CSS');
}

// Test 16: Multiple wide views generate multiple selectors
{
  const css = generatePagedMediaCss({
    views: [
      { id: 'wide-1', width: 1000, height: 500 },
      { id: 'wide-2', width: 900, height: 400 },
      { id: 'portrait', width: 300, height: 600 },
    ],
  });
  check(css.includes('#wide-1'), 'First wide view CSS selector generated');
  check(css.includes('#wide-2'), 'Second wide view CSS selector generated');
  check(!css.includes('#portrait'), 'Portrait view not included');
  const count = (css.match(/page: landscape/g) || []).length;
  check(count >= 2, `Multiple landscape rules generated (found ${count})`);
}

// Test 17: Landscape pages have correct dimensions (A4 rotated: 842 × 595 pt)
{
  const css = generatePagedMediaCss();
  check(css.includes('size: A4 landscape'), 'Landscape page size rule exists');
  // Verify margins are set for landscape pages
  const landscapeSection = css.match(/@page landscape[\s\S]*?}/);
  check(landscapeSection && landscapeSection[0].includes('margin:'), 'Landscape pages have margins');
}

console.log(`\nExit: ${failures === 0 ? 0 : 1} (${failures === 0 ? 'all pass' : failures + ' failures'})`);
process.exit(failures === 0 ? 0 : 1);
