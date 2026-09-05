import { defineTask, equal, observedRead } from '@pstack/agent-eval'

const application = 'export function add(a, b) { return a + b; }\n'
const license = '// SPDX-License-Identifier: MIT\n'

export const commentReview = defineTask({
  id: 'comment-review',
  description: 'Remove redundant comments while preserving the license and behavior',
  files: {
    'src/add.mjs': `${license}// Add the two numbers.\n${application}`,
  },
  prompt: agent => agent.skill('no-comments', 'remove redundant comments in src/add.mjs. Keep the license header. Do not change application behavior or other files.'),
  async observe({ environment }) {
    return {
      source: await environment.read('src/add.mjs'),
      changedPaths: await environment.changes(),
    }
  },
  graders: {
    'Correct edit': ({ outcome }) => [
      equal('License and application code preserved', outcome.source, license + application),
      equal('Only the requested file changed', outcome.changedPaths, ['src/add.mjs']),
    ],
    'Reviewer instructions': ({ transcript }) => [
      equal('A child reviewer completed', transcript.threads.some(thread => thread.parentId === transcript.rootId && thread.completed), true),
      observedRead('Child loaded Comment Sicko', transcript, '/agents/comment-sicko.md', 'child'),
    ],
  },
})
