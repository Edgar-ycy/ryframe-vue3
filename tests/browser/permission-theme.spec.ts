import { expect, test, type Page } from '@playwright/test'
import { expectNoSeriousAccessibilityViolations } from './support/accessibility'
import { expectCleanDiagnostics, observeDiagnostics } from './support/diagnostics'
import { loginWithFixture, openSidebarPage } from './support/navigation'
import { expectInlineActions, expectReadableSurface } from './support/permissionTheme'
import { installPermissionThemeFixture, permissionRows } from './support/permissionThemeFixture'

async function expectTreeAppearance(page: Page): Promise<void> {
  await page
    .locator('.card-header .toolbar')
    .getByRole('button', { name: '新增', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: '新增权限', exact: true })
  await expect(dialog).toBeVisible()
  const select = dialog.getByRole('combobox').first()
  const selectWrapper = select.locator(
    'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " el-select ")][1]',
  )
  await selectWrapper.click()
  await expect(select).toHaveAttribute('aria-expanded', 'true')
  const tree = page.locator('.el-select-dropdown:visible .el-tree')
  await expect(tree).toBeVisible()
  const root = tree.getByRole('treeitem', { name: '根权限', exact: true })
  await expectReadableSurface(
    root.locator('> .el-tree-node__content .el-select-dropdown__item > span'),
    '树根文字',
  )
  if ((await root.getAttribute('aria-expanded')) === 'false') {
    await root.locator('> .el-tree-node__content .el-tree-node__expand-icon').click()
  }
  const node = tree.getByRole('treeitem', { name: permissionRows[0].name, exact: true })
  const option = node.locator('> .el-tree-node__content .el-select-dropdown__item')
  const label = option.locator('> span')
  await expectReadableSurface(label, '树节点普通状态')
  await label.hover()
  await expect
    .poll(() =>
      node.locator('> .el-tree-node__content').evaluate((element) => element.matches(':hover')),
    )
    .toBe(true)
  await expectReadableSurface(label, '树节点悬停状态')
  await label.click()
  await expect(tree).toBeHidden()
  await selectWrapper.click()
  await expect(select).toHaveAttribute('aria-expanded', 'true')
  await expect(tree).toBeVisible()
  await expect(node).toHaveAttribute('aria-selected', 'true')
  await expect(option).toHaveClass(/\bis-selected\b/u)
  await page.mouse.move(0, 0)
  await expectReadableSurface(label, '树节点选中状态')
  await label.hover()
  await expectReadableSurface(label, '树节点选中且悬停状态')
  await page.keyboard.press('Escape')
  await expect(tree).toBeHidden()
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  await expect(dialog).toBeHidden()
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`权限页 ${viewport.width}px 操作列不换行且暗黑 tag/tree 可读`, async ({ page }) => {
    const diagnostics = observeDiagnostics(page)
    const fixture = await installPermissionThemeFixture(page, diagnostics)
    await page.setViewportSize(viewport)
    await loginWithFixture(page)
    if (viewport.width < 768) await page.locator('.hamburger').click()
    await openSidebarPage(page, '系统管理', '权限管理')
    await expect(page).toHaveURL(/\/system\/permission$/u)
    await expect(page.locator('html')).toHaveClass(/\bdark\b/u)
    const table = page.locator('.permission-table')
    const rows = table.locator('.el-table__body-wrapper tr.el-table__row')
    await expect(rows).toHaveCount(permissionRows.length)
    await expectInlineActions(rows)
    expect(fixture.permissionRequests.length).toBeGreaterThan(0)

    const scroll = page.locator('.permission-table-scroll')
    await expect(scroll).toHaveCSS('overflow-x', 'auto')
    if (viewport.width === 390) {
      const dimensions = await scroll.evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
      }))
      expect(dimensions.scroll).toBeGreaterThan(dimensions.client)
      await scroll.evaluate((element) => {
        element.scrollLeft = element.scrollWidth
      })
      await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
      await expect(rows).toHaveCount(permissionRows.length)
      await expectInlineActions(rows)
      await scroll.evaluate((element) => {
        element.scrollLeft = 0
      })
    }

    const tags = table.locator('.el-table__body-wrapper .el-tag__content')
    await expect(tags).toHaveCount(permissionRows.length * 3)
    for (const [index, tag] of (await tags.all()).entries()) {
      await expectReadableSurface(tag, `权限表格标签 ${index + 1}`)
    }
    await expectTreeAppearance(page)
    if (viewport.width === 390) {
      const collapsedMenu = page.locator('.sidebar-container .el-menu--collapse')
      await expect(collapsedMenu).toHaveCount(1)
      await expect(
        collapsedMenu.getByRole('menuitem', { name: '首页', exact: true }),
      ).toHaveAccessibleName('首页')
      await expect(
        collapsedMenu.getByRole('menuitem', { name: '系统管理', exact: true }),
      ).toHaveAccessibleName('系统管理')
    }
    await expectNoSeriousAccessibilityViolations(page, `${viewport.width}px 暗黑权限页`)
    await expectCleanDiagnostics(page, diagnostics)
  })
}
