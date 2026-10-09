import { expect, test } from '@playwright/test'
import { selectLoginTenant } from '../browser-real/login-tenant'

test('租户选项延迟展开时等待目标，不误判需要加载更多', async ({ page }) => {
  await page.setContent(`
    <button role="combobox" aria-label="请选择租户名称"
      onclick="setTimeout(() => document.querySelector('[role=option]').hidden = false, 150)">
      请选择租户名称
    </button>
    <button role="option" data-testid="login-tenant-system" hidden
      onclick="this.dataset.selected = 'true'">系统租户</button>
  `)
  await selectLoginTenant(page, 'system')
  await expect(page.getByTestId('login-tenant-system')).toHaveAttribute('data-selected', 'true')
})

test('租户分页响应后等待新增选项完成渲染', async ({ page }) => {
  let requests = 0
  await page.route('https://tenant.fixture/api/v1/auth/tenants', async (route) => {
    requests++
    await route.fulfill({
      json: { data: { items: [] } },
      headers: { 'access-control-allow-origin': '*' },
    })
  })
  await page.setContent(`
    <button role="combobox" aria-label="请选择租户名称"
      onclick="setTimeout(() => document.querySelector('#more').hidden = false, 150)">
      请选择租户名称
    </button>
    <button id="more" hidden onclick="
      this.hidden = true;
      fetch('https://tenant.fixture/api/v1/auth/tenants').then(() =>
        setTimeout(() => document.querySelector('[role=option]').hidden = false, 150))">
      加载更多租户
    </button>
    <button role="option" data-testid="login-tenant-next" hidden
      onclick="this.dataset.selected = 'true'">下一页租户</button>
  `)
  await selectLoginTenant(page, 'next')
  await expect(page.getByTestId('login-tenant-next')).toHaveAttribute('data-selected', 'true')
  expect(requests).toBe(1)
})
