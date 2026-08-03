import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({
  request: vi.fn(),
  requestText: vi.fn(),
}))

vi.mock('@/shared/http/client', () => ({
  default: http.request,
  requestText: http.requestText,
}))

import {
  getCacheCommands,
  getCacheInfo,
  getDbPool,
  getMetrics,
  getRuntimeStatus,
  getServerInfo,
  listLoginLog,
  listOnlineUser,
  listOperLog,
} from '@/api/modules/monitor'

describe('监控请求取消信号', () => {
  beforeEach(() => {
    const response = {
      code: 200,
      message: 'ok',
      request_id: 'test',
    }
    http.request.mockReset().mockResolvedValue(response)
    http.requestText.mockReset().mockResolvedValue('')
  })

  it('把 AbortSignal 传递给所有监控状态读取', async () => {
    const controller = new AbortController()

    await getServerInfo(controller.signal)
    await getCacheInfo(controller.signal)
    await getCacheCommands(controller.signal)
    await getDbPool(controller.signal)
    await getRuntimeStatus(controller.signal)
    await getMetrics(controller.signal)

    for (const [index, url] of [
      '/monitor/server',
      '/monitor/cache',
      '/monitor/cache/commands',
      '/monitor/db-pool',
      '/monitor/runtime',
    ].entries()) {
      expect(http.request).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({
        url,
        signal: controller.signal,
      }))
    }
    expect(http.requestText).toHaveBeenCalledWith(expect.objectContaining({
      url: '/monitor/metrics',
      signal: controller.signal,
    }))
  })

  it('把 AbortSignal 传递给日志和在线用户分页读取', async () => {
    const controller = new AbortController()

    await listLoginLog({ page: 1, page_size: 10 }, controller.signal)
    await listOperLog({ page: 1, page_size: 10 }, controller.signal)
    await listOnlineUser({ page: 1, page_size: 10 }, controller.signal)

    for (const [index, url] of [
      '/system/loginlogs',
      '/system/operlogs',
      '/system/online',
    ].entries()) {
      expect(http.request).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({
        url,
        signal: controller.signal,
      }))
    }
  })
})
