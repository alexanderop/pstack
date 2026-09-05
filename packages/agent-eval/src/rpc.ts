import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { z } from 'zod'

const responseSchema = z.object({ id: z.number(), result: z.unknown().optional(), error: z.unknown().optional() })

export async function openRpc(options: { cwd: string; env: NodeJS.ProcessEnv; executable?: string; signal?: AbortSignal }) {
  options.signal?.throwIfAborted()
  const process = spawn(options.executable ?? 'codex', ['app-server', '--stdio'], { cwd: options.cwd, env: options.env, stdio: ['pipe', 'pipe', 'pipe'] })
  const lines = createInterface({ input: process.stdout })
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()
  let nextId = 0
  let stderr = ''
  let closed = false
  process.stderr.setEncoding('utf8')
  process.stderr.on('data', (chunk: string) => { stderr = (stderr + chunk.toString()).slice(-16_384) })
  const fail = (error: Error) => { for (const call of pending.values()) call.reject(error); pending.clear() }
  process.on('error', fail)
  const exited = new Promise<void>(resolve => process.once('close', () => { closed = true; fail(new Error(`Codex RPC closed: ${stderr}`)); resolve() }))
  const abort = () => { fail(new Error('Codex RPC cancelled')); process.kill('SIGTERM') }
  options.signal?.addEventListener('abort', abort, { once: true })
  if (options.signal?.aborted) abort()
  lines.on('line', line => {
    try {
      const raw: unknown = JSON.parse(line)
      const parsed = responseSchema.safeParse(raw)
      if (!parsed.success) return
      const response = parsed.data
      const call = pending.get(response.id)
      if (!call) return
      pending.delete(response.id)
      if (response.error !== undefined) call.reject(new Error(JSON.stringify(response.error)))
      else call.resolve(response.result)
    } catch (error) { fail(error instanceof Error ? error : new Error(String(error))) }
  })
  const client = {
    async call(method: string, params: unknown): Promise<unknown> {
      options.signal?.throwIfAborted()
      if (closed) throw new Error('Codex RPC already closed')
      const id = ++nextId
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`RPC timeout: ${method}`)) }, 30_000)
        pending.set(id, {
          resolve(value) { clearTimeout(timer); resolve(value) },
          reject(error) { clearTimeout(timer); reject(error) },
        })
        process.stdin.write(`${JSON.stringify({ id, method, params })}\n`)
      })
    },
    async dispose() {
      options.signal?.removeEventListener('abort', abort)
      fail(new Error('Codex RPC disposed'))
      process.kill('SIGTERM')
      const timer = setTimeout(() => process.kill('SIGKILL'), 500)
      await exited
      clearTimeout(timer)
      lines.close()
    },
  }
  try {
    await client.call('initialize', { clientInfo: { name: 'pstack-eval', version: '0.0.0' }, capabilities: { experimentalApi: true } })
    process.stdin.write(`${JSON.stringify({ method: 'initialized' })}\n`)
    return client
  } catch (error) { await client.dispose(); throw error }
}
