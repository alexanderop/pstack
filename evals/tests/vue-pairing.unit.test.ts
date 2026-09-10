import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, expect, test } from 'vitest'
import { guideExposure, vueFiles } from '../tasks/vue-components.js'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

test('changes only the workspace guide between conditions', () => {
  const without = vueFiles('without')
  const withPrinciple = vueFiles('with')
  const { 'guide.md': guide, ...base } = without
  const { 'guide.md': extended, ...treatment } = withPrinciple
  expect(treatment).toEqual(base)
  expect(extended.startsWith(guide)).toBe(true)
  expect(extended).toContain('# Compose Vue Components')
  expect(extended).toContain('**Accessibility first.**')
  expect(extended).toContain('**Name components consistently.**')
  expect(guide).not.toContain('# Compose Vue Components')
})

test('recognizes the complete returned guide even when a later shell command fails', () => {
  const expectedGuide = vueFiles('with')['guide.md']
  const command = { command: 'cat guide.md src/App.vue; ls -la', exitCode: 0, output: expectedGuide + '<template />' }
  const thread = { id: 'root', parentId: null, completed: true, reads: [], commands: [command] }
  expect(guideExposure({ status: 'completed', rootId: 'root', threads: [thread] }, expectedGuide).status).toBe('pass')
  expect(guideExposure({ status: 'completed', rootId: 'root', threads: [{ ...thread, commands: [{ ...command, output: 'I read guide.md' }] }] }, expectedGuide).status).toBe('unknown')
  expect(guideExposure({ status: 'completed', rootId: 'root', threads: [{ ...thread, commands: [{ ...command, exitCode: 1 }] }] }, expectedGuide).status).toBe('pass')
})

test('pairs matching arms, blinds source, and retains incomplete attempts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vue-pairs-'))
  roots.push(root)
  async function seed(name: string, condition: string, model = 'same-model', complete = true) {
    const path = join(root, name)
    await mkdir(path)
    const files: Record<string, unknown> = {
      'vue-comparison.json': { scenario: 'avatar', condition, repetition: 1, principleHash: 'same-principle' },
      'request.json': { prompt: 'Read guide.md and build an avatar.', promptHash: 'same-prompt', model, reasoningEffort: 'medium', settings: {} },
      'inputs.json': { fixtureHashes: { 'guide.md': condition, 'src/App.vue': 'same-source' } },
      ...(complete ? {
        'source.json': { 'src/App.vue': '<template>Person</template>' },
        'outcome.json': { verification: { passed: true, detail: 'Visible initials update' } },
        'trial.json': { status: 'pass' },
      } : {}),
    }
    for (const [file, content] of Object.entries(files)) await writeFile(join(path, file), JSON.stringify(content))
  }
  await seed('one', 'without')
  await seed('two', 'with')
  await seed('three', 'without', 'different-model', false)
  const checkerHash = createHash('sha256').update(await readFile(resolve('evals/checks/vue-components.ts'))).digest('hex')
  const replay = {
    checkerHash,
    sourceHash: createHash('sha256').update(JSON.stringify([['src/App.vue', '<template>Person</template>']])).digest('hex'),
    exposure: { status: 'pass' },
    behavior: { passed: true, detail: 'Corrected checker result' },
  }
  await writeFile(join(root, 'one', 'recheck-1.json'), JSON.stringify(replay))
  await writeFile(join(root, 'one', 'recheck-2.json'), JSON.stringify({ ...replay, sourceHash: 'different-source', behavior: { passed: false, detail: 'Wrong implementation' } }))
  const output = join(root, 'packets')
  await promisify(execFile)(process.execPath, [resolve('evals/scripts/vue-review-packet.mjs'), root, output])
  const manifest: unknown = JSON.parse(await readFile(join(root, 'vue-review-manifest.json'), 'utf8'))
  expect(manifest).toEqual(expect.arrayContaining([
    expect.objectContaining({ status: 'ready', mapping: expect.arrayContaining([
      expect.objectContaining({ condition: 'with' }), expect.objectContaining({ condition: 'without' }),
    ]) }),
    expect.objectContaining({ status: 'incomplete-or-ambiguous' }),
  ]))
  const { readdir } = await import('node:fs/promises')
  const packets = await readdir(output)
  expect(packets).toHaveLength(1)
  const packet = await readFile(join(output, packets[0] ?? ''), 'utf8')
  expect(packet).toContain('src/App.vue')
  expect(packet).toContain('Corrected checker result')
  expect(packet).not.toContain('Wrong implementation')
  expect(packet).not.toContain('same-model')
  expect(packet).not.toContain('same-principle')
  expect(packet).not.toContain('"condition"')
  expect(packet).not.toContain('guide.md')
  const parsed: unknown = JSON.parse(packet)
  expect(parsed).toEqual(expect.objectContaining({
    rubric: expect.arrayContaining([
      expect.stringContaining('Accessibility first:'),
      expect.stringContaining('Naming:'),
      expect.stringContaining('Small pure computations may stay inside a component'),
    ]),
    rubricHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    response: expect.stringContaining('total out of 12'),
  }))
  await promisify(execFile)(process.execPath, [resolve('evals/scripts/vue-review-packet.mjs'), root, output])
  expect(await readFile(join(output, packets[0] ?? ''), 'utf8')).toBe(packet)
})
