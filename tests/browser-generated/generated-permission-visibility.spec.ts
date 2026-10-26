import { expect } from '@playwright/test'
import { test } from '../browser-real/fixture'

test('真实 Element Plus 按钮遵守 hidden 隐藏并可恢复显示', async ({ page }, info) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  const button = await page.evaluateHandle(() => {
    const element = document.createElement('button')
    element.className = 'el-button'
    element.textContent = '隐藏属性可见性检查'
    document.body.append(element)
    return element
  })
  const snapshot = () =>
    button.evaluate((element) => ({
      hidden: element.hidden,
      display: getComputedStyle(element).display,
      rects: element.getClientRects().length,
    }))
  try {
    await expect.poll(async () => (await snapshot()).display).toBe('inline-flex')
    const visible = await snapshot()
    expect(visible.hidden).toBe(false)
    expect(visible.rects).toBeGreaterThan(0)
    await button.evaluate((element) => {
      element.hidden = true
    })
    const hidden = await snapshot()
    await info.attach('hidden-button-observation', {
      body: JSON.stringify({ visible, hidden }),
      contentType: 'application/json',
    })
    expect(hidden).toEqual({ hidden: true, display: 'none', rects: 0 })
    await button.evaluate((element) => {
      element.hidden = false
    })
    const restored = await snapshot()
    expect(restored.hidden).toBe(false)
    expect(restored.display).toBe(visible.display)
    expect(restored.rects).toBeGreaterThan(0)
  } finally {
    await button.evaluate((element) => element.remove())
    await button.dispose()
  }
})
