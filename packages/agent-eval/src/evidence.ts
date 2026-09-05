import { z } from 'zod'

const itemSchema = z.object({ type: z.string() }).passthrough()
const historySchema = z.object({
  id: z.string(),
  turns: z.array(z.object({ id: z.string(), status: z.string(), items: z.array(itemSchema) })),
})
const commandSchema = z.object({
  type: z.literal('commandExecution'), id: z.string(), command: z.string(),
  status: z.string(), exitCode: z.number().nullable(), aggregatedOutput: z.string().nullable(),
  commandActions: z.array(z.object({ type: z.string(), path: z.string().nullish() })),
})

export function readEvidence(input: unknown) {
  const thread = historySchema.parse(input)
  const commands = thread.turns.flatMap(turn => turn.items.flatMap(item => {
    if (item.type !== 'commandExecution') return []
    return [{ ...commandSchema.parse(item), turnId: turn.id }]
  }))
  const reads = commands.flatMap(command => {
    if (command.status !== 'completed' || command.exitCode !== 0 || !command.aggregatedOutput || /truncat(?:ed|ion)/i.test(command.aggregatedOutput)) return []
    return command.commandActions.flatMap(action => action.type === 'read' && action.path
      ? [{ path: action.path, output: command.aggregatedOutput, itemId: command.id, turnId: command.turnId }]
      : [])
  })
  return {
    id: thread.id,
    completed: thread.turns.length > 0 && thread.turns.every(turn => turn.status === 'completed'),
    reads,
    commands,
  }
}

export const sessionMetadata = z.object({
  id: z.string(), cwd: z.string(),
  source: z.union([
    z.string(),
    z.object({ subagent: z.object({ thread_spawn: z.object({ parent_thread_id: z.string() }) }) }),
  ]),
})

export function parentId(meta: z.infer<typeof sessionMetadata>): string | null {
  return typeof meta.source === 'string' ? null : meta.source.subagent.thread_spawn.parent_thread_id
}
