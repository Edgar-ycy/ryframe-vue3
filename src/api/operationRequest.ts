import type { AxiosRequestConfig } from 'axios'

import type {
  OperationData,
  OperationJsonBody,
  OperationJsonResponse,
  OperationPath,
  OperationQuery,
} from './contract'
import { operationManifest, type OperationId } from './generated/operations'
import request from '@/shared/http/client'

type JsonOperationId = {
  [Name in OperationId]: [OperationJsonResponse<Name>] extends [never] ? never : Name
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

function resolveOperationPath(
  template: string,
  parameters: Record<string, unknown> | undefined,
): string {
  return template.replace(/\{([^{}]+)\}/gu, (_placeholder, name: string) => {
    if (!parameters || !Object.hasOwn(parameters, name)) {
      throw new TypeError(`operationId 请求缺少路径参数：${name}`)
    }
    const value = parameters[name]
    if (value === undefined || value === null) {
      throw new TypeError(`operationId 请求的路径参数不能为空：${name}`)
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
