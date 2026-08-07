import type { MessageRuntime } from './runtime'

const MAX_DELETED_MESSAGE_TOMBSTONES = 2_000

export function rememberDeletedMessages(runtime: MessageRuntime, ids: readonly string[]): string[] {
  const unique = [...new Set(ids.filter(Boolean))]
  for (const id of unique) {
    if (runtime.deletedMessageIds.has(id)) continue
    runtime.deletedMessageIds.add(id)
    if (runtime.deletedMessageIds.size > MAX_DELETED_MESSAGE_TOMBSTONES) {
      const oldest = runtime.deletedMessageIds.values().next().value
      if (oldest) runtime.deletedMessageIds.delete(oldest)
    }
  }
  return unique
}

export function forgetDeletedAcknowledgements(runtime: MessageRuntime, ids: readonly string[]): void {
  for (const id of ids) {
    runtime.pendingAckIds.delete(id)
    runtime.deferredAckIds.delete(id)
  }
}
