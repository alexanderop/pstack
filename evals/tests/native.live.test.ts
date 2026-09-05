import { evaluationSuite } from '@pstack/agent-eval/vitest'
import { nativeChild } from '../tasks/native-child.js'
import { suiteOptions } from './setup.js'

evaluationSuite({
  ...suiteOptions,
  name: 'Runtime regressions',
  tasks: [nativeChild],
})
