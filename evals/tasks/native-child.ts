import { defineTask, equal, observedRead } from '@pstack/agent-eval'

export const nativeChild = defineTask({
  id: 'native-child',
  description: 'Complete a child agent that reads a file and runs Node',
  files: { 'README.md': 'A disposable pstack acceptance fixture.\n' },
  prompt: 'This is a bounded runtime smoke test. Spawn exactly one native default child agent. Have it read README.md, run node --version, and return both results. Wait for its completion. Do not change files, use other projects, or spawn further children.',
  settings: { sandbox: 'read-only' },
  async observe({ environment }) {
    return { changedPaths: await environment.changes() }
  },
  graders: {
    'Child execution': ({ transcript }) => {
      const children = transcript.threads.filter(thread => thread.parentId === transcript.rootId)
      return [
        equal('Exactly one completed child', children.map(child => child.completed), [true]),
        observedRead('Child read the fixture', transcript, '/README.md', 'child'),
        equal('Read output contains the fixture contents', children.some(child => child.reads.some(read =>
          read.path.endsWith('/README.md') && read.output.includes('A disposable pstack acceptance fixture.'),
        )), true),
        equal('Child used the expected Node runtime', children.some(child => child.commands.some(command =>
          command.exitCode === 0 && command.output?.split(/\r?\n/).includes(process.version),
        )), true),
      ]
    },
    'Unchanged workspace': ({ outcome }) => [equal('No files changed', outcome.changedPaths, [])],
  },
})
