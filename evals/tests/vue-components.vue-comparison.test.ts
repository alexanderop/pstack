import { evaluationSuite } from '@pstack/agent-eval/vitest'
import { resolve } from 'node:path'
import { codexHarness } from '@pstack/agent-eval/codex'
import { scenarios, vueTask, type Condition } from '../tasks/vue-components.js'
import { suiteOptions, executable, model } from './setup.js'

const agentHarness = codexHarness({ executable, model, reasoningEffort: 'medium', plugin: 'none' })
const artifactRoot = process.env.PSTACK_VUE_ARTIFACTS ? resolve(process.env.PSTACK_VUE_ARTIFACTS) : suiteOptions.artifactRoot
const conditions: readonly Condition[] = ['without', 'with']
if (!Number.isSafeInteger(suiteOptions.trials) || suiteOptions.trials < 1) throw new Error('trials must be a positive integer')
for (let repetition = 1; repetition <= suiteOptions.trials; repetition++) {
  for (const [index, scenario] of scenarios.entries()) {
    const order = (repetition + index) % 2 === 1 ? conditions : [...conditions].reverse()
    for (const condition of order) {
      evaluationSuite({
        ...suiteOptions, artifactRoot, trials: 1, agentHarness,
        name: `Vue components / ${condition} / repetition ${repetition}`,
        tasks: [vueTask(scenario, condition, repetition)],
      })
    }
  }
}
