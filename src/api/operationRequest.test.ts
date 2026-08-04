import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('@/shared/http/client', () => ({ default: http.request }))

import { requestOperation } from './operationRequest'

describe('operationId 请求门面', () => {
  beforeEach(() => {
    http.request.mockReset().mockResolvedValue({
      code: 200,
      message: 'ok',
      request_id: 'request-id',
    })
  })

  it('从生成清单取得 HTTP 方法和无前缀路径', async () => {
    const controller = new AbortController()

    await requestOperation('get_platform_tenants', { signal: controller.signal })

    expect(http.request).toHaveBeenCalledWith({
      method: 'get',
      signal: controller.signal,
      url: '/platform/tenants',
    })
  })

  it('安全编码路径参数并传递契约请求体', async () => {
    await requestOperation('put_platform_tenants_by_tenant_id_status', {
      path: { tenant_id: 'tenant/a' },
      data: { status: '1' },
    })

    expect(http.request).toHaveBeenCalledWith({
      data: { status: '1' },
      method: 'put',
      url: '/platform/tenants/tenant%2Fa/status',
    })
  })

  it('在运行时拒绝缺失或空路径参数', () => {
    expect(() => requestOperation('put_platform_tenants_by_tenant_id_status', {
      path: {} as { tenant_id: string },
      data: { status: '1' },
    })).toThrow(/缺少路径参数/u)

    expect(() => requestOperation('put_platform_tenants_by_tenant_id_status', {
      path: { tenant_id: null as unknown as string },
      data: { status: '1' },
    })).toThrow(/路径参数不能为空/u)
  })
})
