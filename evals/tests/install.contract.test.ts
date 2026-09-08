import { test, expect } from 'vitest'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createCodexTrial } from '@pstack/agent-eval/codex'
import { candidate, artifactRoot, executable } from './setup.js'

test('a clean Codex installation discovers the bundled skills without user configuration', async ({ signal, annotate }) => {
  const codex = await createCodexTrial({ candidate, artifactRoot, executable, files: {}, signal })
  try {
    await annotate(codex.artifacts.path)
    const skills = await codex.discover()
    const entries = await readdir(join(candidate.root, 'skills'), { withFileTypes: true })
    const expectedNames = entries.filter(entry => entry.isDirectory()).map(entry => `pstack:${entry.name}`).sort()
    expect(skills.map(skill => skill.name).sort()).toEqual(expectedNames)
    expect(skills.every(skill => skill.path.startsWith(codex.workspace.home))).toBe(true)
  } finally { await codex.dispose() }
})

test('plain Codex exposes no candidate files or plugin skills', async ({ signal, annotate }) => {
  const codex = await createCodexTrial({ candidate, artifactRoot, executable, files: {}, signal, plugin: 'none' })
  try {
    await annotate(codex.artifacts.path)
    expect(await codex.discover()).toEqual([])
    expect(await import('node:fs/promises').then(fs => fs.readdir(codex.workspace.candidate))).toEqual([])
    await expect(codex.install()).rejects.toThrow('disabled for plain Codex')
  } finally { await codex.dispose() }
})
