import apiPrefixContract from './apiPrefix.generated.json'
import { buildApiBaseUrl, normalizeApiOrigin, normalizeApiPrefix } from './apiEndpoint'

const browserOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
const apiOrigin = normalizeApiOrigin(import.meta.env.VITE_APP_API_ORIGIN, browserOrigin)
const apiPrefix = normalizeApiPrefix(apiPrefixContract)

export const runtimeConfig = Object.freeze({
  apiOrigin,
  apiPrefix,
  apiBaseUrl: buildApiBaseUrl(apiOrigin, apiPrefix),
})
