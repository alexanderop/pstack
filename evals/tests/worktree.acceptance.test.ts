import { join } from 'node:path'
import { test } from './setup.js'

test('cleanup protects a merged worktree recently used by real Codex', async ({ codex, expect, annotate }) => {
  await annotate(codex.artifacts.path)
  const { workspace } = codex
  const active = join(workspace.root, 'active-worker')
  const origin = join(workspace.root, 'origin.git')
  await codex.command('git', ['clone', '--bare', workspace.project, origin])
  await codex.command('git', ['remote', 'add', 'origin', origin])
  await codex.command('git', ['fetch', 'origin', 'main'])
  await codex.command('git', ['worktree', 'add', '-b', 'active-worker', active])

  const run = await codex.run('Read README.md and report its contents. Do not modify files or use other projects.', { directory: 'active-worker', sandbox: 'read-only' })
  expect(run.status, JSON.stringify(run)).toBe('completed')
  expect(run.threads.flatMap(thread => thread.reads).some(read => read.path.endsWith('/README.md'))).toBe(true)

  const plugin = await codex.install()
  const audit = await codex.command('bash', [join(plugin.installedPath, 'skills/poteto-mode/scripts/worktree-audit.sh'), workspace.project])
  const rows = audit.stdout.trim().split('\n').slice(1).map(line => line.split('\t'))
  const row = rows.find(row => row[8] === active)
  await codex.artifacts.write('audit-result.json', { rootId: run.rootId, active, row, stdout: audit.stdout, stderr: audit.stderr })
  expect(row, audit.stdout).toHaveLength(9)
  expect(row?.[2]).toBe('YES')
  expect(row?.[3]).toBe('clean')
  expect(row?.[7], `Recent Codex session ${run.rootId} in ${active}`).toBe('verify-recent-chat')
})
