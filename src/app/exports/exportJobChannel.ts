import type { ExportJobIdentity } from './exportJobCache'

const CHANNEL_NAME = 'ryframe-export-jobs-v1'

export type ExportJobEventType = 'created' | 'cancelled'

export interface ExportJobEvent extends ExportJobIdentity {
  type: ExportJobEventType
  jobId: string
}

type ExportJobEventHandler = (event: ExportJobEvent) => void

const handlers = new Set<ExportJobEventHandler>()
let channel: BroadcastChannel | undefined

function isExportJobEvent(value: unknown): value is ExportJobEvent {
  if (typeof value !== 'object' || value === null) return false
  const event = value as Partial<ExportJobEvent>
  return (event.type === 'created' || event.type === 'cancelled')
    && typeof event.tenantId === 'string'
    && typeof event.userId === 'string'
    && typeof event.jobId === 'string'
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
