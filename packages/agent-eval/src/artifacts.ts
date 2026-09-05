import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export async function createArtifacts(root: string) {
  const path = join(root, `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`)
  await mkdir(path, { recursive: true })
  return {
    path,
    async write(name: string, value: unknown) {
      if (!/^[a-z0-9][a-z0-9.-]*$/.test(name)) throw new Error('Invalid artifact name')
      await writeFile(join(path, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' })
    },
  }
}
