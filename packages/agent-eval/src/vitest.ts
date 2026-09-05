import { describe, test } from 'vitest'
import type { AgentHarness, Candidate, EvaluationTask, TrialResult } from './types.js'

export function evaluationSuite(options: {
  name: string
  agentHarness: AgentHarness
  candidate: Candidate
  artifactRoot: string
  trials?: number
  tasks: readonly EvaluationTask[]
}) {
  const trials = options.trials ?? 1
  if (!Number.isSafeInteger(trials) || trials < 1) throw new Error('trials must be a positive integer')
  const ids = options.tasks.map(task => task.id)
  if (new Set(ids).size !== ids.length) throw new Error('Task ids must be unique within a suite')
  describe(`${options.name} / ${options.agentHarness.label}`, () => {
    for (const task of options.tasks) {
      for (let attempt = 1; attempt <= trials; attempt++) {
        test(`${task.id}: ${task.description} / trial ${attempt}`, async ({ signal, annotate, onTestFinished, expect, task: vitestTask }) => {
          const session = await options.agentHarness.createSession({
            candidate: options.candidate, artifactRoot: options.artifactRoot, files: task.files, signal,
          })
          onTestFinished(() => session.artifacts.write('verdict.json', {
            suite: options.name, agentHarness: options.agentHarness.id, task: task.id, attempt,
            status: vitestTask.result?.state ?? 'unknown', errors: vitestTask.result?.errors ?? [],
          }))
          try {
            await annotate(session.artifacts.path)
            let result: TrialResult
            try {
              result = await task.execute(session)
            } catch (error) {
              result = { status: 'error', graders: [{ name: 'Trial setup or observation', status: 'error', reason: error instanceof Error ? error.message : String(error) }] }
            }
            await session.artifacts.write('trial.json', {
              suite: options.name, agentHarness: options.agentHarness.id, task: task.id, attempt, ...result,
            })
            for (const grader of result.graders) {
              if (grader.status === 'error') expect.soft(grader.status, `${grader.name}: ${grader.reason}`).toBe('pass')
              else for (const check of grader.checks) {
                expect.soft(check.status, `${grader.name} / ${check.name}: ${check.detail}`).toBe('pass')
              }
            }
          } finally { await session.dispose() }
        })
      }
    }
  })
}
