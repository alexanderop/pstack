import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect } from 'vitest'
import { createWorkspace, inside } from '../src/workspace.js'
import { createArtifacts } from '../src/artifacts.js'

test('rejects paths outside the workspace', () => {
  expect(() => inside('/tmp/fixture', '../escape')).toThrow()
  expect(() => inside('/tmp/fixture', '/absolute')).toThrow()
  expect(() => inside('/tmp/fixture', '.')).toThrow()
})

test('records changed and removed fixture files', async () => {
  const workspace = await createWorkspace()
  try {
    await workspace.seed({ 'src/a.txt': 'original', 'src/b.txt': 'keep' })
    await writeFile(join(workspace.project, 'src/a.txt'), 'changed')
    await rm(join(workspace.project, 'src/b.txt'))
    expect(await workspace.changes()).toEqual(['src/a.txt', 'src/b.txt'])
    expect(workspace.env.HOME).toBe(workspace.home)
    expect(workspace.env.CODEX_HOME).toBe(workspace.codexHome)
    expect(workspace.env.CLAUDECODE).toBeUndefined()
  } finally { await workspace.dispose() }
  await expect(readFile(join(workspace.project, 'src/a.txt'))).rejects.toThrow()
})

test('candidate snapshots omit nested generated dependencies', async () => {
  const source = await mkdtemp(join(tmpdir(), 'candidate-'))
  const workspace = await createWorkspace()
  try {
    await mkdir(join(source, 'skills/node_modules'), { recursive: true })
    await writeFile(join(source, 'skills/SKILL.md'), 'instructions')
    await writeFile(join(source, 'skills/node_modules/generated.js'), 'generated')
    expect(Object.keys(await workspace.snapshot(source, ['skills']))).toEqual(['skills/SKILL.md'])
  } finally { await workspace.dispose(); await rm(source, { recursive: true, force: true }) }
})

test('artifacts cannot overwrite previous evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'artifacts-'))
  try {
    const artifacts = await createArtifacts(root)
    await artifacts.write('result.json', { status: 'failed' })
    await expect(artifacts.write('result.json', { status: 'passed' })).rejects.toThrow()
    expect(JSON.parse(await readFile(join(artifacts.path, 'result.json'), 'utf8'))).toEqual({ status: 'failed' })
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('cancelled trial setup removes its workspace and retains the setup failure', async () => {
  const { createCodexTrial } = await import('../src/codex.js')
  const { readdir, stat } = await import('node:fs/promises')
  const { z } = await import('zod')
  const artifacts = await mkdtemp(join(tmpdir(), 'cancelled-setup-'))
  try {
    await expect(createCodexTrial({
      artifactRoot: artifacts,
      candidate: { root: process.cwd(), entries: [], name: 'probe', marketplace: 'probe' },
      files: {}, signal: AbortSignal.abort(),
    })).rejects.toThrow()
    const [run] = await readdir(artifacts)
    expect(run).toBeTypeOf('string')
    if (!run) throw new Error('Missing setup evidence')
    const failure = z.object({ workspace: z.string(), message: z.string() }).parse(JSON.parse(await readFile(join(artifacts, run, 'setup-error.json'), 'utf8')))
    await expect(stat(failure.workspace)).rejects.toThrow()
  } finally { await rm(artifacts, { recursive: true, force: true }) }
})

test('the isolated login shell uses the same Node runtime as Vitest', async () => {
  const workspace = await createWorkspace()
  try {
    const shell = process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash'
    const result = await workspace.shell(shell, ['-lc', 'node --version'])
    expect(result.stdout.trim()).toBe(process.version)
  } finally { await workspace.dispose() }
})
