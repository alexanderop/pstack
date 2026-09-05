import { evaluationSuite } from '@pstack/agent-eval/vitest'
import { recentWorktree } from '../tasks/recent-worktree.js'
import { suiteOptions } from './setup.js'

evaluationSuite({
  ...suiteOptions,
  name: 'Plugin capabilities',
  tasks: [recentWorktree],
})
