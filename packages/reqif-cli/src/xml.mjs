// Tiny, purpose-built XML build + parse helpers — just enough to emit and
// re-read the fixed ReqIF document shape this package targets (src/reqif-xml.mjs).
// Not a general XML library; zero dependencies, by the same convention as
// the rest of this repo's hand-rolled data-format tooling.

export function escapeXmlText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeXmlAttr(s) {
  return escapeXmlText(s).replace(/"/g, '&quot;');
}

function unescapeXml(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseAttrs(attrStr) {
  const attrs = {};
  const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(attrStr)) !== null) attrs[m[1]] = unescapeXml(m[2]);
  return attrs;
}

// Parses well-formed XML (as emitted by reqif-xml.mjs — no CDATA, no mixed
// content beyond a single run of text between tags) into a node tree:
// { tag, attrs, children, text }. Returns the document's single root element.
export function parseXml(xmlText) {
  const s = String(xmlText)
    .replace(/<\?xml[^?]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const tagRe = /<(\/?)([A-Za-z_][-A-Za-z0-9_:.]*)((?:\s+[A-Za-z_:][-A-Za-z0-9_:.]*\s*=\s*"[^"]*")*)\s*(\/?)>/g;
  const root = { tag: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  let lastIndex = 0;
  let m;
  while ((m = tagRe.exec(s)) !== null) {
    const [full, closing, tagName, attrStr, selfClose] = m;
    const textBefore = s.slice(lastIndex, m.index);
    if (textBefore.trim()) stack[stack.length - 1].text += unescapeXml(textBefore);
    lastIndex = m.index + full.length;

    if (closing) { stack.pop(); continue; }
    const node = { tag: tagName, attrs: parseAttrs(attrStr), children: [], text: '' };
    stack[stack.length - 1].children.push(node);
    if (!selfClose) stack.push(node);
  }
  if (!root.children[0]) throw new Error('xml.parseXml: no root element found');
  return root.children[0];
}

export function findChild(node, tag) {
  return node.children.find(c => c.tag === tag) || null;
}

export function findChildren(node, tag) {
  return node.children.filter(c => c.tag === tag);
}

// Text of the first descendant matching `path` (a dot-separated tag chain),
// trimmed. Returns null if any segment of the path is absent.
export function textAt(node, path) {
  let cur = node;
  for (const tag of path.split('.')) {
    cur = findChild(cur, tag);
    if (!cur) return null;
  }
  return cur.text.trim();
}
