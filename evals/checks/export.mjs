import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const directory = mkdtempSync(join(tmpdir(), 'records-input-'));
const path = join(directory, '客户.json');
const records = [
  { id: '1', name: 'Ada, "A"', email: 'ada@example.com', status: 'active' },
  { id: '2', name: 'Excluded', email: 'x@example.com', status: 'archived' },
  { id: '3', name: 'Zoë\n李', email: '', status: 'active' },
];
function run(command, status) {
  return execFileSync(process.execPath, ['src/cli.mjs', command, '--input', path, ...(status ? ['--status', status] : [])], { encoding: 'utf8', timeout: 5000 });
}
try {
  writeFileSync(path, JSON.stringify(records));
  const header = ['id', 'name', 'email', 'status'];
  const fields = record => header.map(key => record[key]);
  assert.deepEqual(parseCsv(run('export', 'active')), [header, fields(records[0]), fields(records[2])]);
  assert.deepEqual(parseCsv(run('export')), [header, ...records.map(fields)]);
  assert.deepEqual(parseCsv(run('export', 'missing')), [header]);
  assert.deepEqual(JSON.parse(run('list', 'active')), [records[0], records[2]]);
  assert.deepEqual(JSON.parse(run('list')), records);
  writeFileSync(path, '[]');
  assert.deepEqual(parseCsv(run('export')), [header]);
} finally {
  rmSync(directory, { recursive: true, force: true });
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false, closed = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index++; }
      else if (char === '"') { quoted = false; closed = true; }
      else field += char;
    } else if (char === ',' || char === '\r') {
      row.push(field); field = ''; closed = false;
      if (char === '\r') {
        assert.equal(text[++index], '\n', 'CSV rows use CRLF');
        rows.push(row); row = [];
      }
    } else if (char === '"') {
      assert.equal(field, ''); assert.equal(closed, false); quoted = true;
    } else {
      assert.equal(closed, false, 'No characters after a closing quote');
      assert.notEqual(char, '\n', 'Bare LF outside a quoted field');
      field += char;
    }
  }
  assert.equal(quoted, false, 'Unclosed CSV quote');
  assert.equal(field, '', 'Final row must end in CRLF');
  assert.equal(row.length, 0, 'Final row must end in CRLF');
  assert.equal(closed, false);
  return rows;
}
