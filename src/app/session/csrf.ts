import { getCsrfChallenge } from '@/api/modules/auth'
import { translate } from '@/i18n'
import { HttpError } from '@/shared/http/client'
import { getServerStateRequestContext } from '@/shared/query/client'

const CSRF_EXPIRY_SKEW_MS = 5_000

let csrfToken: string | undefined
let csrfExpiresAt = 0
let csrfPromise: Promise<string> | undefined
let csrfGeneration = 0
let csrfController: AbortController | undefined
let csrfContext: ReturnType<typeof getServerStateRequestContext> | undefined

function cancelledChallenge(): HttpError {
  return new HttpError(translate('shell.session.operationCancelled'), { kind: 'cancelled' })
}

export function ensureCsrfToken(force = false): Promise<string> {
  const context = getServerStateRequestContext()
  if (context.signal.aborted) return Promise.reject(cancelledChallenge())
  if (
    csrfContext &&
    (csrfContext.sessionEpoch !== context.sessionEpoch || csrfContext.signal.aborted)
  ) {
    invalidateCsrfToken()
  }
  if (!force && csrfToken && Date.now() + CSRF_EXPIRY_SKEW_MS < csrfExpiresAt) {
    return Promise.resolve(csrfToken)
  }
  if (!csrfPromise) {
    const generation = csrfGeneration
    const controller = new AbortController()
    csrfContext = context
    csrfController = controller
    const pending = getCsrfChallenge(AbortSignal.any([context.signal, controller.signal]))
      .then((response) => {
        if (controller.signal.aborted || context.signal.aborted || generation !== csrfGeneration) {
          throw cancelledChallenge()
        }
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
        if (csrfPromise === pending) csrfPromise = undefined
      })
    csrfPromise = pending
  }
  return csrfPromise
}

export function invalidateCsrfToken(expectedToken?: string): void {
  if (expectedToken !== undefined && csrfToken !== expectedToken) return
  csrfGeneration += 1
  csrfController?.abort()
  csrfController = undefined
  csrfContext = undefined
  csrfPromise = undefined
  csrfToken = undefined
  csrfExpiresAt = 0
}
