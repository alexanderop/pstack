import { test } from './setup.js'

test('a clean installation discovers the bundled skills without user configuration', async ({ codex, expect, annotate }) => {
  await annotate(codex.artifacts.path)
  const skills = await codex.discover()
  expect(skills).toHaveLength(44)
  expect(skills.map(skill => skill.name)).toEqual(expect.arrayContaining(['pstack:poteto-mode', 'pstack:no-comments']))
  expect(skills.every(skill => skill.path.startsWith(codex.workspace.codexHome))).toBe(true)
})
