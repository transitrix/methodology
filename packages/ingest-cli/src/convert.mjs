// Document conversion — the ONLY point of contact with MS Markitdown.
// Office formats are converted to Markdown via the `markitdown` CLI; `.md` / `.txt`
// inputs pass through unchanged. The rest of the pipeline is pure Node and behaves
// identically under either agent. Keeping conversion isolated here is what lets the
// deterministic guarantees stay runtime-independent.

import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

// Formats we pass through verbatim (already text/markdown).
const PASSTHROUGH = new Set(['.md', '.markdown', '.txt']);

export class ConvertError extends Error {
  constructor(message, { exitCode = 2 } = {}) {
    super(message);
    this.name = 'ConvertError';
    this.exitCode = exitCode;
  }
}

function outName(srcPath) {
  return basename(srcPath, extname(srcPath)) + '.md';
}

// Convert one source file into Markdown written to `processingDir`.
// Returns the output path. Throws ConvertError (exitCode 2) on an unrecoverable
// problem (e.g. Markitdown not installed) with an actionable message.
export async function convert(srcPath, processingDir) {
  await mkdir(processingDir, { recursive: true });
  const out = join(processingDir, outName(srcPath));
  const ext = extname(srcPath).toLowerCase();

  if (PASSTHROUGH.has(ext)) {
    const text = await readFile(srcPath, 'utf8');
    await writeFile(out, text, 'utf8');
    return { out, mode: 'passthrough' };
  }

  let markdown;
  try {
    markdown = execFileSync('markitdown', [srcPath], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      throw new ConvertError(
        `MS Markitdown is required to convert "${basename(srcPath)}" (${ext}) but the ` +
        `\`markitdown\` CLI was not found on PATH.\n` +
        `Install it (e.g. \`pip install markitdown[all]\`) and retry, or convert the ` +
        `document to Markdown by hand and drop the .md into _intake/inbox/.`
      );
    }
    throw new ConvertError(
      `Markitdown failed to convert "${basename(srcPath)}": ${err && err.message ? err.message : err}`
    );
  }

  await writeFile(out, markdown, 'utf8');
  return { out, mode: 'markitdown' };
}

export { PASSTHROUGH };
