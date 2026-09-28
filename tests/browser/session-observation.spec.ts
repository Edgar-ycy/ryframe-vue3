import { expect, test } from '@playwright/test'
import { watchStaleProjection } from '../browser-real/session-observation'

for (const selector of ['.app-main', '.navbar']) {
  test(`旧渲染观察器捕获 ${selector} 内短暂出现后移除的旧结果`, async ({ page }) => {
    await page.setContent(
      '<section class="app-main">业务页</section><nav class="navbar">当前用户</nav>',
    )
    const verify = await watchStaleProjection(page, ['旧身份结果'])
    await page.evaluate(async (target) => {
      const node = document.createElement('span')
      node.textContent = '旧身份结果'
      document.querySelector(target)!.append(node)
      await new Promise((resolve) => setTimeout(resolve, 0))
      node.remove()
    }, selector)
    await expect(page.getByText('旧身份结果')).toHaveCount(0)
    await expect(verify()).rejects.toThrow()
  })
}

test('业务页没有旧结果时观察器通过', async ({ page }) => {
  await page.setContent(
    '<section class="app-main">新结果</section><nav class="navbar">新用户</nav>',
  )
  await (
    await watchStaleProjection(page, ['旧身份结果'])
  )()
})
