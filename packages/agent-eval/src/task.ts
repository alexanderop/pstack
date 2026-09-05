import type { AgentSession, EvaluationTask, Grader, GraderResult, RunSettings, TrialObservation, TrialResult } from './types.js'

export function defineTask<Outcome>(definition: {
  id: string
  description: string
  files: Readonly<Record<string, string>>
  setup?: (session: AgentSession) => Promise<void>
  prompt: string | ((session: AgentSession) => string)
  settings?: RunSettings
  observe: (session: AgentSession) => Promise<Outcome>
  graders: Readonly<Record<string, Grader<Outcome>>>
}): EvaluationTask {
  if (!definition.id || Object.keys(definition.graders).length === 0) throw new Error('Tasks require an id and at least one grader')
  return {
    id: definition.id,
    description: definition.description,
    files: definition.files,
    async execute(session): Promise<TrialResult> {
      await definition.setup?.(session)
      const prompt = typeof definition.prompt === 'string' ? definition.prompt : definition.prompt(session)
      const started = performance.now()
      const transcript = await session.run(prompt, definition.settings)
      await session.artifacts.write('metrics.json', {
        elapsedMs: performance.now() - started,
        childCount: transcript.threads.filter(thread => thread.parentId !== null).length,
        commandCount: transcript.threads.reduce((sum, thread) => sum + thread.commands.length, 0),
        failedCommandCount: transcript.threads.flatMap(thread => thread.commands).filter(command => command.exitCode !== 0).length,
        prPlaybookReadCount: transcript.threads.flatMap(thread => thread.commands).filter(command => command.exitCode === 0 && command.command.includes('/playbooks/opening-a-pr.md')).length,
        instructionReadCount: transcript.threads.flatMap(thread => thread.reads).filter(read => read.path.endsWith('/SKILL.md')).length,
      })
      await session.artifacts.write('transcript.json', transcript)
      if (transcript.status !== 'completed') {
        return { status: 'error', graders: [{ name: 'Agent execution', status: 'error', reason: `${transcript.status}: ${transcript.reason}` }] }
      }
      const outcome = await definition.observe(session)
      await session.artifacts.write('outcome.json', outcome)
      const observation: TrialObservation<Outcome> = { transcript, outcome }
      const graders: GraderResult[] = []
      for (const [name, grade] of Object.entries(definition.graders)) {
        try {
          const checks = await grade(observation)
          if (checks.length === 0) throw new Error('Grader returned no checks')
          const status = checks.some(check => check.status === 'fail') ? 'fail'
            : checks.some(check => check.status === 'unknown') ? 'unknown' : 'pass'
          graders.push({ name, status, checks })
        } catch (error) {
          graders.push({ name, status: 'error', reason: error instanceof Error ? error.message : String(error) })
        }
      }
      const status = graders.some(grader => grader.status === 'error') ? 'error'
        : graders.some(grader => grader.status === 'fail') ? 'fail'
        : graders.some(grader => grader.status === 'unknown') ? 'unknown' : 'pass'
      return { status, graders }
    },
  }
}
