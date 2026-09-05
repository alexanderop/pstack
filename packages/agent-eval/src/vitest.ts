import { test } from 'vitest'
import { createCodexTrial } from './codex.js'

export function codexTest(options: Omit<Parameters<typeof createCodexTrial>[0], 'signal'>) {
  return test.extend('codex', async ({ signal, task, onTestFinished }, { onCleanup }) => {
    const trial = await createCodexTrial({ ...options, signal })
    onCleanup(() => trial.dispose())
    onTestFinished(() => trial.artifacts.write('verdict.json', {
      test: task.name, status: task.result?.state ?? 'unknown', errors: task.result?.errors ?? [],
    }))
    return trial
  })
}
