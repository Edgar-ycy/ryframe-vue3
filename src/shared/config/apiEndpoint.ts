export interface ApiPrefixContract {
  version: number
  value: string
}

/** 校验由后端 OpenAPI 生成的唯一 API 前缀。 */
export function normalizeApiPrefix(contract: ApiPrefixContract): string {
  if (contract.version !== 1 || !/^\/api\/v[1-9]\d*$/.test(contract.value)) {
    throw new Error('OpenAPI 中的 API 前缀契约无效')
  }
  return contract.value
}

/** 校验部署配置只包含 origin，不允许再次携带 API 路径。 */
export function normalizeApiOrigin(value: string | undefined, fallbackOrigin: string): string {
  const candidate = value?.trim() || fallbackOrigin
  let url: URL
  try {
    url = new URL(candidate)
  }
  catch {
    throw new Error('VITE_APP_API_ORIGIN 必须是有效的绝对 URL origin')
  }
  if (url.origin === 'null'
    || url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash
    || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('VITE_APP_API_ORIGIN 只能包含 HTTP(S) origin，不能包含路径、查询或片段')
  }
  return url.origin
}

/** 使用部署 origin 与后端契约前缀构造 Axios/WebSocket 共用基础地址。 */
export function buildApiBaseUrl(origin: string, prefix: string): string {
  return new URL(prefix, `${origin}/`).toString().replace(/\/$/, '')
}
