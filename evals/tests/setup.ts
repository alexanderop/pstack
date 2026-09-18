import { resolve } from 'node:path'
import { codexHarness } from '@pstack/agent-eval/codex'

export const candidate = {
  root: resolve(import.meta.dirname, '../..'), name: 'pstack', marketplace: 'pstack',
  entries: ['.agents', '.codex-plugin', '.claude-plugin', '.cursor-plugin', 'skills', 'agents', 'assets', 'harness', 'scripts'],
}
export const artifactRoot = resolve(candidate.root, '.eval-artifacts')
export const executable = process.env.PSTACK_CODEX_BIN ?? 'codex'
export const model = process.env.PSTACK_CODEX_MODEL ?? 'gpt-6-astra'
export const suiteOptions = {
  candidate,
  artifactRoot,
  agentHarness: codexHarness({ executable, model, reasoningEffort: 'medium' }),
  trials: Number(process.env.PSTACK_EVAL_TRIALS ?? 1),
}
