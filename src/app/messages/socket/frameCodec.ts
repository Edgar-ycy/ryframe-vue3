import type { MessageRecord } from '@/api/modules/messages'
import type { TenantContextChangedFrame } from '@/app/tenant-context/contextRefresh'

type SocketFrame = {
  v?: unknown
  type?: unknown
  message?: unknown
  code?: unknown
  authorization_epoch?: unknown
  runtime_epoch?: unknown
  placement_generation?: unknown
  business_data_state?: unknown
}

export interface MessageSocketProtocolError {
  code: string
  message: string
}

export function decodeMessageSocketFrame(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

/** 解析服务端 v1 消息投递帧。 */
export function parseMessageDelivery(raw: unknown): MessageRecord | undefined {
  if (!isRecord(raw)) return undefined
  const frame = raw as SocketFrame
  if (frame.v !== 1 || frame.type !== 'message') return undefined
  return normalizeMessage(frame.message)
}

/** 只接受完整的 v1 租户上下文变化帧；权限、菜单和能力明细由认证接口重读。 */
export function parseTenantContextChanged(raw: unknown): TenantContextChangedFrame | undefined {
  if (!isRecord(raw)) return undefined
  const frame = raw as SocketFrame
  if (frame.v !== 1 || frame.type !== 'tenant_context_changed') return undefined
  if (
    typeof frame.authorization_epoch !== 'number' ||
    !Number.isSafeInteger(frame.authorization_epoch) ||
    frame.authorization_epoch < 0 ||
    typeof frame.runtime_epoch !== 'string' ||
    !/^(?:0|[1-9]\d*)$/u.test(frame.runtime_epoch) ||
    typeof frame.placement_generation !== 'string' ||
    !/^(?:0|[1-9]\d*)$/u.test(frame.placement_generation) ||
    !isBusinessDataState(frame.business_data_state)
  )
    return undefined
  return {
    v: 1,
    type: 'tenant_context_changed',
    authorization_epoch: frame.authorization_epoch,
    runtime_epoch: frame.runtime_epoch,
    placement_generation: frame.placement_generation,
    business_data_state: frame.business_data_state,
  }
}

/** 解析服务端返回的协议错误帧。 */
export function parseMessageSocketError(raw: unknown): MessageSocketProtocolError | undefined {
  if (!isRecord(raw)) return undefined
  const frame = raw as SocketFrame
  if (frame.v !== 1 || frame.type !== 'error') return undefined
  if (typeof frame.code !== 'string' || typeof frame.message !== 'string') return undefined
  return { code: frame.code, message: frame.message }
}

function normalizeMessage(value: unknown): MessageRecord | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id : undefined
  const topic = typeof value.topic === 'string' ? value.topic : undefined
  const title = typeof value.title === 'string' ? value.title : undefined
  const content = typeof value.content === 'string' ? value.content : undefined
  const severity = typeof value.severity === 'string' ? value.severity : undefined
  const publishedAt = typeof value.published_at === 'string' ? value.published_at : undefined
  if (!id || !topic || !title || content === undefined || !severity || !publishedAt)
    return undefined
  return {
    id,
    topic,
    title,
    content,
    severity,
    payload: value.payload ?? null,
    published_at: publishedAt,
    expires_at: stringOrNull(value.expires_at),
    acked_at: stringOrNull(value.acked_at),
    read_at: stringOrNull(value.read_at),
  }
}

function isBusinessDataState(
  value: unknown,
): value is TenantContextChangedFrame['business_data_state'] {
  return (
    typeof value === 'string' && ['provisioning', 'active', 'maintenance', 'failed'].includes(value)
  )
}

function stringOrNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  return typeof value === 'string' ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
