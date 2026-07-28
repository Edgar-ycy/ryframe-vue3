export interface ResetPasswordCredentials {
  tenantId: string
  resetRequestKey: string
  token: string
}

interface BrowserLocation {
  hash: string
  search: string
}

interface BrowserHistory {
  readonly state: unknown
  replaceState(data: unknown, unused: string, url?: string | URL | null): void
}

/**
 * 在从可见 URL 中移除一次性重置凭据前先行获取它们。
 *
 * 重置凭据被刻意限定为只从片段中接收，因为 HTTP 请求不会将片段发送给服务端。
 * 查询参数会被丢弃，以避免旧链接在浏览器历史记录中保留敏感信息。
 */
export function consumeResetPasswordFragment(
  location: BrowserLocation,
  history: BrowserHistory,
  cleanPath: string,
): ResetPasswordCredentials {
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ''))
  const credentials = {
    tenantId: fragment.get('tenant_id') ?? '',
    resetRequestKey: fragment.get('request_id') ?? '',
    token: fragment.get('token') ?? '',
  }

  if (location.search || location.hash) {
    history.replaceState(history.state, '', cleanPath)
  }

  return credentials
}
