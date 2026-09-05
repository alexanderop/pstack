import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, expect, test } from 'vitest'
import { defineTask, equal, type AgentHarness } from '../src/index.js'
import { evaluationSuite } from '../src/vitest.js'
import { createWorkspace } from '../src/workspace.js'
import { createArtifacts } from '../src/artifacts.js'

const artifactRoot = await mkdtemp(join(tmpdir(), 'suite-contract-'))
afterAll(() => rm(artifactRoot, { recursive: true, force: true }))
const roots = new Set<string>()

const scriptedHarness: AgentHarness = {
  id: 'scripted-contract', label: 'Scripted adapter contract',
  async createSession(options) {
    const workspace = await createWorkspace()
    await workspace.seed(options.files, options.signal)
    const artifacts = await createArtifacts(options.artifactRoot)
    expect(roots.has(workspace.root)).toBe(false)
    roots.add(workspace.root)
    return {
      environment: { ...workspace, command: workspace.shell }, artifacts,
      skill: (name, instruction) => `${name}: ${instruction}`,
      async pluginFile(path) { return join(workspace.candidate, path) },
      async run(prompt) {
        expect(prompt).toBe('sample: update the answer')
        expect(await workspace.read('answer.txt')).toBe('fresh')
        await workspace.shell(process.execPath, ['-e', 'require("node:fs").writeFileSync("answer.txt", "done")'], options.signal)
        return { status: 'completed', rootId: 'scripted', threads: [] }
      },
      dispose: workspace.dispose,
    }
  },
}

const task = defineTask({
  id: 'portable-task', description: 'Run through an independent agent harness',
  files: { 'answer.txt': 'fresh' },
  prompt: agent => agent.skill('sample', 'update the answer'),
  observe: agent => agent.environment.read('answer.txt'),
  graders: { Outcome: ({ outcome }) => [equal('Saved answer', outcome, 'done')] },
})
const options = {
  name: 'Evaluation harness contract', agentHarness: scriptedHarness,
  candidate: { root: process.cwd(), entries: [], name: 'test', marketplace: 'test' },
  artifactRoot, tasks: [task], trials: 2,
}
evaluationSuite(options)

test('invalid trial counts and duplicate tasks fail before execution', () => {
  expect(() => evaluationSuite({ ...options, trials: 0 })).toThrow('positive integer')
  expect(() => evaluationSuite({ ...options, trials: 1.5 })).toThrow('positive integer')
  expect(() => evaluationSuite({ ...options, tasks: [task, task] })).toThrow('unique')
})
