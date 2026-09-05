import { test, expect } from 'vitest'
import { summarize } from './report.mjs'

test('keeps failed trials and separates candidate revisions and models', () => {
  const row = { directory: 'a', trial: { suite: 'Records comparison / revised / repetition 1', task: 'search', status: 'pass', graders: [{ name: 'Search behavior', status: 'pass' }] },
    request: { model: 'same', reasoningEffort: 'medium' }, inputs: { fixtureHashes: { a: 'fixture' }, candidateHashes: { skill: 'first' } }, metrics: { elapsedMs: 10 } }
  const result = summarize([row, { ...row, directory: 'b', trial: { ...row.trial, status: 'fail' }, metrics: { elapsedMs: 30 } },
    { ...row, inputs: { ...row.inputs, candidateHashes: { skill: 'second' } } }, { ...row, request: { ...row.request, model: 'different' } }])
  expect(result).toHaveLength(3)
  expect(result[0]).toMatchObject({ attempts: 2, passing: 1, behaviorPassing: 2, medianElapsedMs: 20 })
})
