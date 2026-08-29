import type { AxiosRequestConfig } from 'axios'

import type {
  ApiOperation,
  OperationId,
  OperationData,
  OperationJsonBody,
  OperationJsonResponse,
  OperationPath,
  OperationQuery,
  OperationTextResponse,
} from './contract'
import request, { rawRequest, requestBlob, requestText } from '@/shared/http/client'

export type OperationDescriptor<Name extends OperationId = OperationId> = Readonly<{
  operationId: Name
  method: 'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put' | 'trace'
  path: string
}>

type JsonResponseOperationId = {
  [Name in OperationId]: [OperationJsonResponse<Name>] extends [never] ? never : Name
}[OperationId]

type MultipartOperationId = {
  [Name in OperationId]: ApiOperation<Name> extends {
    requestBody: { content: { 'multipart/form-data': unknown } }
  }
    ? Name
    : never
}[OperationId]

type JsonOperationId = Exclude<JsonResponseOperationId, MultipartOperationId>

type TextOperationId = {
  [Name in OperationId]: [OperationTextResponse<Name>] extends [never] ? never : Name
}[OperationId]

type BlobOperationId = Exclude<OperationId, JsonResponseOperationId | TextOperationId>

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

export type OperationBodyOptions<Name extends OperationId> = [OperationJsonBody<Name>] extends [
  never,
]
  ? { data?: never }
  : { data: OperationJsonBody<Name> }

export type OperationRequestOptions<Name extends JsonOperationId> = JsonRequestTransportOptions &
  PathOptions<Name> &
  QueryOptions<Name> &
  OperationBodyOptions<Name>

export type MultipartOperationRequestOptions<Name extends MultipartOperationId> =
  RequestTransportOptions & PathOptions<Name> & QueryOptions<Name> & { data: FormData }

export type BlobOperationRequestOptions<Name extends BlobOperationId> = RequestTransportOptions &
  PathOptions<Name> &
  QueryOptions<Name> &
  OperationBodyOptions<Name>

export type TextOperationRequestOptions<Name extends TextOperationId> = RequestTransportOptions &
  PathOptions<Name> &
  QueryOptions<Name> &
  OperationBodyOptions<Name>

export type JsonOperationCaller<Name extends JsonOperationId> = (
  options: OperationRequestOptions<Name>,
) => Promise<OperationJsonResponse<Name>>

export type MultipartOperationCaller<Name extends MultipartOperationId> = (
  options: MultipartOperationRequestOptions<Name>,
) => Promise<OperationJsonResponse<Name>>

export type BlobOperationCaller<Name extends BlobOperationId> = (
  options: BlobOperationRequestOptions<Name>,
) => Promise<Blob>

export type TextOperationCaller<Name extends TextOperationId> = (
  options: TextOperationRequestOptions<Name>,
) => Promise<OperationTextResponse<Name>>

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

export function bindJsonOperation<Name extends JsonOperationId>(
  operation: OperationDescriptor<Name>,
): JsonOperationCaller<Name> {
  return async (options) => {
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
}

export function bindMultipartOperation<Name extends MultipartOperationId>(
  operation: OperationDescriptor<Name>,
): MultipartOperationCaller<Name> {
  return async (options) => {
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
}

export function bindBlobOperation<Name extends BlobOperationId>(
  operation: OperationDescriptor<Name>,
): BlobOperationCaller<Name> {
  return async (options) => {
    const {
      path: pathParameters,
      params,
      data,
      ...transportOptions
    } = options as RequestTransportOptions & {
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
    return requestBlob(config)
  }
}

export function bindTextOperation<Name extends TextOperationId>(
  operation: OperationDescriptor<Name>,
): TextOperationCaller<Name> {
  return async (options) => {
    const {
      path: pathParameters,
      params,
      data,
      ...transportOptions
    } = options as RequestTransportOptions & {
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
    return requestText(config) as Promise<OperationTextResponse<Name>>
  }
}
