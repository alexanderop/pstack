import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const fingerprint = hashes => hashes ? createHash('sha256').update(JSON.stringify(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)))).digest('hex') : null;

export function summarize(rows) {
  const groups = new Map();
  for (const { directory, trial, request, inputs, metrics } of rows) {
    const condition = /^Records comparison \/ (plain|control|revised) \/ repetition \d+$/.exec(trial.suite)?.[1];
    if (!condition) continue;
    const identity = { condition, task: trial.task, model: request.model, reasoningEffort: request.reasoningEffort,
      fixtureHash: fingerprint(inputs.fixtureHashes), candidateHash: fingerprint(inputs.candidateHashes) };
    const key = JSON.stringify(identity);
    const group = groups.get(key) ?? { ...identity, trials: [] };
    group.trials.push({ directory, status: trial.status,
      behavior: trial.graders.filter(grader => grader.name !== 'Mode activation'), metrics });
    groups.set(key, group);
  }
  return [...groups.values()].map(group => {
    const durations = group.trials.flatMap(trial => typeof trial.metrics?.elapsedMs === 'number' ? [trial.metrics.elapsedMs] : []).sort((a, b) => a - b);
    const middle = Math.floor(durations.length / 2);
    const medianElapsedMs = durations.length === 0 ? null : durations.length % 2 ? durations[middle] : (durations[middle - 1] + durations[middle]) / 2;
    return { ...group, attempts: group.trials.length, passing: group.trials.filter(trial => trial.status === 'pass').length,
      behaviorPassing: group.trials.filter(trial => trial.behavior.length > 0 && trial.behavior.every(grader => grader.status === 'pass')).length,
      timedAttempts: durations.length, medianElapsedMs };
  });
}

async function readOptional(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(process.argv[2] ?? '.eval-artifacts');
  const rows = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = join(root, entry.name);
    const trial = await readOptional(join(directory, 'trial.json'));
    if (!trial?.suite?.startsWith('Records comparison /')) continue;
    rows.push({ directory, trial, request: await readOptional(join(directory, 'request.json')) ?? {},
      inputs: await readOptional(join(directory, 'inputs.json')) ?? {}, metrics: await readOptional(join(directory, 'metrics.json')) });
  }
  console.log(JSON.stringify(summarize(rows), null, 2));
}
