import { test, expect } from 'vitest'
import { execute } from '../src/process.js'

test('records real exit status and output', async () => {
  const result = await execute({ command: process.execPath, args: ['-e', 'console.log("before failure"); process.exit(7)'], cwd: process.cwd(), env: process.env })
  expect(result.status).toBe('exited')
  expect(result.exitCode).toBe(7)
  expect(result.stdout).toBe('before failure\n')
})

test('cancels a running process and preserves partial output', async () => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 200)
  try {
    const result = await execute({ command: process.execPath, args: ['-e', 'console.log("started"); setInterval(() => {}, 1000)'], cwd: process.cwd(), env: process.env, signal: controller.signal })
    expect(result.status).toBe('cancelled')
    expect(result.stdout).toBe('started\n')
    expect(() => process.kill(result.pid, 0)).toThrow()
  } finally { clearTimeout(timer) }
})

test('an operation deadline is distinct from cancellation', async () => {
  const result = await execute({ command: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'], cwd: process.cwd(), env: process.env, timeoutMs: 100 })
  expect(result.status).toBe('timed-out')
})

test('does not start an already cancelled operation', async () => {
  await expect(execute({ command: process.execPath, args: ['-e', 'process.exit(0)'], cwd: process.cwd(), env: process.env, signal: AbortSignal.abort() })).rejects.toThrow()
})

test('kills a descendant that ignores graceful termination', async () => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 300)
  try {
    const script = `
      const { spawn } = require('node:child_process');
      const child = spawn(process.execPath, ['-e', 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)'], { stdio: 'inherit' });
      console.log(child.pid);
      setInterval(() => {}, 1000);
    `
    const result = await execute({ command: process.execPath, args: ['-e', script], cwd: process.cwd(), env: process.env, signal: controller.signal })
    const descendant = Number(result.stdout.trim())
    expect(Number.isSafeInteger(descendant) && descendant > 0).toBe(true)
    expect(result.status).toBe('cancelled')
    await expect.poll(() => {
      try { process.kill(descendant, 0); return true } catch { return false }
    }).toBe(false)
  } finally { clearTimeout(timer) }
})

test('preserves Unicode split across process output chunks', async () => {
  const result = await execute({ command: process.execPath, args: ['-e', 'const b = Buffer.from("🦊"); process.stdout.write(b.subarray(0, 2)); setTimeout(() => process.stdout.write(b.subarray(2)), 40)'], cwd: process.cwd(), env: process.env })
  expect(result.stdout).toBe('🦊')
})
