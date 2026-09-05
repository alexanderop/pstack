import { test, expect } from 'vitest'
import { createCodexTrial } from '@pstack/agent-eval/codex'
import { candidate, artifactRoot, executable } from './setup.js'

test('a clean Codex installation discovers the bundled skills without user configuration', async ({ signal, annotate }) => {
  const codex = await createCodexTrial({ candidate, artifactRoot, executable, files: {}, signal })
  try {
    await annotate(codex.artifacts.path)
    const skills = await codex.discover()
    expect(skills).toHaveLength(44)
    expect(skills.map(skill => skill.name)).toEqual(expect.arrayContaining(['pstack:poteto-mode', 'pstack:no-comments']))
    expect(skills.every(skill => skill.path.startsWith(codex.workspace.home))).toBe(true)
  } finally { await codex.dispose() }
})
