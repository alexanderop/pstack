import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { test, expect } from 'vitest'
import { defineTask, equal, observedRead, type AgentSession, type Transcript } from '../src/index.js'
import { createWorkspace } from '../src/workspace.js'
import { createArtifacts } from '../src/artifacts.js'

const completed: Transcript = { status: 'completed', rootId: 'root', threads: [] }

async function withSession(run: (session: AgentSession) => Promise<void>, transcript = completed) {
  const workspace = await createWorkspace()
  const artifactsRoot = await mkdtemp(join(tmpdir(), 'task-grading-'))
  try {
    await workspace.seed({ 'answer.txt': 'original' })
    const artifacts = await createArtifacts(artifactsRoot)
    const session: AgentSession = {
      environment: { ...workspace, command: workspace.shell }, artifacts,
      skill: (name, instruction) => `${name}: ${instruction}`,
      async pluginFile(path) { return join(workspace.candidate, path) },
      async run() {
        await workspace.shell(process.execPath, ['-e', 'require("node:fs").writeFileSync("answer.txt", "actual outcome")'])
        return transcript
      },
      dispose: workspace.dispose,
    }
    await run(session)
  } finally { await workspace.dispose(); await rm(artifactsRoot, { recursive: true, force: true }) }
}

test('grades the real file outcome and preserves every grader after a failure', async () => {
  const task = defineTask({
    id: 'outcome', description: 'Observe the environment', files: {}, prompt: 'write an answer',
    observe: session => session.environment.read('answer.txt'),
    graders: {
      'Wrong expectation': ({ outcome }) => [equal('Answer', outcome, 'wrong')],
      'Actual outcome': ({ outcome }) => [equal('Answer', outcome, 'actual outcome')],
    },
  })
  await withSession(async session => {
    const result = await task.execute(session)
    expect(result.status).toBe('fail')
    expect(result.graders.map(grade => grade.status)).toEqual(['fail', 'pass'])
    expect(JSON.parse(await readFile(join(session.artifacts.path, 'outcome.json'), 'utf8'))).toBe('actual outcome')
  })
})

test('missing read evidence is unknown rather than proof of agent failure', async () => {
  const task = defineTask({
    id: 'unknown', description: 'Check evidence', files: {}, prompt: 'read instructions',
    observe: async () => null,
    graders: {
      'Instructions': ({ transcript }) => [observedRead('Wrapper', transcript, '/wrapper.md', 'child')],
    },
  })
  await withSession(async session => expect((await task.execute(session)).status).toBe('unknown'))
})

test('a grader exception is an error and does not hide later grader results', async () => {
  const task = defineTask({
    id: 'error', description: 'Exercise grader errors', files: {}, prompt: 'write',
    observe: async () => null,
    graders: {
      Broken: () => { throw new Error('grader bug') },
      Working: () => [equal('Check', 1, 1)],
    },
  })
  await withSession(async session => {
    const result = await task.execute(session)
    expect(result.status).toBe('error')
    expect(result.graders.map(grade => grade.status)).toEqual(['error', 'pass'])
  })
})

test('a failed runtime cannot receive an outcome pass', async () => {
  const task = defineTask({
    id: 'runtime-error', description: 'Reject incomplete execution', files: {}, prompt: 'write',
    observe: async () => { throw new Error('Must not grade a failed runtime') },
    graders: { Correct: () => [equal('Check', 1, 1)] },
  })
  await withSession(async session => {
    const result = await task.execute(session)
    expect(result).toEqual({ status: 'error', graders: [{ name: 'Agent execution', status: 'error', reason: 'timed-out: deadline' }] })
  }, { status: 'timed-out', reason: 'deadline', rootId: null, threads: [] })
})

test('empty graders cannot pass vacuously', async () => {
  expect(() => defineTask({ id: 'empty', description: 'Empty', files: {}, prompt: '', observe: async () => null, graders: {} })).toThrow('at least one grader')
  const task = defineTask({
    id: 'empty-checks', description: 'Empty', files: {}, prompt: '', observe: async () => null,
    graders: { Empty: () => [] },
  })
  await withSession(async session => expect((await task.execute(session)).status).toBe('error'))
})
