import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({
  request: vi.fn(),
  requestBlob: vi.fn(),
}))

vi.mock('@/shared/http/client', () => ({
  default: http.request,
  requestBlob: http.requestBlob,
}))

import {
  cancelExportJob,
  downloadExportJob,
  getExportJob,
  requestExportJob,
} from '@/api/modules/exportJob'
import { exportConfig } from '@/api/modules/config'
import { exportDictType } from '@/api/modules/dict'
import { exportLoginLog, exportOperLog } from '@/api/modules/monitor'
import { exportPost } from '@/api/modules/post'
import { exportRole } from '@/api/modules/role'
import { exportUser } from '@/api/modules/user'

describe('导出任务请求取消信号', () => {
  beforeEach(() => {
    http.request.mockReset().mockResolvedValue({
      code: 200,
      message: 'ok',
      request_id: 'test',
    })
    http.requestBlob.mockReset().mockResolvedValue(new Blob())
  })

  it('创建、轮询、下载和取消都把同一 AbortSignal 传到 Axios 边界', async () => {
    const controller = new AbortController()

    await requestExportJob('/system/users/exports', { status: '1' }, controller.signal)
    await getExportJob('job-1', controller.signal)
    await downloadExportJob('job-1', controller.signal)
    await cancelExportJob('job-1', controller.signal)

    expect(http.request).toHaveBeenNthCalledWith(1, expect.objectContaining({
      url: '/system/users/exports',
      method: 'post',
      data: { status: '1' },
      signal: controller.signal,
      headers: {
        'Idempotency-Key': expect.any(String),
      },
    }))
    expect(http.request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: '/common/jobs/job-1',
      method: 'get',
      signal: controller.signal,
    }))
    expect(http.requestBlob).toHaveBeenCalledWith(expect.objectContaining({
      url: '/common/jobs/job-1/download',
      method: 'get',
      signal: controller.signal,
    }))
    expect(http.request).toHaveBeenNthCalledWith(3, expect.objectContaining({
      url: '/common/jobs/job-1/cancel',
      method: 'post',
      signal: controller.signal,
    }))
  })

  it('所有业务导出入口都继续传递通用 Hook 提供的 AbortSignal', async () => {
    const controller = new AbortController()

    await exportConfig(undefined, controller.signal)
    await exportDictType(undefined, controller.signal)
    await exportLoginLog(undefined, controller.signal)
    await exportOperLog(undefined, controller.signal)
    await exportPost(undefined, controller.signal)
    await exportRole(undefined, controller.signal)
    await exportUser(undefined, controller.signal)

    expect(http.request).toHaveBeenCalledTimes(7)
    for (const [config] of http.request.mock.calls) {
      expect(config).toEqual(expect.objectContaining({
        method: 'post',
        signal: controller.signal,
        headers: {
          'Idempotency-Key': expect.any(String),
        },
      }))
    }
  })
})
