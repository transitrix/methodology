// Unit tests for batch-path.mjs: two-layer review-artifact naming with run_id batch identity.
// Run: node --test packages/ingest-cli/src/batch-path.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveBatchPath } from './batch-path.mjs';

const testDir = join(tmpdir(), `batch-path-test-${Date.now()}`);

async function setup() {
  await mkdir(testDir, { recursive: true });
}

async function cleanup() {
  try { await rm(testDir, { recursive: true, force: true }); } catch {}
}

test('resolveBatchPath: no existing file returns flat path', async () => {
  await setup();
  try {
    const result = await resolveBatchPath({
      processingDir: testDir,
      filename: 'test.yaml',
      scope: 'batch',
    });
    assert.equal(result, join(testDir, 'test.yaml'));
  } finally {
    await cleanup();
  }
});

test('resolveBatchPath: existing file with matching run_id returns flat path (same batch refresh)', async () => {
  await setup();
  try {
    const flatPath = join(testDir, 'test.yaml');
    const content = 'run_id: abc123\ndata: value\n';
    await writeFile(flatPath, content, 'utf8');

    const result = await resolveBatchPath({
      processingDir: testDir,
      filename: 'test.yaml',
      scope: 'batch',
      runId: 'abc123',
      content,
    });
    assert.equal(result, flatPath);
  } finally {
    await cleanup();
  }
});

test('resolveBatchPath: existing file with different run_id returns dated path (different batch)', async () => {
  await setup();
  try {
    const flatPath = join(testDir, 'test.yaml');
    const oldContent = 'run_id: old123\ndata: old\n';
    await writeFile(flatPath, oldContent, 'utf8');

    const newContent = 'run_id: new456\ndata: new\n';
    const result = await resolveBatchPath({
      processingDir: testDir,
      filename: 'test.yaml',
      scope: 'batch',
      runId: 'new456',
      content: newContent,
    });

    assert.notEqual(result, flatPath);
    assert.ok(result.includes('test-batch-'), `path should include dated batch: ${result}`);
    assert.ok(result.endsWith('test.yaml'));
  } finally {
    await cleanup();
  }
});

test('resolveBatchPath: existing file without run_id returns dated path (unresolved, no identity)', async () => {
  await setup();
  try {
    const flatPath = join(testDir, 'test.yaml');
    const content = 'data: value\n';
    await writeFile(flatPath, content, 'utf8');

    const result = await resolveBatchPath({
      processingDir: testDir,
      filename: 'test.yaml',
      scope: 'batch',
      runId: 'any123',
      content,
    });

    assert.notEqual(result, flatPath);
    assert.ok(result.includes('test-batch-'), `path should include dated batch: ${result}`);
  } finally {
    await cleanup();
  }
});

test('resolveBatchPath: existing file with no runId parameter returns dated path (unresolved)', async () => {
  await setup();
  try {
    const flatPath = join(testDir, 'test.yaml');
    const content = 'run_id: abc123\ndata: value\n';
    await writeFile(flatPath, content, 'utf8');

    const result = await resolveBatchPath({
      processingDir: testDir,
      filename: 'test.yaml',
      scope: 'batch',
      content,
    });

    assert.notEqual(result, flatPath);
    assert.ok(result.includes('test-batch-'), `path should include dated batch: ${result}`);
  } finally {
    await cleanup();
  }
});

test('resolveBatchPath: multiple dated directories increment sequence number', async () => {
  await setup();
  try {
    const dir1 = join(testDir, 'test-batch-20260827-1');
    const dir2 = join(testDir, 'test-batch-20260827-2');
    await mkdir(dir1, { recursive: true });
    await mkdir(dir2, { recursive: true });

    const flatPath = join(testDir, 'test.yaml');
    const content = 'run_id: abc123\ndata: old\n';
    await writeFile(flatPath, content, 'utf8');

    const result = await resolveBatchPath({
      processingDir: testDir,
      filename: 'test.yaml',
      scope: 'batch',
      runId: 'new456',
      content: 'run_id: new456\ndata: new\n',
    });

    assert.ok(result.includes('test-batch-20260827-3'), `should use next sequence number: ${result}`);
  } finally {
    await cleanup();
  }
});

test('resolveBatchPath: quoted run_id from yaml.dump matches unquoted runId (same-batch refresh)', async () => {
  await setup();
  try {
    const flatPath = join(testDir, 'test.yaml');
    // dump() always double-quotes strings; a raw regex would keep the quotes
    // and treat a same-batch refresh as a new batch.
    const content = 'run_id: "abc123"\ndata: value\n';
    await writeFile(flatPath, content, 'utf8');

    const result = await resolveBatchPath({
      processingDir: testDir,
      filename: 'test.yaml',
      scope: 'batch',
      runId: 'abc123',
      content,
    });
    assert.equal(result, flatPath, 'should match dump-quoted run_id against unquoted runId');
  } finally {
    await cleanup();
  }
});

test('resolveBatchPath: whitespace in run_id is trimmed before comparison', async () => {
  await setup();
  try {
    const flatPath = join(testDir, 'test.yaml');
    const content = 'run_id: abc123  \ndata: value\n';
    await writeFile(flatPath, content, 'utf8');

    const result = await resolveBatchPath({
      processingDir: testDir,
      filename: 'test.yaml',
      scope: 'batch',
      runId: 'abc123',
      content,
    });

    assert.equal(result, flatPath, 'should match even with trailing whitespace in file');
  } finally {
    await cleanup();
  }
});

test('resolveBatchPath: malformed run_id line is not extracted', async () => {
  await setup();
  try {
    const flatPath = join(testDir, 'test.yaml');
    const content = 'run-id: abc123\ndata: value\n';
    await writeFile(flatPath, content, 'utf8');

    const result = await resolveBatchPath({
      processingDir: testDir,
      filename: 'test.yaml',
      scope: 'batch',
      runId: 'abc123',
      content,
    });

    assert.notEqual(result, flatPath, 'should not match malformed run_id line');
    assert.ok(result.includes('test-batch-'));
  } finally {
    await cleanup();
  }
});
