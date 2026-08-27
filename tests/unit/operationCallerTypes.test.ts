import { expectTypeOf, it } from 'vitest'

import {
  get_common_file_download,
  get_version,
  post_auth_login,
  post_common_upload,
} from '@/api/generated/operations/core'
import { get_monitor_metrics } from '@/api/generated/operations/monitor'
import type {
  BlobOperationRequestOptions,
  MultipartOperationRequestOptions,
  OperationRequestOptions,
  TextOperationRequestOptions,
} from '@/api/operationRequest'

it('生成 caller 按 JSON、raw、multipart、text 与 blob 约束参数类型', () => {
  expectTypeOf<Parameters<typeof get_version>[0]>().toEqualTypeOf<
    OperationRequestOptions<'get_version'>
  >()
  expectTypeOf<Parameters<typeof post_common_upload>[0]>().toEqualTypeOf<
    MultipartOperationRequestOptions<'post_common_upload'>
  >()
  expectTypeOf<Parameters<typeof get_monitor_metrics>[0]>().toEqualTypeOf<
    TextOperationRequestOptions<'get_monitor_metrics'>
  >()
  expectTypeOf<Parameters<typeof get_common_file_download>[0]>().toEqualTypeOf<
    BlobOperationRequestOptions<'get_common_file_download'>
  >()

  const rawOptions: Parameters<typeof get_version>[0] = { transport: 'raw' }
  const uploadOptions: Parameters<typeof post_common_upload>[0] = { data: new FormData() }
  expectTypeOf(rawOptions.transport).toEqualTypeOf<'session' | 'raw' | undefined>()
  expectTypeOf(uploadOptions.data).toEqualTypeOf<FormData>()

  // @ts-expect-error 登录 caller 必须接收契约声明的 JSON 请求体。
  const missingJsonBody: Parameters<typeof post_auth_login>[0] = {}
  const rawMultipart: Parameters<typeof post_common_upload>[0] = {
    data: new FormData(),
    // @ts-expect-error multipart caller 不允许切换到 raw 会话策略。
    transport: 'raw',
  }
  // @ts-expect-error blob caller 不接受 JSON 请求体。
  const blobWithBody: Parameters<typeof get_common_file_download>[0] = { data: {} }
  // @ts-expect-error text caller 不接受路径参数。
  const textWithPath: Parameters<typeof get_monitor_metrics>[0] = { path: { id: '1' } }
  void [missingJsonBody, rawMultipart, blobWithBody, textWithPath]
})
