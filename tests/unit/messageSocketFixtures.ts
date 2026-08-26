import { vi } from 'vitest'

import type { MessageSocketLike } from '@/app/messages/socket/lifecycle'

export function deliveryFrame() {
  return {
    v: 1,
    type: 'message',
    message: {
      id: '10',
      topic: 'system',
      title: '标题',
      content: '内容',
      severity: 'info',
      payload: null,
      published_at: '2026-08-26T00:00:00Z',
      expires_at: null,
      acked_at: null,
      read_at: null,
    },
  }
}

export function createSocket(readyState = 0): MessageSocketLike & {
  close: ReturnType<typeof vi.fn<(code?: number, reason?: string) => void>>
} {
  return {
    readyState,
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    close: vi.fn(),
    send: vi.fn(),
  }
}
