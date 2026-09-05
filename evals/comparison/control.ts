import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { AgentHarness } from '@pstack/agent-eval'

export function pinnedControl(harness: AgentHarness): AgentHarness {
  return {
    ...harness,
    async createSession(options) {
      const metadata: unknown = JSON.parse(await readFile(new URL('./control.json', import.meta.url), 'utf8'))
      if (!metadata || typeof metadata !== 'object' || !('revision' in metadata) || typeof metadata.revision !== 'string' || !/^[a-f0-9]{40}$/.test(metadata.revision)) throw new Error('Invalid control revision')
      const root = await mkdtemp(join(tmpdir(), 'pstack-control-'))
      try {
        const archive = join(root, 'source.tar')
        await promisify(execFile)('git', ['archive', '--format=tar', '--output', archive, metadata.revision], { cwd: options.candidate.root })
        await promisify(execFile)('tar', ['-xf', archive, '-C', root])
        const session = await harness.createSession({ ...options, candidate: { ...options.candidate, root } })
        await session.artifacts.write('control.json', metadata)
        return session
      } finally { await rm(root, { recursive: true, force: true }) }
    },
  }
}
