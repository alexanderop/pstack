import { defineTask, equal, observedRead, type Transcript } from '@pstack/agent-eval'
import { recordsFiles, checkRecords } from '../fixtures/records.js'

export function recordsTasks(mode: 'plain' | 'poteto' = 'poteto') {
  const staleSearch = defineTask({
    id: 'stale-search',
    description: 'Fix stale search results and preserve loading, error, and recovery behavior',
    files: recordsFiles,
    prompt: agent => agent.skill('poteto-mode', 'fix records desk search. When I type quickly, results sometimes jump back to an earlier query. A failed older request can also replace the current error state. Fix this and verify the behavior. Preserve the documented public API.'),
    settings: { timeoutMs: 600_000 },
    observe: async ({ environment }) => ({ verification: await checkRecords(environment.project, 'search'), changedPaths: await environment.changes() }),
    graders: {
      'Search behavior': ({ outcome }) => [equal(outcome.verification.detail || 'Request ordering and recovery', outcome.verification.passed, true)],
      'Mode activation': ({ transcript }) => [modeActivation(transcript, mode)],
    },
  })

  const csvExport = defineTask({
    id: 'csv-export',
    description: 'Add filtered CSV export through the existing records CLI',
    files: recordsFiles,
    prompt: agent => agent.skill('poteto-mode', 'add an export command to records desk. It should export the same records as list, including its optional status filter, as CSV on stdout. Follow the CSV format documented in the README and keep list working. Verify the command with realistic data.'),
    settings: { timeoutMs: 600_000 },
    observe: async ({ environment }) => ({ verification: await checkRecords(environment.project, 'export'), changedPaths: await environment.changes() }),
    graders: {
      'Export behavior': ({ outcome }) => [equal(outcome.verification.detail || 'CLI export and list compatibility', outcome.verification.passed, true)],
      'Mode activation': ({ transcript }) => [modeActivation(transcript, mode)],
    },
  })

  const helpText = defineTask({
    id: 'help-text',
    description: 'Correct a help-text typo without unrelated edits',
    files: recordsFiles,
    prompt: agent => agent.skill('poteto-mode', 'correct "costumer" to "customer" in the records CLI help text. Keep this a small wording fix.'),
    settings: { timeoutMs: 180_000 },
    async observe({ environment }) {
      return { source: await environment.read('src/help.mjs'), changedPaths: await environment.changes(), verification: await checkRecords(environment.project, 'help') }
    },
    graders: {
      'Small wording fix': ({ outcome }) => [
        equal(outcome.verification.detail || 'CLI help output', outcome.verification.passed, true),
        equal('Correct wording', outcome.source, recordsFiles['src/help.mjs']?.replace('costumer', 'customer')),
        equal('Only help source changed', outcome.changedPaths, ['src/help.mjs']),
      ],
      'Mode activation': ({ transcript }) => [modeActivation(transcript, mode)],
    },
  })

  return [staleSearch, csvExport, helpText] satisfies [typeof staleSearch, typeof csvExport, typeof helpText]
}
export const [staleSearch, csvExport, helpText] = recordsTasks()

function modeActivation(transcript: Transcript, mode: 'plain' | 'poteto') {
  if (mode === 'plain') return equal('No injected pstack instructions', transcript.threads.flatMap(thread => thread.injectedSkills ?? []).filter(skill => skill.name.startsWith('pstack:')).length, 0)
  const root = transcript.threads.find(thread => thread.id === transcript.rootId)
  const injected = root?.injectedSkills?.some(skill => skill.name === 'pstack:poteto-mode'
    && skill.path.endsWith('/skills/poteto-mode/SKILL.md') && skill.content.includes('# Poteto mode'))
  return injected ? equal('Codex injected poteto-mode instructions', injected, true)
    : observedRead('Root loaded poteto-mode', transcript, '/skills/poteto-mode/SKILL.md', 'root')
}
