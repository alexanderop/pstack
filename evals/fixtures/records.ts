import { readFileSync, readdirSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const fixtureRoot = resolve(import.meta.dirname, 'records')
export const recordsFiles = Object.fromEntries(
  readdirSync(fixtureRoot, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => {
      const path = resolve(entry.parentPath, entry.name)
      return [relative(fixtureRoot, path), readFileSync(path, 'utf8')]
    }),
)

export async function checkRecords(project: string, check: 'search' | 'export' | 'help') {
  try {
    const result = await promisify(execFile)(process.execPath, [resolve(import.meta.dirname, '../checks', `${check}.mjs`)], {
      cwd: project, timeout: 15_000, maxBuffer: 1024 * 1024,
    })
    return { passed: true, detail: result.stdout + result.stderr }
  } catch (error) {
    return { passed: false, detail: error instanceof Error ? error.message : String(error) }
  }
}
