import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, effectScope } from 'vue'
import { vi } from 'vitest'
import type { MessageInboxPage, MessageRecord } from '@/api/modules/messages'
import {
  deactivateServerStateScope,
  getServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import { useUserStore } from '@/stores/user'

const api = vi.hoisted(() => ({
  acknowledgeMessages: vi.fn(),
  deleteMessages: vi.fn(),
  getUnreadMessageCount: vi.fn(),
  listMessages: vi.fn(),
  markAllMessagesRead: vi.fn(),
  markMessageRead: vi.fn(),
}))
vi.mock('@/api/modules/messages', () => api)

export function message(id: string, overrides: Partial<MessageRecord> = {}): MessageRecord {
  return {
    id,
    topic: 'system',
    title: id,
    content: '消息内容',
    severity: 'info',
    payload: null,
    published_at: '2026-09-03T00:00:00Z',
    expires_at: null,
    acked_at: null,
    read_at: null,
    ...overrides,
  }
}
export const page = (...records: MessageRecord[]): MessageInboxPage => ({
  records,
  next_cursor: null,
})
export const response = <T>(data?: T) => ({ code: 200, message: '成功', request_id: 'test', data })

export function scope() {
  const current = getServerStateScope()
  if (!current) throw new Error('测试会话未初始化')
  return current
}

export function activate(fingerprint = 'test') {
  transitionServerStateScope(
    { tenantId: 't', subjectId: 'u', authorizationFingerprint: fingerprint },
    () => undefined,
    { force: true },
  )
  return scope()
}

export function prepare() {
  deactivateServerStateScope()
  queryClient.clear()
  setActivePinia(createPinia())
  useUserStore().$patch({ sessionStatus: 'authenticated', tenantId: 't', userId: 'u', token: 'a' })
  activate()
  api.listMessages.mockResolvedValue(response(page()))
  api.getUnreadMessageCount.mockResolvedValue(response(0))
  api.acknowledgeMessages.mockResolvedValue(response(1))
  api.markMessageRead.mockResolvedValue(response())
  api.markAllMessagesRead.mockResolvedValue(response(1))
  api.deleteMessages.mockResolvedValue(response(1))
}

export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept
    reject = decline
  })
  return { promise, resolve, reject }
}

export function runComposable<T>(setup: () => T) {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const effects = effectScope()
  const result = app.runWithContext(() => effects.run(setup))
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, stop: () => effects.stop() }
}

export { api }
