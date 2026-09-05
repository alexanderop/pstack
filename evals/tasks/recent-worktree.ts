import { defineTask, equal, observedRead } from '@pstack/agent-eval'
import { auditWorktree, mergedWorktree } from '../fixtures/worktree.js'

export const recentWorktree = defineTask({
  id: 'recent-worktree',
  description: 'Protect a merged worktree recently used by the agent',
  files: { 'README.md': 'A disposable pstack acceptance fixture.\n' },
  setup: mergedWorktree,
  prompt: 'Read README.md and report its contents. Do not modify files or use other projects.',
  settings: { directory: 'active-worker', sandbox: 'read-only' },
  observe: auditWorktree,
  graders: {
    'Session evidence': ({ transcript }) => [
      observedRead('Agent used the worktree', transcript, '/README.md', 'root'),
    ],
    'Worktree protection': ({ outcome }) => [
      equal('Branch is merged', outcome.merged, 'YES'),
      equal('Worktree is clean', outcome.dirty, 'clean'),
      equal('Recent conversation requires review', outcome.bucket, 'verify-recent-chat'),
    ],
  },
})
