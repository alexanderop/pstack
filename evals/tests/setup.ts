import { resolve } from 'node:path'
import { codexTest } from '@pstack/agent-eval/vitest'

export const candidate = {
  root: resolve(import.meta.dirname, '../..'), name: 'pstack', marketplace: 'pstack',
  entries: ['.codex-plugin', '.claude-plugin', '.cursor-plugin', 'skills', 'agents', 'harness', 'hooks', 'scripts'],
}
export const artifactRoot = resolve(candidate.root, '.eval-artifacts')
export const executable = process.env.PSTACK_CODEX_BIN ?? 'codex'
export const model = process.env.PSTACK_CODEX_MODEL ?? 'gpt-6-astra'
export const test = codexTest({ candidate, artifactRoot, executable, model, reasoningEffort: 'medium', files: { 'README.md': 'A disposable pstack acceptance fixture.\n' } })
