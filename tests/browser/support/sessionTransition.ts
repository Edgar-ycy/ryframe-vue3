import type { Page } from '@playwright/test'
import type { SessionContext } from '@/api/modules/sessionContext'

const SESSION_CHANNEL = 'ryframe-auth-v0.5'

/** 使用独立 BroadcastChannel 模拟另一个标签完成刷新，避免依赖共享后端数据。 */
export async function publishRemoteAuthenticatedSession(
  page: Page,
  sequence: number,
  accessToken: string,
  sessionContext: SessionContext,
): Promise<void> {
  const startedAt = Date.now() + 60_000 + sequence
  const operationId = `browser-fixture-${sequence}`
  await page.evaluate(
    async ({ channelName, context, operation, source, token }) => {
      const channel = new BroadcastChannel(channelName)
      channel.postMessage({
        type: 'refresh-start',
        source,
        operationId: operation.id,
        startedAt: operation.startedAt,
      })
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      channel.postMessage({
        type: 'authenticated',
        source,
        operationId: operation.id,
        startedAt: operation.startedAt,
        accessToken: token,
        sessionContext: context,
      })
      await new Promise<void>((resolve) => window.setTimeout(resolve, 20))
      channel.close()
    },
    {
      channelName: SESSION_CHANNEL,
      context: sessionContext,
      operation: { id: operationId, startedAt },
      source: `fixture-tab-${sequence}`,
      token: accessToken,
    },
  )
}
