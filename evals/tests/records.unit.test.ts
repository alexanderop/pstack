import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { test, expect } from 'vitest'
import { recordsFiles, checkRecords } from '../fixtures/records.js'

async function verify(check: 'search' | 'export' | 'help', replacements: Readonly<Record<string, string>>) {
  const project = await mkdtemp(join(tmpdir(), 'records-'))
  try {
    for (const [path, content] of Object.entries({ ...recordsFiles, ...replacements })) {
      await mkdir(dirname(join(project, path)), { recursive: true })
      await writeFile(join(project, path), content)
    }
    return await checkRecords(project, check)
  } finally { await rm(project, { recursive: true, force: true }) }
}

const fixedSearch = `export function createSearch(lookup, onChange = () => {}) {
  let state = { rows: [], loading: false, error: null }, generation = 0;
  function update(patch) { state = { ...state, ...patch }; onChange(state); }
  return { getState: () => state, async search(query) {
    const current = ++generation;
    update({ loading: true, error: null });
    try { const rows = await lookup(query); if (current === generation) update({ rows }); }
    catch (error) { if (current === generation) update({ error: error.message }); }
    finally { if (current === generation) update({ loading: false }); }
  } };
}`
const fixedCli = `import { loadRecords, filterRecords } from './records.mjs';
import { help } from './help.mjs';
const [command, ...args] = process.argv.slice(2);
if (!command || command === '--help') process.stdout.write(help);
else {
  const rows = filterRecords(await loadRecords(args[args.indexOf('--input') + 1]), args.includes('--status') ? args[args.indexOf('--status') + 1] : undefined);
  if (command === 'list') process.stdout.write(JSON.stringify(rows) + '\\n');
  else if (command === 'export') {
    const columns = ['id', 'name', 'email', 'status'];
    const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
    process.stdout.write(columns.join(',') + '\\r\\n' + rows.map(row => columns.map(key => {
      const value = String(row[key]);
      return /[",\\r\\n]/.test(value) ? quote(value) : value;
    }).join(',') + '\\r\\n').join(''));
  }
}`

test('search checker rejects the original race and accepts a complete fix', async () => {
  expect((await verify('search', {})).passed).toBe(false)
  expect(await verify('search', { 'src/search.mjs': fixedSearch })).toEqual({ passed: true, detail: '' })
})
test('search checker rejects fixes that leave stale errors or loading updates', async () => {
  for (const fragment of ['update({ error: error.message })', 'update({ loading: false })']) {
    const mutation = fixedSearch.replace(`if (current === generation) ${fragment}`, fragment)
    expect((await verify('search', { 'src/search.mjs': mutation })).passed).toBe(false)
  }
})
test('export checker rejects missing export and accepts a complete implementation', async () => {
  expect((await verify('export', {})).passed).toBe(false)
  expect(await verify('export', { 'src/cli.mjs': fixedCli })).toEqual({ passed: true, detail: '' })
})
test('export checker rejects ignored filters and broken quoting', async () => {
  const mutations = [fixedCli.replace("args.includes('--status')", 'false'), fixedCli.replace("String(value).replaceAll('\"', '\"\"')", 'String(value)')]
  for (const source of mutations) expect((await verify('export', { 'src/cli.mjs': source })).passed).toBe(false)
})

test('export checker accepts quoting every field', async () => {
  const source = fixedCli.replace('return /[",\\r\\n]/.test(value) ? quote(value) : value;', 'return quote(value);')
  expect(source).not.toBe(fixedCli)
  expect(await verify('export', { 'src/cli.mjs': source })).toEqual({ passed: true, detail: '' })
})
test('help checker rejects the typo and accepts the corrected CLI output', async () => {
  expect((await verify('help', {})).passed).toBe(false)
  const source = recordsFiles['src/help.mjs']
  if (!source) throw new Error('Missing help fixture')
  expect(await verify('help', { 'src/help.mjs': source.replace('costumer', 'customer') })).toEqual({ passed: true, detail: '' })
})

test('search checker rejects query identity, shared generations, and clearing retained rows', async () => {
  const mutations = [
    fixedSearch.replace('const current = ++generation;', 'const current = generation = query;'),
    'let generation = 0;\n' + fixedSearch.replace(', generation = 0;', ';'),
    fixedSearch.replace('update({ loading: true, error: null });', 'update({ rows: [], loading: true, error: null });'),
    fixedSearch.replace('if (current === generation) update({ error: error.message });', 'if (current === generation || state.error) update({ error: error.message });'),
  ]
  for (const source of mutations) expect((await verify('search', { 'src/search.mjs': source })).passed).toBe(false)
})
