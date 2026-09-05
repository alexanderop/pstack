import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const output = execFileSync(process.execPath, ['src/cli.mjs', '--help'], { encoding: 'utf8', timeout: 5000 });
assert.equal(output, 'Usage: records list [--status STATUS] --input FILE\nList customer records.\n');
