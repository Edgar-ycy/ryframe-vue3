import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export async function expectNoSeriousAccessibilityViolations(
  page: Page,
  pageName: string,
): Promise<void> {
  await expect(page.locator('.el-message')).toHaveCount(0, { timeout: 5_000 })
  const result = await new AxeBuilder({ page }).analyze()
  const violations = result.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      help: violation.help,
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target.join(' ')),
    }))

  expect(violations, `${pageName} 存在 serious/critical axe 违规`).toEqual([])
}
