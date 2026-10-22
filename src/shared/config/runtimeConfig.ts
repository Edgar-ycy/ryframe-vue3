import apiPrefixContract from './apiPrefix.generated.json'
import { buildApiBaseUrl, normalizeApiOrigin, normalizeApiPrefix } from './apiEndpoint'

const browserOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
const apiOrigin = normalizeApiOrigin(__RYFRAME_PUBLIC_CONFIG__.apiOrigin, browserOrigin)
const apiPrefix = normalizeApiPrefix(apiPrefixContract)

export const runtimeConfig = Object.freeze({
  apiOrigin,
  apiPrefix,
  apiBaseUrl: buildApiBaseUrl(apiOrigin, apiPrefix),
})
