import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { BrowserContext } from '@playwright/test'
import { test as base } from './fixture'
import {
  createSessionResources,
  type SessionResources,
} from '../../scripts/browser-session-resources.mjs'
import { credentials } from './support'
import { observeRequestBudget } from './request-budget'
import { prepareActors } from './session-race-support'
import { deleteOwnedIdentity } from './session-cleanup'
import { observeSession } from './session-observation'

type ResourceFixture = {
  resources: SessionResources
  budget: ReturnType<typeof observeRequestBudget>
  newContext: (address: string) => Promise<BrowserContext>
}

export const test = base.extend<{
  sessionResources: ResourceFixture
  actor: Awaited<ReturnType<typeof prepareActors>> & {
    adminBudget: ReturnType<typeof observeRequestBudget>
  }
}>({
  sessionResources: [
    async ({ page, newClientContext }, use, info) => {
      const receiptPath = info.outputPath('session-resources.json')
      await mkdir(path.dirname(receiptPath), { recursive: true })
      let saving = Promise.resolve()
      const resources = await createSessionResources({
        scopeId: process.env.RYFRAME_E2E_SCOPE_ID || process.env.APP_SCOPE_ID,
        tenantId: credentials.tenantId,
        testId: info.testId,
        save: (receipt) => {
          saving = saving.then(async () => {
            await writeFile(`${receiptPath}.tmp`, JSON.stringify(receipt, null, 2) + '\n')
            await rename(`${receiptPath}.tmp`, receiptPath)
          })
          return saving
        },
      })
      const contexts: BrowserContext[] = []
      const budget = observeRequestBudget(page)
      const failures: unknown[] = []
      const originalErrors: unknown[] = []
      try {
        await use({
          resources,
          budget,
          newContext: async (address) => {
            const context = await newClientContext(address)
            contexts.push(context)
            return context
          },
        })
      } catch (error) {
        originalErrors.push(error)
      } finally {
        for (const context of contexts) {
          try {
            await context.close()
          } catch (error) {
            failures.push(error)
          }
        }
        try {
          await resources.cleanup(async (resource) => {
            await budget.beforePageBootstrap()
            if (page.isClosed()) throw new Error('管理员页面已关闭，无法核验并清理精确身份')
            const diagnostics = observeSession(page)
            // 准备失败可能留下表单；重新进入当前管理员页面后再精确核验 ID。
            await page.goto('/index')
            await page.waitForLoadState('networkidle')
            await budget.beforeCleanup()
            return deleteOwnedIdentity(page, resource, diagnostics)
          })
        } catch (error) {
          failures.push(error)
        }
        await info.attach('session-resource-ownership', {
          path: receiptPath,
          contentType: 'application/json',
        })
        if (failures.length) {
          await info.attach('session-cleanup-errors', {
            body: JSON.stringify({
              status: resources.snapshot().status,
              cleanup_errors: failures.length,
              original_test_errors: originalErrors.length,
            }),
            contentType: 'application/json',
          })
        }
      }
      if (originalErrors.length || failures.length) {
        throw new AggregateError(
          [...originalErrors, ...failures],
          '会话测试或精确身份清理失败，原始测试与清理证据均已保留',
        )
      }
    },
    { timeout: 180_000 },
  ],
  actor: [
    async ({ page, clientAddress, sessionResources }, use) => {
      await sessionResources.budget.beforeProvisioning()
      const actor = await prepareActors(
        page,
        sessionResources.newContext,
        clientAddress,
        sessionResources.resources,
      )
      await use({ ...actor, adminBudget: sessionResources.budget })
    },
    { timeout: 300_000 },
  ],
})
