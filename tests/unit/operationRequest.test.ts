import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpClient = vi.hoisted(() => ({
  request: vi.fn<(config: unknown) => Promise<unknown>>(),
  rawRequest: vi.fn<(config: unknown) => Promise<unknown>>(),
  requestBlob: vi.fn<(config: unknown) => Promise<Blob>>(),
}))

vi.mock('@/shared/http/client', () => ({
  default: httpClient.request,
  rawRequest: httpClient.rawRequest,
  requestBlob: httpClient.requestBlob,
}))

import { get_version } from '@/api/generated/operations'
import { getApiVersion } from '@/api/modules/version'
import { requestOperation } from '@/api/operationRequest'

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
      tools: '/tools',
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
})

describe('operation 请求传输模式', () => {
  it('默认使用带会话的请求传输', async () => {
    httpClient.request.mockResolvedValue(versionResponse)

    const response = await requestOperation(get_version, {})

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
})
