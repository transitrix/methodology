'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const reconcile = require('./release-drift.cjs');
function fixture(overrides = {}) {
  const calls = [], api = {};
  for (const method of ['listForRepo', 'getLabel', 'createLabel', 'create', 'update']) {
    api[method] = async args => {
      calls.push({method, args});
      if (method === 'getLabel' && overrides.labelError) throw overrides.labelError;
      return {data: {number: 1}};
    };
  }
  return {calls, input: {github: {rest: {issues: api}, paginate: async (method, args) => {
    assert.equal(method, api.listForRepo); assert.equal(args.per_page, 100);
    calls.push({method: 'paginate', args}); return overrides.issues || [];
  }}, context: {repo: {owner: 'example', repo: 'methodology'}}, core: {notice() {}},
  env: {COUNT: '8', THRESHOLD: '50', TAG: 'v7.0.0', ...overrides.env}}};
}
const reminder = {number: 639, title: '[reminder] Cut a new release — 8 commits since v7.0.0',
  body: `old facts\n${reconcile.MARKER}`, user: {login: 'github-actions[bot]'}};
const writes = f => f.calls.filter(c => ['create', 'update', 'createLabel'].includes(c.method));
for (const count of ['0', '8', '27', '49', '50']) {
  test(`${count} commits do not exceed numeric threshold 50`, async () => {
    const f = fixture({env: {COUNT: count}}); await reconcile(f.input);
    assert.deepEqual(writes(f), []);
  });
}
for (const count of ['51', '100']) {
  test(`${count} commits create an overdue reminder`, async () => {
    const f = fixture({env: {COUNT: count}}); await reconcile(f.input);
    assert.equal(writes(f).length, 1); assert.equal(writes(f)[0].method, 'create');
    assert.ok(writes(f)[0].args.body.includes(`**${count} commits**`));
  });
}
test('stale reminder gets current facts and closes without claiming a release', async () => {
  const f = fixture({issues: [reminder], env: {COUNT: '27'}}); await reconcile(f.input);
  const [{args}] = writes(f);
  assert.equal(args.issue_number, 639); assert.equal(args.state, 'closed');
  assert.match(args.title, /27 commits/); assert.match(args.body, /within the 50/);
  assert.match(args.body, /does not claim that a release was prepared or published/);
});
test('overdue reminder updates in place; identical rerun makes no write', async () => {
  const f = fixture({issues: [reminder], env: {COUNT: '100'}}); await reconcile(f.input);
  const [{method, args}] = writes(f); assert.equal(method, 'update');
  assert.match(args.body, /100 commits/); assert.equal(args.state, undefined);
  const second = fixture({issues: [{...reminder, ...args}], env: {COUNT: '100'}});
  await reconcile(second.input); assert.deepEqual(writes(second), []);
});
test('unrelated, human-owned, unmarked issues and PRs remain unchanged', async () => {
  const f = fixture({issues: [{...reminder, user: {login: 'maintainer'}},
    {...reminder, body: 'manual release plan'}, {...reminder, title: 'Release plan'},
    {...reminder, pull_request: {}}]});
  await reconcile(f.input); assert.deepEqual(writes(f), []);
});
test('multiple workflow-owned reminders refuse without writes', async () => {
  const f = fixture({issues: [reminder, {...reminder, number: 640}]});
  await assert.rejects(reconcile(f.input), /Multiple release reminders/);
  assert.deepEqual(writes(f), []);
});
for (const env of [{COUNT: ''}, {COUNT: '-1'}, {COUNT: '8x'}, {COUNT: '1.2'},
  {COUNT: '9007199254740992'}, {THRESHOLD: '0'}, {THRESHOLD: 'bad'}, {TAG: ''}, {TAG: 'v7.0.0\nextra'}]) {
  test(`malformed input refuses before API reads: ${JSON.stringify(env)}`, async () => {
    const f = fixture({env}); await assert.rejects(reconcile(f.input), /Invalid/);
    assert.deepEqual(f.calls, []);
  });
}
test('a missing label is created only on 404', async () => {
  const f = fixture({env: {COUNT: '51'}, labelError: {status: 404}});
  await reconcile(f.input); assert.deepEqual(writes(f).map(x => x.method), ['createLabel', 'create']);
});
test('permission failure is preserved without creating a label or reminder', async () => {
  const f = fixture({env: {COUNT: '51'}, labelError: {status: 403}});
  await assert.rejects(reconcile(f.input)); assert.deepEqual(writes(f), []);
});
