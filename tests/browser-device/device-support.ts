import { expect, type Page } from '@playwright/test'
import { act, isolatedName } from '../browser-real/support'

export async function createDevices(page: Page): Promise<string[]> {
  await act(page, 'GET', '/api/v1/system/devices', () => page.goto('/system/device'))
  const names = Array.from({ length: 3 }, () => isolatedName('迁移设备'))
  for (const [index, name] of names.entries()) {
    await page.locator('.card-header').getByRole('button', { name: '新增', exact: true }).click()
    const form = page.getByRole('dialog', { name: '新增设备', exact: true })
    await form.getByPlaceholder('请输入设备名称').fill(name)
    const status = index === 0 ? '停用' : '启用'
    await form.getByText(status, { exact: true }).click()
    await expect(form.getByRole('radio', { name: status, exact: true })).toBeChecked()
    await act(page, 'POST', '/api/v1/system/devices', () =>
      form.getByRole('button', { name: '确定', exact: true }).click(),
    )
    await expect(form).not.toBeVisible()
    await expect(page.locator('.el-table__body tr').filter({ hasText: name })).toHaveCount(1)
  }
  return names
}

export async function verifyDevices(page: Page, names: string[]): Promise<void> {
  const response = await act(page, 'GET', '/api/v1/system/devices', () =>
    page.goto('/system/device'),
  )
  expect((await response.json()).data.total).toBe(names.length)
  for (const [index, name] of names.entries()) {
    const row = page.locator('.el-table__body tr').filter({ hasText: name })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(index === 0 ? '停用' : '启用')
  }
}

export async function verifyAndDeleteDevices(page: Page, names: string[]): Promise<void> {
  await verifyDevices(page, names)
  for (const name of names) {
    const row = page.locator('.el-table__body tr').filter({ hasText: name })
    await row.getByRole('button', { name: '删除', exact: true }).click()
    await act(page, 'DELETE', /\/system\/devices\/\d+$/u, () =>
      page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click(),
    )
    await expect(row).toHaveCount(0)
  }
}
