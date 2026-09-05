import { evaluationSuite } from '@pstack/agent-eval/vitest'
import { codexHarness } from '@pstack/agent-eval/codex'
import { recordsTasks } from '../tasks/records.js'
import { pinnedControl } from '../comparison/control.js'
import { suiteOptions, executable, model } from './setup.js'

const settings = { executable, model, reasoningEffort: 'medium' } satisfies Parameters<typeof codexHarness>[0]
const conditions = [
  { name: 'plain', harness: codexHarness({ ...settings, plugin: 'none' }), tasks: recordsTasks('plain') },
  { name: 'control', harness: pinnedControl(codexHarness(settings)), tasks: recordsTasks() },
  { name: 'revised', harness: codexHarness(settings), tasks: recordsTasks() },
]
if (!Number.isSafeInteger(suiteOptions.trials) || suiteOptions.trials < 1) throw new Error('trials must be a positive integer')
for (let attempt = 0; attempt < suiteOptions.trials; attempt++) {
  for (let index = 0; index < 3; index++) {
    for (let offset = 0; offset < conditions.length; offset++) {
      const condition = conditions[(offset + attempt + index) % conditions.length]
      const task = condition?.tasks[index]
      if (!condition || !task) throw new Error('Missing comparison condition or task')
      evaluationSuite({ ...suiteOptions, trials: 1, agentHarness: condition.harness,
        name: `Records comparison / ${condition.name} / repetition ${attempt + 1}`, tasks: [task] })
    }
  }
}
