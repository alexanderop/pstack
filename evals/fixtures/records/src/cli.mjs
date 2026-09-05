import { loadRecords, filterRecords } from './records.mjs';
import { help } from './help.mjs';
const [command, ...args] = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
if (!command || command === '--help') {
  process.stdout.write(help);
} else if (command === 'list') {
  const records = await loadRecords(option('--input'));
  const status = args.includes('--status') ? option('--status') : undefined;
  process.stdout.write(JSON.stringify(filterRecords(records, status)) + '\n');
} else {
  process.stderr.write(`Unknown command: ${command}\n`);
  process.exitCode = 1;
}
