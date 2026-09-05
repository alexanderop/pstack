import { cp, lstat, mkdir, readFile, readdir, symlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { createHash } from 'node:crypto'
import { delimiter, dirname, isAbsolute, join } from 'node:path'
import { z } from 'zod'
import { createArtifacts } from './artifacts.js'
import { parentId, readEvidence, sessionMetadata } from './evidence.js'
import { execute, type ProcessResult } from './process.js'
import { openRpc } from './rpc.js'
import { createWorkspace, fileHashes, inside } from './workspace.js'
import type { AgentHarness } from './types.js'


type ThreadEvidence = ReturnType<typeof readEvidence> & { parentId: string | null }
export type RunResult =
  | { status: 'completed'; rootId: string; threads: ThreadEvidence[]; changedPaths: string[]; execution: ProcessResult }
  | { status: 'cancelled' | 'timed-out' | 'infrastructure-failure'; reason: string; rootId: string | null; threads: ThreadEvidence[]; changedPaths: string[]; execution: ProcessResult | null }

const json = (text: string): unknown => JSON.parse(text)
const record = z.object({ type: z.string(), payload: z.unknown().optional() }).passthrough()
const started = z.object({ type: z.literal('thread.started'), thread_id: z.string() })
const skillsSchema = z.object({ data: z.array(z.object({
  skills: z.array(z.object({ name: z.string(), path: z.string(), scope: z.string(), pluginId: z.string().nullable() })),
  errors: z.array(z.unknown()),
})) })
const installSchema = z.object({ installedPath: z.string(), pluginId: z.string(), version: z.string() })

export async function createCodexTrial(options: {
  artifactRoot: string
  candidate: { root: string; entries: readonly string[]; name: string; marketplace: string }
  files: Readonly<Record<string, string>>
  executable?: string
  model?: string
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'ultra'
  signal?: AbortSignal
}) {
  const artifacts = await createArtifacts(options.artifactRoot)
  const workspace = await createWorkspace()
  const codexHome = join(workspace.home, '.codex')
  workspace.env.CODEX_HOME = codexHome
  const signal = options.signal
  const executable = options.executable ?? 'codex'
  if (isAbsolute(executable)) workspace.env.PATH = `${dirname(executable)}${delimiter}${workspace.env.PATH}`
  const processOptions = { cwd: workspace.project, env: workspace.env, ...(signal ? { signal } : {}) }
  let installed: z.infer<typeof installSchema> | undefined
  let used = false
  let sequence = 0
  try {
    await mkdir(codexHome)
    const fixtureHashes = await workspace.seed(options.files, signal)
    const candidateHashes = await workspace.snapshot(options.candidate.root, options.candidate.entries)
    await artifacts.write('inputs.json', { fixtureHashes, candidateHashes, isolation: 'filesystem-convenience-only' })
    await cp(workspace.candidate, join(artifacts.path, 'candidate'), { recursive: true, errorOnExist: true, force: false })
    const command = async (executable: string, args: readonly string[]) => {
      const result = await execute({ command: executable, args, ...processOptions, timeoutMs: 45_000 })
      await artifacts.write(`command-${++sequence}.json`, { executable, args, ...result })
      if (result.status !== 'exited' || result.exitCode !== 0) throw new Error(`${executable} ${args[0]} failed: ${result.stderr || result.stdout}`)
      return result
    }
    async function install() {
      if (installed) return installed
      const version = await command(executable, ['--version'])
      if (version.stdout.trim() !== 'codex-cli 0.153.4') throw new Error(`Unsupported Codex protocol version: ${version.stdout.trim()}; validate the adapter before changing the pin. For HOME-dependent shims, set PSTACK_CODEX_BIN to the direct executable`)
      await command(executable, ['plugin', 'marketplace', 'add', workspace.candidate, '--json'])
      const result = await command(executable, ['plugin', 'add', `${options.candidate.name}@${options.candidate.marketplace}`, '--json'])
      installed = installSchema.parse(json(result.stdout))
      return installed
    }
    async function discover() {
      const plugin = await install()
      const rpc = await openRpc({ ...processOptions, executable })
      try {
        const raw = await rpc.call('skills/list', { cwds: [workspace.project], forceReload: true })
        await artifacts.write(`discovery-${++sequence}.json`, raw)
        const data = skillsSchema.parse(raw).data
        if (data.some(row => row.errors.length > 0)) throw new Error('Skill discovery returned errors')
        const skills = data.flatMap(row => row.skills)
        const unexpected = skills.filter(skill => skill.pluginId !== plugin.pluginId && skill.scope !== 'system')
        if (unexpected.length) throw new Error(`Foreign skill contamination: ${unexpected.map(skill => skill.name).join(', ')}`)
        return skills.filter(skill => skill.pluginId === plugin.pluginId)
      } finally { await rpc.dispose() }
    }
    async function collect(rootId: string) {
      const entries = await readdir(join(codexHome, 'sessions'), { recursive: true })
      const sessions = []
      for (const entry of entries.filter(entry => entry.endsWith('.jsonl'))) {
        const raw = await readFile(join(codexHome, 'sessions', entry), 'utf8')
        const rows = raw.split('\n').filter(Boolean).map(line => record.parse(json(line)))
        const metaRow = rows.find(row => row.type === 'session_meta')
        if (!metaRow) throw new Error(`Session metadata missing: ${entry}`)
        const meta = sessionMetadata.parse(metaRow.payload)
        sessions.push({ meta, raw, rows, parentId: parentId(meta) })
      }
      const owned = new Set([rootId])
      let previous = 0
      while (previous !== owned.size) {
        previous = owned.size
        for (const session of sessions) if (session.parentId && owned.has(session.parentId)) owned.add(session.meta.id)
      }
      if (!sessions.some(session => session.meta.id === rootId)) throw new Error('Root session transcript missing')
      const rpc = await openRpc({ cwd: workspace.project, env: workspace.env, executable })
      try {
        const threads = []
        for (const session of sessions.filter(session => owned.has(session.meta.id))) {
          const raw = await rpc.call('thread/read', { threadId: session.meta.id, includeTurns: true })
          const response = z.object({ thread: z.unknown() }).parse(raw)
          await artifacts.write(`thread-${session.meta.id}.json`, raw)
          const evidence = readEvidence(response.thread)
          await artifacts.write(`rollout-${session.meta.id}.json`, session.rows)
          threads.push({ ...evidence, parentId: session.parentId })
        }
        return threads
      } finally { await rpc.dispose() }
    }
    return {
      workspace, artifacts, install, discover, command,
      async run(prompt: string, settings: { timeoutMs?: number; sandbox?: 'read-only' | 'workspace-write'; directory?: string } = {}): Promise<RunResult> {
        if (used) throw new Error('Each trial permits one root conversation; create a new trial')
        used = true
        await artifacts.write('request.json', { prompt, promptHash: createHash('sha256').update(prompt).digest('hex'), model: options.model ?? 'runtime-default', reasoningEffort: options.reasoningEffort ?? 'runtime-default', settings })
        let execution: ProcessResult | null = null
        let observedRoot: string | null = null
        let observedChanges: string[] = []
        try {
          await discover()
          const auth = join(process.env.CODEX_HOME ?? join(homedir(), '.codex'), 'auth.json')
          if (!(await lstat(auth)).isFile()) throw new Error('Codex auth.json is unavailable')
          await symlink(auth, join(codexHome, 'auth.json'))
          const result = await execute({
            command: executable, args: ['exec', '--ignore-rules', '--json', '-s', settings.sandbox ?? 'workspace-write', ...(options.model ? ['--model', options.model] : []), ...(options.reasoningEffort ? ['-c', `model_reasoning_effort=${JSON.stringify(options.reasoningEffort)}`] : []), '-C', settings.directory ? inside(workspace.root, settings.directory) : workspace.project, prompt],
            ...processOptions, timeoutMs: settings.timeoutMs ?? 180_000,
          })
          execution = result
          await artifacts.write('execution.json', result)
          const roots = result.stdout.split('\n').filter(Boolean).map(line => started.safeParse(json(line))).filter(parsed => parsed.success).map(parsed => parsed.data.thread_id)
          const rootId = roots[0]
          observedRoot = rootId ?? null
          const changedPaths = await workspace.changes()
          observedChanges = changedPaths
          await cp(workspace.project, join(artifacts.path, 'workspace'), { recursive: true, filter: source => !source.split('/').includes('.git'), errorOnExist: true, force: false })
          await artifacts.write('candidate-after.json', await fileHashes(workspace.candidate))
          const threads = rootId ? await collect(rootId) : []
          await artifacts.write('evidence.json', { rootId, threads, changedPaths })
          const final: RunResult = result.status === 'exited' && result.exitCode === 0 && roots.length === 1 && rootId && threads.length > 0 && threads.every(thread => thread.completed)
            ? { status: 'completed', rootId, threads, changedPaths, execution: result }
            : { status: result.status === 'cancelled' ? 'cancelled' : result.status === 'timed-out' ? 'timed-out' : 'infrastructure-failure', reason: `Process ${result.status}, exit ${result.exitCode}; ${threads.filter(thread => thread.completed).length}/${threads.length} threads completed`, rootId: rootId ?? null, threads, changedPaths, execution: result }
          await artifacts.write('result.json', final)
          return final
        } catch (error) {
          const result: RunResult = { status: signal?.aborted || execution?.status === 'cancelled' ? 'cancelled' : execution?.status === 'timed-out' ? 'timed-out' : 'infrastructure-failure', reason: error instanceof Error ? error.message : String(error), rootId: observedRoot, threads: [], changedPaths: observedChanges, execution }
          await artifacts.write('result.json', result)
          return result
        }
      },
      async dispose() { await workspace.dispose() },
    }
  } catch (error) {
    await artifacts.write('setup-error.json', { workspace: workspace.root, message: error instanceof Error ? error.message : String(error) })
    await workspace.dispose()
    throw error
  }
}

export type CodexTrial = Awaited<ReturnType<typeof createCodexTrial>>

export function codexHarness(settings: Pick<Parameters<typeof createCodexTrial>[0], 'executable' | 'model' | 'reasoningEffort'> = {}): AgentHarness {
  return {
    id: 'codex',
    label: 'Codex',
    async createSession(options) {
      const trial = await createCodexTrial({ ...options, ...settings })
      return {
        environment: {
          root: trial.workspace.root,
          project: trial.workspace.project,
          read: trial.workspace.read,
          changes: trial.workspace.changes,
          command: trial.command,
        },
        artifacts: trial.artifacts,
        skill: (name, instruction) => `Use $${options.candidate.name}:${name} to ${instruction}`,
        async pluginFile(path) { return inside((await trial.install()).installedPath, path) },
        async run(prompt, settings) {
          const result = await trial.run(prompt, settings)
          const threads = result.threads.map(thread => ({
            id: thread.id, parentId: thread.parentId, completed: thread.completed,
            reads: thread.reads.map(read => ({ path: read.path, output: read.output })),
            commands: thread.commands.map(command => ({
              command: command.command, exitCode: command.exitCode, output: command.aggregatedOutput,
            })),
          }))
          return result.status === 'completed'
            ? { status: 'completed', rootId: result.rootId, threads }
            : { status: result.status, reason: result.reason, rootId: result.rootId, threads }
        },
        dispose: trial.dispose,
      }
    },
  }
}
