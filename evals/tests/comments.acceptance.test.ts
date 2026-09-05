import { codexTest } from '@pstack/agent-eval/vitest'
import { candidate, artifactRoot, executable, model } from './setup.js'

const expected = '// SPDX-License-Identifier: MIT\nexport function add(a, b) { return a + b; }\n'
const test = codexTest({ candidate, artifactRoot, executable, model, reasoningEffort: 'medium', files: {
  'src/add.mjs': '// SPDX-License-Identifier: MIT\n// Add the two numbers.\nexport function add(a, b) { return a + b; }\n',
} })

test('comment review works through the installed skill without manual agent setup', async ({ codex, expect, annotate }) => {
  await annotate(codex.artifacts.path)
  const run = await codex.run('Use $pstack:no-comments to remove redundant comments in src/add.mjs. Keep the license header. Do not change application behavior or other files.')
  expect(run.status, JSON.stringify(run)).toBe('completed')
  const children = run.threads.filter(thread => thread.parentId === run.rootId && thread.completed)
  expect(children.flatMap(child => child.reads).some(read => read.path.endsWith('/agents/comment-sicko.md'))).toBe(true)
  expect(await codex.workspace.read('src/add.mjs')).toBe(expected)
  expect(run.changedPaths).toEqual(['src/add.mjs'])
})
