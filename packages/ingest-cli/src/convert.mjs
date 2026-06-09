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

// How we try to reach Markitdown, in order. The bare `markitdown` console-script is
// the happy path, but it is absent from PATH in two common cases: a venv where only
// the interpreter (not the entry-point shim) is on PATH, and Windows where the
// `markitdown.ps1` / `npx.ps1` shims are blocked by the execution policy. In both the
// module is importable, so `python -m markitdown` (and the `python3` alias) reaches it.
const MARKITDOWN_LAUNCHERS = [
  { cmd: 'markitdown', args: (src) => [src] },
  { cmd: 'python', args: (src) => ['-m', 'markitdown', src] },
  { cmd: 'python3', args: (src) => ['-m', 'markitdown', src] },
];

// The launcher binary itself is not on PATH — try the next launcher.
function isLauncherMissing(err) {
  return err && err.code === 'ENOENT';
}
// The launcher ran but markitdown is not importable under it — try the next launcher.
function isModuleNotFound(err) {
  const s = `${(err && err.stderr) || ''}${(err && err.message) || ''}`;
  return /No module named ['"]?markitdown/i.test(s);
}

// Run Markitdown over `srcPath`, falling back across MARKITDOWN_LAUNCHERS. Returns the
// converted Markdown. Distinguishes "Markitdown is not reachable at all" (→ install
// guidance) from "Markitdown ran but failed on THIS document" (→ conversion error) so
// a genuine conversion failure is never masked by trying the remaining launchers.
function runMarkitdown(srcPath, ext) {
  let convertFailure = null;
  for (const launcher of MARKITDOWN_LAUNCHERS) {
    try {
      return execFileSync(launcher.cmd, launcher.args(srcPath), {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch (err) {
      // Launcher not on PATH, or present but without the module: keep looking.
      if (isLauncherMissing(err) || isModuleNotFound(err)) continue;
      // Launcher reached Markitdown and it failed converting this document — real error.
      convertFailure = err;
      break;
    }
  }

  if (convertFailure) {
    throw new ConvertError(
      `Markitdown failed to convert "${basename(srcPath)}": ` +
      `${convertFailure.message ? convertFailure.message : convertFailure}`
    );
  }
  throw new ConvertError(
    `MS Markitdown is required to convert "${basename(srcPath)}" (${ext}) but it could not ` +
    `be reached — tried \`markitdown\`, \`python -m markitdown\`, and \`python3 -m markitdown\`.\n` +
    `Install it into the active environment (\`pip install "markitdown[all]"\`) and ensure the ` +
    `interpreter is on PATH; inside a venv, activate it first.\n` +
    `On Windows, if \`markitdown\`/\`npx\` are blocked by the PowerShell execution policy, run ` +
    `\`python -m markitdown\` directly or set \`Set-ExecutionPolicy -Scope Process RemoteSigned\`.\n` +
    `Or convert the document to Markdown by hand and drop the .md into _intake/inbox/.`
  );
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

  const markdown = runMarkitdown(srcPath, ext);
  await writeFile(out, markdown, 'utf8');
  return { out, mode: 'markitdown' };
}

export { PASSTHROUGH };
