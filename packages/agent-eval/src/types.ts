import type { ProcessResult } from './process.js'

export type Candidate = Readonly<{
  root: string
  entries: readonly string[]
  name: string
  marketplace: string
}>

export type TranscriptThread = Readonly<{
  id: string
  parentId: string | null
  completed: boolean
  injectedSkills?: readonly Readonly<{ name: string; path: string; content: string }>[]
  reads: readonly Readonly<{ path: string; output: string }>[]
  commands: readonly Readonly<{
    command: string
    exitCode: number | null
    output: string | null
  }>[]
}>

type Trace = Readonly<{ threads: readonly TranscriptThread[] }>
export type Transcript = Trace & (
  | Readonly<{ status: 'completed'; rootId: string }>
  | Readonly<{ status: 'cancelled' | 'timed-out' | 'infrastructure-failure'; reason: string; rootId: string | null }>
)

export type RunSettings = Readonly<{
  timeoutMs?: number
  sandbox?: 'read-only' | 'workspace-write'
  directory?: string
}>

export interface TrialEnvironment {
  readonly root: string
  readonly project: string
  read(path: string): Promise<string>
  changes(): Promise<string[]>
  command(executable: string, args: readonly string[]): Promise<ProcessResult>
}

export interface AgentSession {
  readonly environment: TrialEnvironment
  readonly artifacts: {
    readonly path: string
    write(name: string, value: unknown): Promise<void>
  }
  skill(name: string, instruction: string): string
  pluginFile(path: string): Promise<string>
  run(prompt: string, settings?: RunSettings): Promise<Transcript>
  dispose(): Promise<void>
}

export interface AgentHarness {
  readonly id: string
  readonly label: string
  createSession(options: {
    candidate: Candidate
    artifactRoot: string
    files: Readonly<Record<string, string>>
    signal: AbortSignal
  }): Promise<AgentSession>
}

export type Check = Readonly<{
  name: string
  status: 'pass' | 'fail' | 'unknown'
  detail: string
}>

export type TrialObservation<Outcome> = Readonly<{
  transcript: Transcript
  outcome: Outcome
}>

export type Grader<Outcome> = (trial: TrialObservation<Outcome>) => readonly Check[] | Promise<readonly Check[]>

export type GraderResult =
  | Readonly<{ name: string; status: 'pass' | 'fail' | 'unknown'; checks: readonly Check[] }>
  | Readonly<{ name: string; status: 'error'; reason: string }>

export type TrialResult = Readonly<{
  status: 'pass' | 'fail' | 'unknown' | 'error'
  graders: readonly GraderResult[]
}>

export interface EvaluationTask {
  readonly id: string
  readonly description: string
  readonly files: Readonly<Record<string, string>>
  execute(session: AgentSession): Promise<TrialResult>
}
