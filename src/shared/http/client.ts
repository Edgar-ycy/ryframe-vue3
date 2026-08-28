import type { AxiosRequestConfig } from 'axios'
import type { ApiResponse } from './types'
import { HttpError, parseEnvelope, toHttpError } from './errors'
import { httpTranslate } from './localization'
import { rawTransport, transport } from './transport'

export { HttpError, type HttpErrorKind, type HttpErrorOptions } from './errors'
export { configureHttpLocalization, type HttpLocalizationAdapter } from './localization'
export {
  configureHttpSession,
  type HttpSessionAdapter,
  type HttpSessionRequestContext,
} from './session'

export async function request<T = unknown>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  const response = await transport.request<ApiResponse<T>>(config)
  return parseEnvelope(response)
}

export function requireOperationData<T>(response: ApiResponse<T>): T {
  if (response.data === undefined) {
    throw new HttpError(httpTranslate('shell.http.invalidResponse'), {
      code: response.code,
      request_id: response.request_id,
      kind: 'invalid_response',
    })
  }
  return response.data
}

export async function rawRequest<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  try {
    const response = await rawTransport.request<ApiResponse<T>>(config)
    return parseEnvelope(response)
  } catch (error) {
    throw await toHttpError(error)
  }
}

export async function requestBlob(config: AxiosRequestConfig): Promise<Blob> {
  const response = await transport.request<Blob>({ ...config, responseType: 'blob' })
  return response.data
}

export async function requestText(config: AxiosRequestConfig): Promise<string> {
  const response = await transport.request<string>({ ...config, responseType: 'text' })
  return response.data
}

export default request
export type { ApiResponse } from './types'
