import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { test, expect } from 'vitest'
import { checkVueComponents } from '../checks/vue-components.ts'
import { guideExposure, requests, sourceFiles } from '../tasks/vue-components.ts'

const root = resolve(process.env.PSTACK_VUE_ARTIFACTS ?? '.eval-artifacts')
const checkerHash = createHash('sha256').update(await readFile(new URL('../checks/vue-components.ts', import.meta.url))).digest('hex')
const attempts = []
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const path = join(root, entry.name)
  try {
    const metadata = JSON.parse(await readFile(join(path, 'vue-comparison.json'), 'utf8'))
    attempts.push({ path, metadata })
  } catch (error) { if (error.code !== 'ENOENT') throw error }
}
test('finds saved Vue attempts', () => { expect(attempts.length).toBeGreaterThan(0) })
for (const { path, metadata } of attempts) {
  test(`${metadata.scenario} / ${metadata.condition} / ${path.split('/').at(-1)}`, async () => {
    const request = JSON.parse(await readFile(join(path, 'request.json'), 'utf8'))
    expect(request.promptHash, 'Saved task contract differs from the current checker; use a matching campaign or the historical evaluator').toBe(
      createHash('sha256').update(requests[metadata.scenario]).digest('hex'),
    )
    const transcript = JSON.parse(await readFile(join(path, 'transcript.json'), 'utf8'))
    expect(transcript.status).toBe('completed')
    const workspace = join(path, 'workspace')
    const guide = await readFile(join(workspace, 'guide.md'), 'utf8')
    const inputs = JSON.parse(await readFile(join(path, 'inputs.json'), 'utf8'))
    expect(createHash('sha256').update(guide).digest('hex')).toBe(inputs.fixtureHashes['guide.md'])
    const exposure = guideExposure(transcript, guide)
    const source = await sourceFiles(workspace)
    expect(source, 'Saved implementation changed after the original run').toEqual(JSON.parse(await readFile(join(path, 'source.json'), 'utf8')))
    const sourceHash = createHash('sha256').update(JSON.stringify(Object.entries(source).sort(([a], [b]) => a.localeCompare(b)))).digest('hex')
    const behavior = await checkVueComponents(workspace, metadata.scenario)
    await writeFile(join(path, `recheck-${Date.now()}.json`), JSON.stringify({ checkedAt: new Date().toISOString(), checkerHash, sourceHash, exposure, behavior }, null, 2) + '\n')
    expect(exposure.status, exposure.detail).toBe('pass')
    expect(behavior.passed, behavior.detail).toBe(true)
  }, 60_000)
}
