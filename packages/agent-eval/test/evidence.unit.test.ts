import { readFile } from 'node:fs/promises'
import { test, expect } from 'vitest'
import { readEvidence } from '../src/evidence.js'

const recorded: unknown = JSON.parse(await readFile(new URL('./fixtures/comment-review.json', import.meta.url), 'utf8'))

test('recognizes a successful wrapper read from a captured Codex thread', () => {
  const evidence = readEvidence(recorded)
  expect(evidence.completed).toBe(true)
  expect(evidence.reads.map(read => read.path.split('/').at(-1))).toEqual(['comment-sicko.md'])
})

test.each([
  { type: 'agentMessage', text: 'I read agents/comment-sicko.md' },
  { type: 'commandExecution', id: 'echo', command: 'echo agents/comment-sicko.md', status: 'completed', exitCode: 0, aggregatedOutput: 'agents/comment-sicko.md', commandActions: [{ type: 'unknown' }] },
  { type: 'commandExecution', id: 'failed', command: 'cat absent', status: 'completed', exitCode: 1, aggregatedOutput: 'not found', commandActions: [{ type: 'read', path: 'absent' }] },
  { type: 'commandExecution', id: 'truncated', command: 'cat file', status: 'completed', exitCode: 0, aggregatedOutput: 'Warning: truncated output\npartial', commandActions: [{ type: 'read', path: 'file' }] },
  { type: 'commandExecution', id: 'running', command: 'cat file', status: 'inProgress', exitCode: null, aggregatedOutput: 'partial', commandActions: [{ type: 'read', path: 'file' }] },
])('does not accept false or incomplete read evidence: $type $id', item => {
  expect(readEvidence({ id: 'thread', turns: [{ id: 'turn', status: 'completed', items: [item] }] }).reads).toEqual([])
})

test('a thread with no completed turns is not success', () => {
  expect(readEvidence({ id: 'thread', turns: [] }).completed).toBe(false)
  expect(readEvidence({ id: 'thread', turns: [{ id: 'turn', status: 'failed', items: [] }] }).completed).toBe(false)
})

test('malformed history fails rather than becoming an empty success', () => {
  expect(() => readEvidence({ id: 'thread', turns: 'unrecognized protocol' })).toThrow()
})

test('accepts a runtime command action with no resolved path without inventing a read', () => {
  const thread = { id: 'thread', turns: [{ id: 'turn', status: 'completed', items: [
    { type: 'commandExecution', id: 'search', command: 'rg --files', status: 'completed', exitCode: 0, aggregatedOutput: 'README.md', commandActions: [{ type: 'search', path: null }] },
  ] }] }
  expect(readEvidence(thread).reads).toEqual([])
})
