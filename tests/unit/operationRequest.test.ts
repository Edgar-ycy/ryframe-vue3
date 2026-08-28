import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpClient = vi.hoisted(() => ({
  request: vi.fn<(config: unknown) => Promise<unknown>>(),
  rawRequest: vi.fn<(config: unknown) => Promise<unknown>>(),
  requestBlob: vi.fn<(config: unknown) => Promise<Blob>>(),
  requestText: vi.fn<(config: unknown) => Promise<string>>(),
}))

vi.mock('@/shared/http/client', () => ({
  default: httpClient.request,
  rawRequest: httpClient.rawRequest,
  requestBlob: httpClient.requestBlob,
  requestText: httpClient.requestText,
}))

import {
  get_common_file_download,
  get_version,
  post_common_upload,
} from '@/api/generated/operations/core'
import { get_monitor_metrics } from '@/api/generated/operations/monitor'
import { getCsrfChallenge, login, logout } from '@/api/modules/auth'
import { downloadFile, uploadFile } from '@/api/modules/common'
import { getMetrics } from '@/api/modules/monitor'
import * as postExtension from '@/api/modules/post'
import * as generatedPostApi from '@/generated/resources/post/api'
import { getApiVersion } from '@/api/modules/version'

const versionResponse = {
  code: 200,
  message: 'ok',
  request_id: '0198c700-0000-7000-8000-000000000001',
  data: {
    api_prefix: '/api/v1',
    endpoints: {
      auth: '/auth',
      common: '/common',
      monitor: '/monitor',
      openapi: '/openapi.json',
      swagger: '/swagger-ui',
      system: '/system',
    },
    multi_tenancy_enabled: true,
    name: 'RyFrame',
    source_commit: '0000000000000000000000000000000000000000',
    version: '0.10.0',
  },
}

beforeEach(() => {
  httpClient.request.mockReset()
  httpClient.rawRequest.mockReset()
  httpClient.requestBlob.mockReset()
  httpClient.requestText.mockReset()
})

describe('operation 请求传输模式', () => {
  it('岗位 CRUD 与导出扩展保持独立模块边界', () => {
    expect(Object.keys(postExtension)).toEqual(['exportPost'])
    expect(Object.keys(generatedPostApi).sort()).toEqual([
      'createPost',
      'deletePost',
      'getPost',
      'listPost',
      'updatePost',
    ])
  })

  it('默认使用带会话的请求传输', async () => {
    httpClient.request.mockResolvedValue(versionResponse)

    const response = await get_version({})

    expect(response).toBe(versionResponse)
    expect(httpClient.request).toHaveBeenCalledWith({ method: 'get', url: '/version' })
    expect(httpClient.rawRequest).not.toHaveBeenCalled()
  })

  it('版本能力查询显式使用 raw 传输且不泄漏控制选项', async () => {
    httpClient.rawRequest.mockResolvedValue(versionResponse)

    const response = await getApiVersion()

    expect(response).toBe(versionResponse)
    expect(httpClient.rawRequest).toHaveBeenCalledWith({ method: 'get', url: '/version' })
    expect(httpClient.request).not.toHaveBeenCalled()
  })

  it('匿名认证调用使用 raw 传输并保留跳过会话处理的标记', async () => {
    httpClient.rawRequest.mockResolvedValue(versionResponse)

    await getCsrfChallenge()
    await logout('csrf-token', 'access-token')

    expect(httpClient.rawRequest).toHaveBeenNthCalledWith(1, {
      method: 'get',
      skipAuthRefresh: true,
      skipTenantHeader: true,
      url: '/auth/csrf',
    })
    expect(httpClient.rawRequest).toHaveBeenNthCalledWith(2, {
      headers: {
        Authorization: 'Bearer access-token',
        'X-CSRF-Token': 'csrf-token',
      },
      method: 'post',
      skipAuthRefresh: true,
      skipTenantHeader: true,
      url: '/auth/logout',
    })
    expect(httpClient.request).not.toHaveBeenCalled()
  })

  it('登录使用 raw 传输保留显式租户与 CSRF 头，不携带旧会话', async () => {
    httpClient.rawRequest.mockResolvedValue(versionResponse)
    const data = { username: 'admin', password: 'secret' }

    await login(data, 'tenant-a', 'csrf-token')

    expect(httpClient.rawRequest).toHaveBeenCalledWith({
      data,
      headers: {
        'X-CSRF-Token': 'csrf-token',
        'X-Tenant-Id': 'tenant-a',
      },
      method: 'post',
      skipAuthRefresh: true,
      skipTenantHeader: true,
      url: '/auth/login',
    })
    expect(httpClient.request).not.toHaveBeenCalled()
  })

  it('multipart operation 保留 FormData 与超时配置', async () => {
    httpClient.request.mockResolvedValue(versionResponse)
    const data = new FormData()

    await post_common_upload({ data, timeout: 120000 })
    await uploadFile(data)

    expect(httpClient.request).toHaveBeenNthCalledWith(1, {
      data,
      method: 'post',
      timeout: 120000,
      url: '/common/upload',
    })
    expect(httpClient.request).toHaveBeenNthCalledWith(2, {
      data,
      method: 'post',
      timeout: 120000,
      url: '/common/upload',
    })
  })

  it('blob operation 使用 descriptor 路径并保留查询参数', async () => {
    const blob = new Blob(['content'])
    httpClient.requestBlob.mockResolvedValue(blob)

    const direct = await get_common_file_download({
      params: { path: 'reports/users.xlsx', bucket: 'private' },
    })
    const publicResult = await downloadFile('reports/users.xlsx', 'private')

    expect(direct).toBe(blob)
    expect(publicResult).toBe(blob)
    expect(httpClient.requestBlob).toHaveBeenNthCalledWith(1, {
      method: 'get',
      params: { path: 'reports/users.xlsx', bucket: 'private' },
      url: '/common/file/download',
    })
    expect(httpClient.requestBlob).toHaveBeenNthCalledWith(2, {
      method: 'get',
      params: { path: 'reports/users.xlsx', bucket: 'private' },
      url: '/common/file/download',
    })
  })

  it('文本 operation 使用 descriptor 且保留请求配置', async () => {
    httpClient.requestText.mockResolvedValue('# HELP ryframe_up 进程状态')

    const direct = await get_monitor_metrics({ timeout: 5000 })
    const publicResult = await getMetrics()

    expect(direct).toBe('# HELP ryframe_up 进程状态')
    expect(publicResult).toBe('# HELP ryframe_up 进程状态')
    expect(httpClient.requestText).toHaveBeenNthCalledWith(1, {
      method: 'get',
      timeout: 5000,
      url: '/monitor/metrics',
    })
    expect(httpClient.requestText).toHaveBeenNthCalledWith(2, {
      method: 'get',
      url: '/monitor/metrics',
    })
  })
})
