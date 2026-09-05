import { setTimeout } from 'node:timers/promises'
import {
  completeLogin,
  loginBinding,
  loginKeys,
  reserveLogin,
} from './browser-login-budget-model.mjs'
import { updateLedger } from './browser-login-ledger.mjs'

export { fixedClientAddress } from './browser-login-budget-model.mjs'

export function createLoginBudget(options) {
  const binding = loginBinding(options)
  const { statePath, now = Date.now, sleep = setTimeout, onWait = () => {} } = options
  if (!statePath) throw new Error('真实登录必须显式提供 RYFRAME_E2E_LOGIN_BUDGET_STATE')
  const update = (change) => updateLedger(statePath, binding, now, change)
  return {
    async reserve(identity, address) {
      const keys = loginKeys(identity, address)
      const deadline = now() + binding.windowMs * 3 + 30_000
      while (true) {
        const result = await update((state, current) => reserveLogin(state, binding, keys, current))
        if (result.reservation) return result.reservation
        if (now() + result.waitMs > deadline) throw new Error('共享登录预算持续占用，拒绝无限等待')
        onWait(result.waitMs)
        await sleep(result.waitMs)
      }
    },
    async complete(reservation) {
      await update((state, current) => completeLogin(state, binding, reservation, current))
    },
  }
}

export function configuredLoginBudget(environment = process.env) {
  return createLoginBudget({
    statePath: environment.RYFRAME_E2E_LOGIN_BUDGET_STATE,
    scope: environment.RYFRAME_E2E_SCOPE_ID || environment.APP_SCOPE_ID,
    capacity: Number(environment.RYFRAME_E2E_LOGIN_RATE_LIMIT_CAPACITY),
    windowMs: Number(environment.RYFRAME_E2E_LOGIN_RATE_LIMIT_WINDOW_SECS) * 1000,
    onWait: (waitMs) => console.info(`登录前等待共享预算 ${waitMs}ms`),
  })
}
