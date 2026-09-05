import { evaluationSuite } from '@pstack/agent-eval/vitest'
import { commentReview } from '../tasks/comment-review.js'
import { suiteOptions } from './setup.js'

evaluationSuite({
  ...suiteOptions,
  name: 'Plugin capabilities',
  tasks: [commentReview],
})
