import { describe, expect, it, vi } from 'vitest'
import { MessageSocket } from '@/app/messages/socket/lifecycle'
import { createSocket, deliveryFrame } from './messageSocketFixtures'

describe('握手中停止消息连接', () => {
  it.each(['open', 'error', 'close'] as const)(
    '迟到 %s 仅清理旧连接，不投递、不重连且不影响新代次',
    async (terminal) => {
      const retired = createSocket()
      const current = createSocket(1)
      const sockets = [retired, current]
      const delivery = vi.fn()
      const state = vi.fn()
      const schedule = vi.fn()
      const connection = new MessageSocket({
        requestTicket: async () => 'test-ticket',
        createSocket: () => sockets.shift()!,
        apiBaseUrl: '/api',
        origin: 'https://example.test',
        onDelivery: delivery,
        onStateChange: state,
        schedule,
      })
      connection.start()
      await vi.waitFor(() => expect(retired.onmessage).toBeTypeOf('function'))
      const staleOpen = retired.onopen
      const staleMessage = retired.onmessage
      const staleError = retired.onerror
      const staleClose = retired.onclose
      connection.stop()
      expect(retired.close).not.toHaveBeenCalled()
      expect(retired.onmessage).toBeNull()
      expect(state).toHaveBeenLastCalledWith('stopped')

      connection.start()
      await vi.waitFor(() => expect(current.onmessage).toBeTypeOf('function'))
      try {
        const frame = { data: JSON.stringify(deliveryFrame()) } as MessageEvent
        staleOpen?.(new Event('open'))
        staleMessage?.(frame)
        staleError?.(new Event('error'))
        staleClose?.({} as CloseEvent)
        expect(delivery).not.toHaveBeenCalled()
        expect(schedule).not.toHaveBeenCalled()
        expect(state).toHaveBeenLastCalledWith('connecting')
        if (terminal === 'open') {
          Object.defineProperty(retired, 'readyState', { value: 1 })
          retired.onopen?.(new Event('open'))
        } else if (terminal === 'error') retired.onerror?.(new Event('error'))
        else retired.onclose?.({} as CloseEvent)
        if (terminal === 'open') {
          expect(retired.close).toHaveBeenCalledExactlyOnceWith(1000, '消息中心已停止')
        } else expect(retired.close).not.toHaveBeenCalled()
        expect(retired.onopen).toBeNull()
        expect(retired.onerror).toBeNull()
        expect(retired.onclose).toBeNull()
        expect(delivery).not.toHaveBeenCalled()
        expect(schedule).not.toHaveBeenCalled()
        current.onopen?.(new Event('open'))
        current.onmessage?.(frame)
        expect(delivery).toHaveBeenCalledOnce()
        expect(state).toHaveBeenLastCalledWith('connected')
        expect(current.close).not.toHaveBeenCalled()
      } finally {
        connection.stop()
      }
      expect(current.close).toHaveBeenCalledExactlyOnceWith(1000, '消息中心已停止')
    },
  )
})
