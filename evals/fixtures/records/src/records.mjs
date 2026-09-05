import { readFile } from 'node:fs/promises';
export async function loadRecords(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}
export function filterRecords(records, status) {
  return status ? records.filter(record => record.status === status) : records;
}
