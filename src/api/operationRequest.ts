import type { AxiosRequestConfig } from 'axios'

import type {
  ApiOperation,
  OperationData,
  OperationJsonBody,
  OperationJsonResponse,
  OperationPath,
  OperationQuery,
} from './contract'
import { operationManifest, type OperationId } from './generated/operations'
import request, { requestBlob } from '@/shared/http/client'

type JsonOperationId = {
  [Name in OperationId]: [OperationJsonResponse<Name>] extends [never] ? never : Name
}[OperationId]

type MultipartOperationId = {
  [Name in OperationId]: ApiOperation<Name> extends {
    requestBody: { content: { 'multipart/form-data': unknown } }
  } ? Name : never
}[OperationId]

type RequestTransportOptions = Omit<
  AxiosRequestConfig,
  'baseURL' | 'data' | 'method' | 'params' | 'url'
>

type PathOptions<Name extends OperationId> = [OperationPath<Name>] extends [never]
  ? { path?: never }
  : { path: OperationPath<Name> }

type QueryOptions<Name extends OperationId> = [OperationQuery<Name>] extends [never]
  ? { params?: never }
  : { params?: OperationQuery<Name> }

type BodyOptions<Name extends OperationId> = [OperationJsonBody<Name>] extends [never]
  ? { data?: never }
  : { data: OperationJsonBody<Name> }

export type OperationRequestOptions<Name extends JsonOperationId> = RequestTransportOptions
  & PathOptions<Name>
  & QueryOptions<Name>
  & BodyOptions<Name>

export type MultipartOperationRequestOptions<Name extends MultipartOperationId> =
  RequestTransportOptions
  & PathOptions<Name>
  & QueryOptions<Name>
  & { data: FormData }

export type BlobOperationRequestOptions<Name extends OperationId> = RequestTransportOptions
  & PathOptions<Name>
  & QueryOptions<Name>

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

export function requestOperation<Name extends JsonOperationId>(
  operationId: Name,
  options: OperationRequestOptions<Name>,
): Promise<OperationJsonResponse<Name>> {
  const operation = operationManifest[operationId]
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
  return request<OperationData<Name>>(config) as Promise<OperationJsonResponse<Name>>
}

/** 使用 OpenAPI operationId 发送 multipart 请求，避免业务模块重复维护方法和路径。 */
export function requestMultipartOperation<Name extends MultipartOperationId>(
  operationId: Name,
  options: MultipartOperationRequestOptions<Name>,
): Promise<OperationJsonResponse<Name>> {
  const operation = operationManifest[operationId]
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
export function requestBlobOperation<Name extends OperationId>(
  operationId: Name,
  options: BlobOperationRequestOptions<Name>,
): Promise<Blob> {
  const operation = operationManifest[operationId]
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
