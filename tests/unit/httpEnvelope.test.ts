import { describe, expect, it } from 'vitest'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/shared/http/types'
import { HttpError, parseEnvelope } from '@/shared/http/errors'

function response<T>(status: number, envelope: ApiResponse<T>): AxiosResponse<ApiResponse<T>> {
  return {
    config: { headers: {} as never },
    data: envelope,
    headers: {},
    status,
    statusText: String(status),
  }
}

describe('HTTP 响应包络', () => {
  it('接受与 HTTP 状态一致的 202 成功包络', () => {
    const envelope: ApiResponse<{ accepted_count: number }> = {
      code: 202,
      data: { accepted_count: 2 },
      details: null,
      error_key: null,
      message: '成功',
      request_id: '019c0000-0000-7000-8000-000000000001',
    }

    expect(parseEnvelope(response(202, envelope))).toBe(envelope)
  })

  it('拒绝与 HTTP 状态不一致的伪成功包络', () => {
    const envelope: ApiResponse<undefined> = {
      code: 200,
      data: undefined,
      details: null,
      error_key: null,
      message: '成功',
      request_id: '019c0000-0000-7000-8000-000000000002',
    }

    expect(() => parseEnvelope(response(202, envelope))).toThrow(HttpError)
  })

  it('优先使用后端白名单公开的具体错误原因', () => {
    const envelope: ApiResponse<undefined> = {
      code: 400,
      data: undefined,
      details: { reason: 'captcha_invalid_or_expired', field: 'captcha' },
      error_key: 'validation',
      message: '请求参数无效',
      request_id: '019c0000-0000-7000-8000-000000000003',
    }

    expect(() => parseEnvelope(response(400, envelope))).toThrowError(
      'shell.http.reasons.captchaInvalidOrExpired',
    )
  })

  it('忽略未知公开原因并退回稳定错误键', () => {
    const envelope: ApiResponse<undefined> = {
      code: 403,
      data: undefined,
      details: { reason: 'untrusted_server_message' },
      error_key: 'authorization',
      message: '不应直接展示的服务端文字',
      request_id: '019c0000-0000-7000-8000-000000000004',
    }

    expect(() => parseEnvelope(response(403, envelope))).toThrowError(
      'shell.http.errors.authorization',
    )
  })
})
