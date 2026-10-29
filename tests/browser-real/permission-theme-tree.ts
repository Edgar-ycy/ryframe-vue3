import { expect, type Page, type TestInfo } from '@playwright/test'
import { expectNoSeriousAccessibilityViolations } from '../browser/support/accessibility'
import {
  expectReadableSurface,
  screenshot,
  settleAppearance,
} from '../browser/support/permissionTheme'

export async function verifyPermissionTree(page: Page, info: TestInfo, nodeName: string) {
  await page
    .locator('.card-header .toolbar')
    .getByRole('button', { name: '新增', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: '新增权限', exact: true })
  await expect(dialog).toBeVisible()
  try {
    const select = dialog.getByRole('combobox').first()
    const wrapper = select.locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " el-select ")][1]',
    )
    await wrapper.click()
    await expect(select).toHaveAttribute('aria-expanded', 'true')
    await expect(select).toHaveAttribute('aria-haspopup', 'tree')
    const tree = page.getByRole('tree')
    await expect(tree).toHaveCount(1)
    await expect(tree).toBeVisible()
    await expect(tree).toHaveAccessibleName(/\S/u)
    const treeId = await tree.getAttribute('id')
    expect(treeId).toBeTruthy()
    await expect(select).toHaveAttribute('aria-controls', treeId ?? '')
    // 现有TreeSelect将DOM焦点交给treeitem，不再声明内部Option为活动后代。
    await expect(select).not.toHaveAttribute('aria-activedescendant', /.+/u)
    await expect(tree.getByRole('listbox')).toHaveCount(0)
    await expect(tree.getByRole('option')).toHaveCount(0)
    const root = tree.getByRole('treeitem', { name: '根权限', exact: true })
    const rootLabel = root.locator('> .el-tree-node__content .el-select-dropdown__item > span')
    await settleAppearance(page)
    await expectReadableSurface(rootLabel, '真实树根文字')
    const rootExpand = root.locator('> .el-tree-node__content .el-tree-node__expand-icon')
    if ((await root.getAttribute('aria-expanded')) === 'true') await rootExpand.click()
    await expect(root).toHaveAttribute('aria-expanded', 'false')
    await rootExpand.click()
    await expect(root).toHaveAttribute('aria-expanded', 'true')
    const parent = tree.getByRole('treeitem', { name: nodeName, exact: true }).first()
    await expect(parent).toBeVisible()
    await rootExpand.click()
    await expect(root).toHaveAttribute('aria-expanded', 'false')
    await expect(parent).toBeHidden()
    await rootExpand.click()
    await expect(root).toHaveAttribute('aria-expanded', 'true')
    await expect(parent).toBeVisible()

    // 沿用库的Select→Tree焦点桥接与原上下键实现，不直接改节点状态。
    await select.focus()
    await select.press('ArrowDown')
    const focused = tree.locator('[role="treeitem"]:focus')
    await expect(focused).toHaveCount(1)
    const originalFocus = await focused.getAttribute('data-key')
    expect(originalFocus).toBeTruthy()
    await focused.press('ArrowDown')
    await expect(focused).not.toHaveAttribute('data-key', originalFocus ?? '')
    await focused.press('ArrowUp')
    await expect(focused).toHaveAttribute('data-key', originalFocus ?? '')

    const label = parent.locator('> .el-tree-node__content .el-select-dropdown__item > span')
    await page.mouse.move(0, 0)
    await settleAppearance(page)
    await expectReadableSurface(label, '真实树节点普通状态')
    await label.hover()
    await expect.poll(() => parent.evaluate((element) => element.matches(':hover'))).toBe(true)
    await settleAppearance(page)
    await expectReadableSurface(label, '真实树节点悬停状态')
    await label.click()
    await expect(tree).toBeHidden()
    await expect(wrapper.locator('.el-select__placeholder')).toHaveText(nodeName)
    await wrapper.click()
    await expect(tree).toBeVisible()
    await expect(parent).toHaveAttribute('aria-selected', 'true')
    await expect(parent).toHaveAttribute('aria-disabled', /^(?:false)?$/u)
    await expect(parent.locator('> .el-tree-node__content .el-select-dropdown__item')).toHaveClass(
      /\bis-selected\b/u,
    )
    await page.mouse.move(0, 0)
    await settleAppearance(page)
    await expectReadableSurface(label, '真实树节点选中状态')
    await label.hover()
    await settleAppearance(page)
    await expectReadableSurface(label, '真实树节点选中且悬停状态')
    await expectNoSeriousAccessibilityViolations(page, '真实暗黑权限树与新增对话框')
    await screenshot(page, info, 'permission-dark-tree')

    // 通过现有输入框Enter选择根项，随后清空，仅改变未提交表单。
    await rootLabel.hover()
    await select.focus()
    await select.press('Enter')
    await expect(tree).toBeHidden()
    await expect(wrapper.locator('.el-select__placeholder')).toHaveText('根权限')
    await wrapper.click()
    await expect(tree).toBeVisible()
    await expect(root).toHaveAttribute('aria-selected', 'true')
    await expect(parent).toHaveAttribute('aria-selected', 'false')
    await select.press('Escape')
    await expect(tree).toBeHidden()
    await wrapper.hover()
    await dialog.locator('.el-select__clear').click()
    await expect(wrapper.locator('.el-select__placeholder')).not.toHaveText('根权限')
    await wrapper.click()
    await expect(tree).toBeVisible()
    await expect(root).toHaveAttribute('aria-selected', 'false')
    await expect(parent).toHaveAttribute('aria-selected', 'false')
    await select.press('Escape')
    await expect(tree).toBeHidden()
    await expect(dialog).toBeVisible()
    await expect(select).toBeFocused()
    return {
      parentSelected: true,
      rootSelected: true,
      clearedAndEchoed: true,
      expandedAndCollapsed: true,
      keyboardNavigated: true,
      keyboardSelected: true,
      escapeClosedPopup: true,
    }
  } finally {
    await dialog.getByRole('button', { name: '取消', exact: true }).click()
    await expect(dialog).toBeHidden()
  }
}
