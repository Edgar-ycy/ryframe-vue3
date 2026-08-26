import type { AxiosRequestConfig } from 'axios'

import type {
  ApiOperation,
  OperationData,
  OperationJsonBody,
  OperationJsonResponse,
  OperationPath,
  OperationQuery,
  OperationTextResponse,
} from './contract'
import type { OperationDescriptor, OperationId } from './generated/operations'
import request, { rawRequest, requestBlob, requestText } from '@/shared/http/client'

type JsonOperationId = {
  [Name in OperationId]: [OperationJsonResponse<Name>] extends [never] ? never : Name
}[OperationId]

type MultipartOperationId = {
  [Name in OperationId]: ApiOperation<Name> extends {
    requestBody: { content: { 'multipart/form-data': unknown } }
  }
    ? Name
    : never
}[OperationId]

type TextOperationId = {
  [Name in OperationId]: [OperationTextResponse<Name>] extends [never] ? never : Name
}[OperationId]

type RequestTransportOptions = Omit<
  AxiosRequestConfig,
  'baseURL' | 'data' | 'method' | 'params' | 'transport' | 'url'
>

export type OperationTransport = 'session' | 'raw'

type JsonRequestTransportOptions = RequestTransportOptions & {
  transport?: OperationTransport
}

type PathOptions<Name extends OperationId> = [OperationPath<Name>] extends [never]
  ? { path?: never }
  : { path: OperationPath<Name> }

type QueryOptions<Name extends OperationId> = [OperationQuery<Name>] extends [never]
  ? { params?: never }
  : { params?: OperationQuery<Name> }

type BodyOptions<Name extends OperationId> = [OperationJsonBody<Name>] extends [never]
  ? { data?: never }
  : { data: OperationJsonBody<Name> }

export type OperationRequestOptions<Name extends JsonOperationId> = JsonRequestTransportOptions &
  PathOptions<Name> &
  QueryOptions<Name> &
  BodyOptions<Name>

export type MultipartOperationRequestOptions<Name extends MultipartOperationId> =
  RequestTransportOptions & PathOptions<Name> & QueryOptions<Name> & { data: FormData }

export type BlobOperationRequestOptions<Name extends OperationId> = RequestTransportOptions &
  PathOptions<Name> &
  QueryOptions<Name>

export type TextOperationRequestOptions<Name extends TextOperationId> = RequestTransportOptions &
  PathOptions<Name> &
  QueryOptions<Name>

function resolveOperationPath(
  template: string,
  parameters: Record<string, unknown> | undefined,
): string {
  return template.replace(/\{([^{}]+)\}/gu, (_placeholder, name: string) => {
    if (!parameters || !Object.hasOwn(parameters, name)) {
      throw new TypeError(`路径参数缺失：${name}`)
    }
    const value = parameters[name]
    if (value === undefined || value === null) {
      throw new TypeError(`路径参数为空：${name}`)
    }
    return encodeURIComponent(String(value))
  })
}

export async function requestOperation<Name extends JsonOperationId>(
  operation: OperationDescriptor<Name>,
  options: OperationRequestOptions<Name>,
): Promise<OperationJsonResponse<Name>> {
  const {
    path: pathParameters,
    params,
    data,
    transport = 'session',
    ...transportOptions
  } = options as JsonRequestTransportOptions & {
    path?: Record<string, unknown>
    params?: unknown
    data?: unknown
  }
  const config: AxiosRequestConfig = {
    ...transportOptions,
    method: operation.method,
    url: resolveOperationPath(operation.path, pathParameters),
  }
  if (params !== undefined) config.params = params
  if (data !== undefined) config.data = data
  return transport === 'raw'
    ? (rawRequest<OperationData<Name>>(config) as Promise<OperationJsonResponse<Name>>)
    : (request<OperationData<Name>>(config) as Promise<OperationJsonResponse<Name>>)
}

/** 使用 OpenAPI operationId 发送 multipart 请求，避免业务模块重复维护方法和路径。 */
export async function requestMultipartOperation<Name extends MultipartOperationId>(
  operation: OperationDescriptor<Name>,
  options: MultipartOperationRequestOptions<Name>,
): Promise<OperationJsonResponse<Name>> {
  const {
    path: pathParameters,
    params,
    data,
    ...transportOptions
  } = options as RequestTransportOptions & {
    path?: Record<string, unknown>
    params?: unknown
    data: FormData
  }
  const config: AxiosRequestConfig = {
    ...transportOptions,
    data,
    method: operation.method,
    url: resolveOperationPath(operation.path, pathParameters),
  }
  if (params !== undefined) config.params = params
  return request<OperationData<Name>>(config) as Promise<OperationJsonResponse<Name>>
}

/** 使用 OpenAPI operationId 下载二进制响应。 */
export async function requestBlobOperation<Name extends OperationId>(
  operation: OperationDescriptor<Name>,
  options: BlobOperationRequestOptions<Name>,
): Promise<Blob> {
  const {
    path: pathParameters,
    params,
    ...transportOptions
  } = options as RequestTransportOptions & {
    path?: Record<string, unknown>
    params?: unknown
  }
  const config: AxiosRequestConfig = {
    ...transportOptions,
    method: operation.method,
    url: resolveOperationPath(operation.path, pathParameters),
  }
  if (params !== undefined) config.params = params
  return requestBlob(config)
}

/** 使用 OpenAPI operationId 获取文本响应。 */
export async function requestTextOperation<Name extends TextOperationId>(
  operation: OperationDescriptor<Name>,
  options: TextOperationRequestOptions<Name>,
): Promise<OperationTextResponse<Name>> {
  const {
    path: pathParameters,
    params,
    ...transportOptions
  } = options as RequestTransportOptions & {
    path?: Record<string, unknown>
    params?: unknown
  }
  const config: AxiosRequestConfig = {
    ...transportOptions,
    method: operation.method,
    url: resolveOperationPath(operation.path, pathParameters),
  }
  if (params !== undefined) config.params = params
  return requestText(config) as Promise<OperationTextResponse<Name>>
}
