import { spawn } from 'node:child_process'

export type ProcessResult = Readonly<{
  status: 'exited' | 'cancelled' | 'timed-out' | 'output-limit'
  pid: number
  exitCode: number | null
  stdout: string
  stderr: string
}>

export async function execute(options: {
  command: string
  args: readonly string[]
  cwd: string
  env: NodeJS.ProcessEnv
  signal?: AbortSignal
  timeoutMs?: number
}): Promise<ProcessResult> {
  options.signal?.throwIfAborted()
  return new Promise((resolve, reject) => {
    const child = spawn(options.command, options.args, { cwd: options.cwd, env: options.env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] })
    let status: ProcessResult['status'] = 'exited'
    let stdout = ''
    let stderr = ''
    let killTimer: NodeJS.Timeout | undefined
    const kill = (signal: NodeJS.Signals) => {
      if (!child.pid) return
      try {
        if (process.platform === 'win32') child.kill(signal)
        else process.kill(-child.pid, signal)
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) throw error
      }
    }
    const stop = (reason: ProcessResult['status']) => {
      if (status !== 'exited') return
      status = reason
      kill('SIGTERM')
      killTimer = setTimeout(() => kill('SIGKILL'), 500)
    }
    const abort = () => stop('cancelled')
    options.signal?.addEventListener('abort', abort, { once: true })
    if (options.signal?.aborted) abort()
    const deadline = setTimeout(() => stop('timed-out'), options.timeoutMs ?? 180_000)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    const capture = (chunk: string, stream: 'stdout' | 'stderr') => {
      if (stdout.length + stderr.length + chunk.length > 16 * 1024 * 1024) { stop('output-limit'); return }
      if (stream === 'stdout') stdout += chunk.toString()
      else stderr += chunk.toString()
    }
    child.stdout.on('data', (chunk: string) => capture(chunk, 'stdout'))
    child.stderr.on('data', (chunk: string) => capture(chunk, 'stderr'))
    const cleanup = () => {
      clearTimeout(deadline)
      options.signal?.removeEventListener('abort', abort)
    }
    child.once('error', error => { cleanup(); reject(error) })
    child.once('close', exitCode => {
      cleanup()
      if (killTimer) {
        clearTimeout(killTimer)
        kill('SIGKILL')
      }
      if (!child.pid) { reject(new Error('Process did not start')); return }
      resolve({ status, pid: child.pid, exitCode, stdout, stderr })
    })
  })
}
