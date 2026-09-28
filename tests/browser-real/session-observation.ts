import { expect, type Page, type Request } from '@playwright/test'
import { observeDiagnostics, expectCleanDiagnostics } from '../browser/support/diagnostics'

export function observeSession(page: Page) {
  const cancelled = new Set<Request>()
  const diagnostics = observeDiagnostics(page, (request) => cancelled.has(request))
  return {
    cancel: (request: Request | undefined) => {
      expect(request).toBeDefined()
      if (request) cancelled.add(request)
    },
    verify: () => expectCleanDiagnostics(page, diagnostics),
  }
}

export async function watchCancellationToasts(page: Page) {
  const handle = await page.evaluateHandle(() => {
    let count = 0
    const observer = new MutationObserver(() => {
      for (const message of document.querySelectorAll('.el-message')) {
        if (/取消|cancelled|canceled/iu.test(message.textContent || '')) count += 1
      }
    })
    observer.observe(document.body, { subtree: true, childList: true, characterData: true })
    return {
      stop: () => {
        observer.disconnect()
        return count
      },
    }
  })
  return async () => {
    expect(await handle.evaluate((value) => value.stop()), '整个身份切换期间不得显示取消提示').toBe(
      0,
    )
    await handle.dispose()
  }
}

/** 在新身份投影建立后持续观察，不能用最终快照掩盖短暂的旧结果回写。 */
export async function watchStaleProjection(page: Page, forbidden: string[]) {
  await expect(page.locator('.el-message')).toHaveCount(0, { timeout: 10_000 })
  await expect(page.locator('.app-main')).toBeVisible()
  const handle = await page.evaluateHandle((markers) => {
    const evidence = { staleRenders: 0, cancellationToasts: 0, successToasts: 0 }
    const inspect = () => {
      const text = ['.app-main', '.navbar']
        .map((selector) => document.querySelector(selector)?.textContent || '')
        .join('\n')
      if (markers.some((marker) => text.includes(marker))) evidence.staleRenders += 1
      for (const message of document.querySelectorAll('.el-message')) {
        if (/取消|cancelled|canceled/iu.test(message.textContent || ''))
          evidence.cancellationToasts += 1
        if (message.classList.contains('el-message--success')) evidence.successToasts += 1
      }
    }
    const observer = new MutationObserver(inspect)
    observer.observe(document.body, { subtree: true, childList: true, characterData: true })
    inspect()
    return { evidence, stop: () => observer.disconnect() }
  }, forbidden)
  return async () => {
    const evidence = await handle.evaluate((value) => {
      value.stop()
      return value.evidence
    })
    await handle.dispose()
    expect(evidence).toEqual({ staleRenders: 0, cancellationToasts: 0, successToasts: 0 })
  }
}
