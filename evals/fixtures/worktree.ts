import { join } from 'node:path'
import type { AgentSession } from '@pstack/agent-eval'

export async function mergedWorktree({ environment }: AgentSession) {
  const origin = join(environment.root, 'origin.git')
  await environment.command('git', ['clone', '--bare', environment.project, origin])
  await environment.command('git', ['remote', 'add', 'origin', origin])
  await environment.command('git', ['fetch', 'origin', 'main'])
  await environment.command('git', ['worktree', 'add', '-b', 'active-worker', join(environment.root, 'active-worker')])
}

export async function auditWorktree(agent: AgentSession) {
  const script = await agent.pluginFile('skills/poteto-mode/scripts/worktree-audit.sh')
  const audit = await agent.environment.command('bash', [script, agent.environment.project])
  const active = join(agent.environment.root, 'active-worker')
  const row = audit.stdout.trim().split('\n').slice(1)
    .map(line => line.split('\t')).find(row => row[8] === active)
  if (!row || row.length !== 9) throw new Error(`Missing audit row for ${active}: ${audit.stdout}`)
  return { merged: row[2], dirty: row[3], bucket: row[7], active }
}
