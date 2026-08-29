import type { ServerStateScope } from '@/shared/query/scope'

const CHANNEL_NAME = 'ryframe-export-jobs-v2'

export type ExportJobEvent = ServerStateScope &
  (
    | { type: 'created' | 'cancelled'; jobId: string }
    | { type: 'deleted'; jobIds: string[] }
    | { type: 'notifications-read'; jobIds: string[]; readAt: string }
  )

type ExportJobEventHandler = (event: ExportJobEvent) => void

const handlers = new Set<ExportJobEventHandler>()
let channel: BroadcastChannel | undefined

function isExportJobEvent(value: unknown): value is ExportJobEvent {
  if (typeof value !== 'object' || value === null) return false
  const event = value as Record<string, unknown>
  if (
    typeof event.tenantId !== 'string' ||
    typeof event.subjectId !== 'string' ||
    !Number.isSafeInteger(event.sessionEpoch) ||
    Number(event.sessionEpoch) < 0
  )
    return false
  if (event.type === 'created' || event.type === 'cancelled') {
    return typeof event.jobId === 'string'
  }
  const hasValidJobIds =
    Array.isArray(event.jobIds) &&
    event.jobIds.length > 0 &&
    event.jobIds.length <= 100 &&
    event.jobIds.every((id: unknown) => typeof id === 'string')
  if (!hasValidJobIds) return false
  return (
    event.type === 'deleted' ||
    (event.type === 'notifications-read' && typeof event.readAt === 'string')
  )
}

function notify(event: ExportJobEvent): void {
  for (const handler of handlers) handler(event)
}

function ensureChannel(): BroadcastChannel | undefined {
  if (channel || typeof BroadcastChannel === 'undefined') return channel
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.addEventListener('message', (message) => {
    if (isExportJobEvent(message.data)) notify(message.data)
  })
  return channel
}

/** 同步事件只携带身份边界和任务 ID，不广播任务内容或下载信息。 */
export function publishExportJobEvent(event: ExportJobEvent): void {
  ensureChannel()?.postMessage(event)
}

export function subscribeExportJobEvents(handler: ExportJobEventHandler): () => void {
  handlers.add(handler)
  ensureChannel()
  return () => handlers.delete(handler)
}
