import { isDeepStrictEqual, inspect } from 'node:util'
import type { Check, Transcript } from './types.js'

export function equal(name: string, actual: unknown, expected: unknown): Check {
  return {
    name,
    status: isDeepStrictEqual(actual, expected) ? 'pass' : 'fail',
    detail: `Expected ${inspect(expected)}, received ${inspect(actual)}`,
  }
}

export function observedRead(name: string, transcript: Transcript, path: string, scope: 'root' | 'child'): Check {
  const threads = transcript.threads.filter(thread => thread.completed && (
    scope === 'child' ? thread.parentId === transcript.rootId : thread.id === transcript.rootId
  ))
  const found = threads.some(thread => thread.reads.some(read => read.path.endsWith(path)))
  return {
    name,
    status: found ? 'pass' : 'unknown',
    detail: found ? `Successful ${scope} file read: ${path}` : `No recognized ${scope} read of ${path}. Inspect the raw transcript; missing evidence is not proof of a missing read.`,
  }
}
