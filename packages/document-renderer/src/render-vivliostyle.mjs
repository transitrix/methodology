// Paged-media CSS generation for documents with running footers.
//
// This module (dependency-free) generates CSS and HTML structures needed
// for paged-media rendering via Vivliostyle (or any CSS Paged Media Module
// Level 3 compliant engine).
//
// The actual PDF rendering happens in documents-cli or a caller's own
// pipeline, which can depend on Vivliostyle or another engine.
//
// What this provides:
//   - generatePagedMediaCss() - CSS with @page rules for footers, landscape pages
//   - wrapHtmlForPrintRendering() - HTML structure with embedded CSS for rendering

/**
 * Escape HTML special characters to safely embed in HTML content.
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(text).replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * Generate CSS for paged-media including running footer and landscape pages.
 * Defines @page rules for footer styling, landscape pages, and typography.
 *
 * @param {object} metadata - Document metadata
 * @param {string} metadata.issuer - Who created the document
 * @param {string} metadata.issued_at - ISO 8601 timestamp
 * @param {string} metadata.document_identity - Recipe ID or document identifier
 * @param {string} [metadata.repository_commit] - Git commit hash
 * @param {array} [metadata.views] - View specifications with width/height
 * @returns {string} CSS text with @page rules and base typography
 */
export function generatePagedMediaCss(metadata = {}) {
  const issuer = escapeHtml(metadata.issuer || 'Unknown');
  const repository_commit = metadata.repository_commit || '';
  const commit = repository_commit ? repository_commit.slice(0, 7) : '';
  const identity = escapeHtml(metadata.document_identity || 'Unknown');

  // Format issued date in short form
  let issued = 'Unknown date';
  if (metadata.issued_at) {
    try {
      const date = new Date(metadata.issued_at);
      issued = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      // ignore invalid date
    }
  }

  // Footer content. Shows: issuer, date, identity, commit, page number.
  const footerParts = [issuer, issued, identity];
  if (commit) footerParts.push(commit);
  const footerText = footerParts.join(' • ');

  // Detect wide views (width > height) and generate CSS for them
  let wideViewsCss = '';
  if (metadata.views && Array.isArray(metadata.views)) {
    const wideViews = metadata.views.filter(view =>
      view && view.width && view.height && view.width > view.height && view.id
    );
    if (wideViews.length > 0) {
      wideViewsCss = wideViews.map(view => {
        // View IDs come from trusted model data; CSS selectors don't need HTML escaping
        // Use a safe identifier pattern: alphanumeric, hyphens, underscores
        const safeId = String(view.id).replace(/[^a-zA-Z0-9_-]/g, '-');
        return `#${safeId} {
  page: landscape;
  page-break-inside: avoid;
}`;
      }).join('\n\n');
    }
  }

  return `/* Paged Media CSS — footer, typography, page breaks */

@page {
  size: A4;
  margin: 20mm 15mm;

  @bottom-center {
    content: "${footerText} • page " counter(page) " of " counter(pages);
    font-family: Helvetica, sans-serif;
    font-size: 10pt;
    text-align: center;
    padding-top: 10mm;
    border-top: 1px solid #ccc;
  }
}

@page :first {
  @bottom-center {
    content: "";
  }
}

@page :left {
  margin-right: 20mm;
}

@page :right {
  margin-left: 20mm;
}

@page landscape {
  size: A4 landscape;
  margin: 20mm 15mm;

  @bottom-center {
    content: "${footerText} • page " counter(page) " of " counter(pages);
    font-family: Helvetica, sans-serif;
    font-size: 10pt;
    text-align: center;
    padding-top: 10mm;
    border-top: 1px solid #ccc;
  }
}

html {
  font-family: Helvetica, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.4;
  color: #333;
}

h1 {
  font-size: 18pt;
  font-weight: bold;
  margin: 1.6em 0 0.3em;
  page-break-after: avoid;
}

h2 {
  font-size: 15pt;
  font-weight: bold;
  margin: 1.3em 0 0.3em;
  page-break-after: avoid;
}

h3 {
  font-size: 13pt;
  font-weight: bold;
  margin: 1em 0 0.3em;
  page-break-after: avoid;
}

p {
  margin: 0.9em 0;
  orphans: 2;
  widows: 2;
}

/* Diagrams: mark wide ones for landscape pages */
.diagram, .diagram-wide {
  page: landscape;
  margin: 1em 0;
  text-align: center;
  page-break-inside: avoid;
}

.figure-caption {
  font-size: 10pt;
  color: #666;
  margin: 0.5em 0;
  font-style: italic;
}

figure, .figure {
  page-break-inside: avoid;
  margin: 1em 0;
}

ul, ol {
  margin: 0.9em 0;
  padding-left: 2em;
}

li {
  margin: 0.3em 0;
}

code, pre {
  font-family: monospace;
  font-size: 10pt;
  background-color: #f5f5f5;
  padding: 2px 4px;
}

pre {
  padding: 10px;
  page-break-inside: avoid;
  margin: 1em 0;
}

table {
  margin: 1em 0;
  page-break-inside: avoid;
  border-collapse: collapse;
}

th, td {
  padding: 6px 10px;
  border: 1px solid #ccc;
  text-align: left;
}

th {
  background-color: #f0f0f0;
  font-weight: bold;
}

blockquote {
  margin: 1em 0 1em 2em;
  padding-left: 10px;
  border-left: 3px solid #ccc;
  color: #666;
}

a {
  color: #0066cc;
  text-decoration: underline;
}

${wideViewsCss}
`;
}

