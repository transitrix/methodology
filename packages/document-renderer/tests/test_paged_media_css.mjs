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

console.log(`\nExit: ${failures === 0 ? 0 : 1} (${failures === 0 ? 'all pass' : failures + ' failures'})`);
process.exit(failures === 0 ? 0 : 1);
