import { test } from './setup.js'

test('real Codex completes a native child and reads its fixture', async ({ codex, expect, annotate }) => {
  await annotate(codex.artifacts.path)
  const result = await codex.run('This is a bounded runtime smoke test. Spawn exactly one native default child agent. Have it read README.md, run node --version, and return both results. Wait for its completion. Do not change files, use other projects, or spawn further children.', { sandbox: 'read-only' })
  expect(result.status, JSON.stringify(result)).toBe('completed')
  const children = result.threads.filter(thread => thread.parentId === result.rootId)
  expect(children).toHaveLength(1)
  expect(children[0]?.completed).toBe(true)
  expect(children.flatMap(child => child.reads).some(read => read.path.endsWith('/README.md') && read.output?.includes('A disposable pstack acceptance fixture.'))).toBe(true)
  expect(children.flatMap(child => child.commands).some(command => command.exitCode === 0 && command.aggregatedOutput?.split(/\r?\n/).includes(process.version))).toBe(true)
  expect(result.changedPaths).toEqual([])
})
