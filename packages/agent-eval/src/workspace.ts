import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { execute } from './process.js'

export function inside(root: string, name: string) {
  const path = resolve(root, name)
  if (isAbsolute(name) || path === root || !path.startsWith(`${root}${sep}`)) throw new Error(`Path escapes workspace: ${name}`)
  return path
}

export async function fileHashes(root: string): Promise<Readonly<Record<string, string>>> {
  const hashes: Record<string, string> = {}
  async function walk(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === '.git') continue
      const path = join(directory, entry.name)
      if (entry.isSymbolicLink()) throw new Error(`Symlink in snapshot: ${path}`)
      if (entry.isDirectory()) await walk(path)
      else if (entry.isFile()) hashes[relative(root, path)] = createHash('sha256').update(await readFile(path)).digest('hex')
    }
  }
  await walk(root)
  return Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)))
}

export async function createWorkspace() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'pstack-eval-')))
  const home = join(root, 'home')
  const project = join(root, 'project')
  const candidate = join(root, 'candidate')
  await Promise.all([mkdir(home, { recursive: true }), mkdir(project), mkdir(candidate), mkdir(join(root, 'tmp'))])
  const env: NodeJS.ProcessEnv = {
    PATH: [dirname(process.execPath), process.env.PATH].filter(Boolean).join(delimiter), HOME: home, USERPROFILE: home,
    TMPDIR: join(root, 'tmp'), ZDOTDIR: home, LANG: 'en_US.UTF-8', TERM: 'dumb',
  }
  const profile = `export PATH='${(env.PATH ?? '').replaceAll("'", "'\\''")}'\n`
  await Promise.all(['.zprofile', '.bash_profile'].map(name => writeFile(join(home, name), profile)))
  let baseline: Readonly<Record<string, string>> = {}
  const shell = async (command: string, args: readonly string[], signal?: AbortSignal) => {
    const result = await execute({ command, args, cwd: project, env, ...(signal ? { signal } : {}) })
    if (result.status !== 'exited' || result.exitCode !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`)
    return result
  }
  return {
    root, home, project, candidate, env, shell,
    async seed(files: Readonly<Record<string, string>>, signal?: AbortSignal) {
      for (const [name, content] of Object.entries(files)) {
        const path = inside(project, name)
        await mkdir(resolve(path, '..'), { recursive: true })
        await writeFile(path, content)
      }
      await shell('git', ['init', '-q', '-b', 'main'], signal)
      await shell('git', ['add', '.'], signal)
      await shell('git', ['-c', 'user.name=Eval', '-c', 'user.email=eval@example.invalid', 'commit', '-qm', 'fixture', '--allow-empty'], signal)
      baseline = await fileHashes(project)
      return baseline
    },
    async snapshot(source: string, entries: readonly string[]) {
      for (const entry of entries) await cp(inside(resolve(source), entry), inside(candidate, entry), { recursive: true, dereference: false, filter: path => !path.split(sep).some(part => part === 'node_modules' || part === '.git') })
      return fileHashes(candidate)
    },
    async read(name: string) { return readFile(inside(project, name), 'utf8') },
    async changes() {
      const after = await fileHashes(project)
      return [...new Set([...Object.keys(baseline), ...Object.keys(after)])].filter(path => baseline[path] !== after[path]).sort()
    },
    async dispose() { await rm(root, { recursive: true, force: true }) },
  }
}

export type Workspace = Awaited<ReturnType<typeof createWorkspace>>
