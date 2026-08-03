import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({
  rawRequest: vi.fn(),
  request: vi.fn(),
  requestBlob: vi.fn(),
}))

vi.mock('@/shared/http/client', () => ({
  default: http.request,
  rawRequest: http.rawRequest,
  requestBlob: http.requestBlob,
}))

import { getProfile } from '@/api/modules/auth'
import { listTable, previewCode } from '@/api/modules/tools'

describe('个人资料与代码生成器取消信号', () => {
  beforeEach(() => {
    http.request.mockReset().mockResolvedValue({
      code: 200,
      message: 'ok',
      request_id: 'test',
    })
  })

  it('把 AbortSignal 传递给个人资料读取', async () => {
    const controller = new AbortController()

    await getProfile(controller.signal)

    expect(http.request).toHaveBeenCalledWith(expect.objectContaining({
      url: '/auth/profile',
      signal: controller.signal,
    }))
  })

  it('把 AbortSignal 传递给数据表列表和代码预览', async () => {
    const controller = new AbortController()

    await listTable({ page: 1, page_size: 10 }, controller.signal)
    await previewCode({ tables: ['sys_user'] }, controller.signal)

    expect(http.request).toHaveBeenNthCalledWith(1, expect.objectContaining({
      url: '/tools/gen/tables',
      signal: controller.signal,
    }))
    expect(http.request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: '/tools/gen/preview',
      signal: controller.signal,
    }))
  })
})