/**
 * Format figure captions to include snapshot build dates.
 * Finds all <figure> elements with data-snapshot-id attributes and appends
 * the snapshot's generated_at timestamp to the caption.
 *
 * @param {string} html - HTML content with figure elements
 * @param {object} snapshots - Map of snapshot IDs to snapshot objects with generated_at
 * @returns {string} HTML with formatted captions
 */
export function formatFigureCaptions(html, snapshots = {}) {
  if (!snapshots || Object.keys(snapshots).length === 0) {
    return html;
  }

  return html.replace(
    /<figure([^>]*data-snapshot-id="([^"]*)"[^>]*)>([\s\S]*?)<\/figure>/g,
    (match, attributes, snapshotId, content) => {
      const snapshot = snapshots[snapshotId];
      if (!snapshot || !snapshot.generated_at) {
        return match;
      }

      let dateStr = 'Unknown date';
      try {
        const date = new Date(snapshot.generated_at);
        if (!isNaN(date.getTime())) {
          dateStr = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
      } catch {
        // ignore invalid date, use default
      }

      const figcaptionRegex = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/;
      const captionMatch = figcaptionRegex.exec(content);

      if (!captionMatch) {
        return match;
      }

      const originalCaption = captionMatch[1];
      const newCaption = `${originalCaption} (${dateStr})`;
      const updatedContent = content.replace(figcaptionRegex, `<figcaption>${newCaption}</figcaption>`);

      return `<figure${attributes}>${updatedContent}</figure>`;
    }
  );
}

/**
 * Wrap Markdown or HTML content with paged-media CSS for rendering.
 * Returns a complete HTML document ready to pass to an HTML-to-PDF engine.
 *
 * @param {string} content - HTML or Markdown content
 * @param {object} metadata - Document metadata
 * @param {object} [metadata.snapshots] - Map of snapshot IDs to snapshot objects
 * @returns {string} Complete HTML document with embedded CSS
 */
export function wrapHtmlForPrintRendering(content, metadata = {}) {
  const css = generatePagedMediaCss(metadata);

  const safeMeta = {
    issuer: escapeHtml(metadata.issuer || ''),
    document_identity: escapeHtml(metadata.document_identity || ''),
  };

  // Format figure captions with snapshot dates if snapshots are provided
  const processedContent = formatFigureCaptions(content, metadata.snapshots);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeMeta.document_identity}</title>
  <style>
    ${css}
  </style>
</head>
<body>
  ${processedContent}
</body>
</html>`;
}
