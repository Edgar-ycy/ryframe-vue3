import { vi } from 'vitest'
import type { MessageSocketOptions } from '@/app/messages/socket/lifecycle'

interface FakeMessageSocket {
  options: MessageSocketOptions
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

const socketRuntime = vi.hoisted(() => ({ instances: [] as FakeMessageSocket[] }))
const messageCache = vi.hoisted(() => ({
  receiveMessageDelivery: vi.fn(),
  removeCachedMessages: vi.fn(),
}))
const messageSync = vi.hoisted(() => ({
  cancelMessageState: vi.fn(),
  executeMessageAcknowledgement: vi.fn(),
  synchronizeMessageState: vi.fn(),
}))

const ticketApi = vi.hoisted(() => ({ getMessageWebSocketTicket: vi.fn() }))
const contextApi = vi.hoisted(() => ({ notifyTenantContextChanged: vi.fn() }))
vi.mock('@/api/modules/messages', () => ticketApi)
vi.mock('@/app/tenant-context/contextRefresh', () => contextApi)
vi.mock('@/app/messages/messageCache/mutations', () => messageCache)
vi.mock('@/app/messages/messageSync', () => messageSync)
vi.mock('@/app/messages/socket/lifecycle', () => ({
  MessageSocket: class implements FakeMessageSocket {
    readonly start = vi.fn()
    readonly stop = vi.fn()

    constructor(readonly options: MessageSocketOptions) {
      socketRuntime.instances.push(this)
    }
  },
}))

export { socketRuntime, messageCache, messageSync, ticketApi, contextApi }
