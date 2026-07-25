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
 * Capture one-time reset credentials before removing them from the visible URL.
 *
 * Reset credentials are intentionally accepted only from the fragment because
 * fragments are not sent to the server in HTTP requests. Query parameters are
 * discarded to prevent legacy links from keeping secrets in browser history.
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
