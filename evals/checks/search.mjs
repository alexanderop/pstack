import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { createSearch } = await import(pathToFileURL(resolve('src/search.mjs')));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
for (const olderFails of [false, true]) {
  const first = deferred(), second = deferred();
  const changes = [];
  const controller = createSearch(query => query === 'a' ? first.promise : second.promise, state => changes.push(state));
  const old = controller.search('a');
  const latest = controller.search('ab');
  assert.equal(controller.getState().loading, true);
  second.resolve([{ id: 'latest' }]);
  await latest;
  if (olderFails) first.reject(new Error('obsolete failure'));
  else first.resolve([{ id: 'obsolete' }]);
  await old;
  assert.deepEqual(controller.getState(), { rows: [{ id: 'latest' }], loading: false, error: null });
  assert.ok(changes.length > 0);
  assert.deepEqual(changes.at(-1), controller.getState());
}
const first = deferred(), second = deferred();
const controller = createSearch(query => query === 'a' ? first.promise : second.promise);
const old = controller.search('a'), latest = controller.search('ab');
first.resolve([]);
await old;
assert.equal(controller.getState().loading, true, 'old completion must not clear current loading');
second.reject(new Error('current failure'));
await latest;
assert.equal(controller.getState().error, 'current failure');
assert.equal(controller.getState().loading, false);
const recovery = controller.search('a');
assert.equal(controller.getState().error, null);
await recovery;
assert.deepEqual(controller.getState(), { rows: [], loading: false, error: null });

for (const olderFails of [false, true]) {
  const older = deferred(), current = deferred();
  const search = createSearch(query => query === 'old' ? older.promise : current.promise);
  const a = search.search('old'), b = search.search('new');
  current.reject(new Error('latest failure'));
  await b;
  if (olderFails) older.reject(new Error('stale failure'));
  else older.resolve(['stale rows']);
  await a;
  assert.deepEqual(search.getState(), { rows: [], loading: false, error: 'latest failure' });
}
{
  const requests = [deferred(), deferred()];
  let index = 0;
  const search = createSearch(() => requests[index++].promise);
  const a = search.search('same'), b = search.search('same');
  requests[1].resolve(['new']); await b;
  requests[0].resolve(['old']); await a;
  assert.deepEqual(search.getState(), { rows: ['new'], loading: false, error: null });
}
{
  const a = deferred(), b = deferred();
  const left = createSearch(() => a.promise), right = createSearch(() => b.promise);
  const first = left.search('left'), second = right.search('right');
  a.resolve(['left']); await first;
  b.resolve(['right']); await second;
  assert.deepEqual(left.getState(), { rows: ['left'], loading: false, error: null });
  assert.deepEqual(right.getState(), { rows: ['right'], loading: false, error: null });
}
{
  const pending = deferred();
  const search = createSearch(query => query === 'initial' ? Promise.resolve(['existing']) : pending.promise);
  await search.search('initial');
  const next = search.search('next');
  assert.deepEqual(search.getState(), { rows: ['existing'], loading: true, error: null });
  pending.resolve(['replacement']); await next;
  assert.deepEqual(search.getState(), { rows: ['replacement'], loading: false, error: null });
}
