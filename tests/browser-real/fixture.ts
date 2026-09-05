import { test as base, type BrowserContext } from '@playwright/test'
import { guardNetwork } from './network'
import { fixedClientAddress } from '../../scripts/browser-login-budget.mjs'
import { registerClientAddress } from './client-address'

export const test = base.extend<{
  clientAddress: string
  newClientContext: (address: string) => Promise<BrowserContext>
}>({
  clientAddress: [
    async ({ context, baseURL }, use, info) => {
      const verify = await guardNetwork(context, baseURL)
      // 同一 scope 的 dev、preview 与重跑使用相同客户，不能换地址绕过限流。
      const address = fixedClientAddress(
        process.env.RYFRAME_E2E_SCOPE_ID || process.env.APP_SCOPE_ID,
        info.testId,
      )
      await context.setExtraHTTPHeaders({ 'X-Forwarded-For': address })
      registerClientAddress(context, address)
      await use(address)
      verify()
    },
    { auto: true },
  ],
  newClientContext: async ({ browser, baseURL }, use) => {
    const clients: { context: BrowserContext; verify: () => void }[] = []
    await use(async (address) => {
      const context = await browser.newContext({
        baseURL,
        serviceWorkers: 'block',
        extraHTTPHeaders: { 'X-Forwarded-For': address },
      })
      registerClientAddress(context, address)
      clients.push({ context, verify: await guardNetwork(context, baseURL) })
      return context
    })
    await Promise.all(clients.map(({ context }) => context.close()))
    for (const client of clients) client.verify()
  },
})
