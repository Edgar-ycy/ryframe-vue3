import { describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({
  request: vi.fn(async () => ({ code: 200, msg: 'ok' })),
  requestBlob: vi.fn(),
  requestText: vi.fn(),
}))

vi.mock('@/shared/http/client', () => ({
  default: http.request,
  request: http.request,
  requestBlob: http.requestBlob,
  requestText: http.requestText,
}))

describe('online session API', () => {
  it('uses the stable sid and safely encodes it as a path segment', async () => {
    const { forceLogout } = await import('./modules/monitor')

    await forceLogout('device/session 1')

    expect(http.request).toHaveBeenCalledWith({
      url: '/system/online/device%2Fsession%201',
      method: 'delete',
    })
  })
})
