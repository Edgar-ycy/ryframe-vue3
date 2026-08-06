import { getCsrfChallenge } from '@/api/modules/auth'
import { translate } from '@/i18n'
import { HttpError } from '@/shared/http/client'

const CSRF_EXPIRY_SKEW_MS = 5_000

let csrfToken: string | undefined
let csrfExpiresAt = 0
let csrfPromise: Promise<string> | undefined

export function ensureCsrfToken(force = false): Promise<string> {
  if (!force && csrfToken && Date.now() + CSRF_EXPIRY_SKEW_MS < csrfExpiresAt) {
    return Promise.resolve(csrfToken)
  }
  if (!csrfPromise) {
    csrfPromise = getCsrfChallenge()
      .then((response) => {
        const challenge = response.data
        if (!challenge?.csrf_token || !challenge.expires_in) {
          throw new HttpError(translate('shell.session.csrfChallengeInvalid'), {
            status: 503,
            kind: 'invalid_response',
          })
        }
        csrfToken = challenge.csrf_token
        csrfExpiresAt = Date.now() + challenge.expires_in * 1_000
        return challenge.csrf_token
      })
      .finally(() => {
        csrfPromise = undefined
      })
  }
  return csrfPromise
}

export function invalidateCsrfToken(): void {
  csrfToken = undefined
  csrfExpiresAt = 0
}
