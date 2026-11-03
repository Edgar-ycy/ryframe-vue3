import { expect } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { test } from './fixture'
import { login, expectSuccessfulResponse, waitForApiResponse } from './support'
import { expectNoSeriousAccessibilityViolations } from '../browser/support/accessibility'
import { expectCleanDiagnostics, observeDiagnostics } from '../browser/support/diagnostics'
import {
  expectInlineActions,
  expectReadableSurface,
  screenshot,
  settleAppearance,
} from '../browser/support/permissionTheme'
import { verifyPermissionTree } from './permission-theme-tree'

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`真实权限页 ${viewport.width}px 菜单图标、行内操作与暗黑主题可读`, async ({
    page,
  }, info) => {
    const diagnostics = observeDiagnostics(page)
    const permissionMutations: string[] = []
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname
      if (path.startsWith('/api/v1/system/perms') && !['GET', 'HEAD'].includes(request.method())) {
        permissionMutations.push(`${request.method()} ${path}`)
      }
    })
    const observed = {
      viewport,
      permissionGet: { path: '/api/v1/system/perms/tree', status: 0 },
      diagnosticSvgVisible: false,
      domRows: 0,
      rowsBeforeExpansion: 0,
      rowsAfterExpansion: 0,
      visibleTags: 0,
      horizontalScroll: { client: 0, scroll: 0, moved: false },
      listAxePassed: false,
      treeAxePassed: false,
      treeInteractions: null as Awaited<ReturnType<typeof verifyPermissionTree>> | null,
      completed: false,
      permissionMutationRequests: permissionMutations,
    }
    try {
      // 先按目标视口登录，分别核验桌面和手机登录页的真实 axe。
      await page.setViewportSize(viewport)
      await login(page)
      // 手机不显示主题开关；登录后切到桌面设置暗黑，再恢复目标视口。
      await page.setViewportSize({ width: 1440, height: 900 })
      if (!(await page.locator('html').evaluate((element) => element.classList.contains('dark')))) {
        await page.locator('.theme-switch .el-switch__core').click()
      }
      await expect(page.locator('html')).toHaveClass(/\bdark\b/u)
      await settleAppearance(page)
      await page.setViewportSize(viewport)
      if (viewport.width === 390) {
        await expect(page.locator('.app-wrapper')).toHaveClass(/\bis-mobile\b/u)
      } else {
        await expect(page.locator('.app-wrapper')).not.toHaveClass(/\bis-mobile\b/u)
      }
      const sidebar = page.locator('.sidebar-container')
      if (
        await page
          .locator('.app-wrapper')
          .evaluate((element) => element.classList.contains('sidebar-collapse'))
      ) {
        await page.locator('.hamburger').click()
      }
      await sidebar.getByText('系统管理', { exact: true }).click()
      const diagnostic = sidebar.getByRole('menuitem', { name: '权限诊断', exact: true })
      await expect(diagnostic).toBeVisible()
      const icon = diagnostic.locator('.el-icon svg')
      await expect(icon).toBeVisible()
      const iconBox = await icon.boundingBox()
      expect(iconBox?.width).toBeGreaterThan(0)
      expect(iconBox?.height).toBeGreaterThan(0)
      observed.diagnosticSvgVisible = true
      const response = waitForApiResponse(page, 'GET', observed.permissionGet.path)
      await sidebar.getByText('权限管理', { exact: true }).click()
      const actual = await response
      await expectSuccessfulResponse(actual)
      observed.permissionGet.status = actual.status()
      const body: { data: { name: string }[] } = await actual.json()
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data.length).toBeGreaterThan(0)
      expect(typeof body.data[0].name).toBe('string')
      await expect(page).toHaveURL(/\/system\/permission$/u)
      await settleAppearance(page)
      const table = page.locator('.permission-table')
      observed.domRows = await table.locator('.el-table__body-wrapper tr.el-table__row').count()
      const rows = table.locator('.el-table__body-wrapper tr.el-table__row:visible')
      await expectInlineActions(rows)
      observed.rowsBeforeExpansion = await rows.count()
      const expand = rows
        .locator('.el-table__expand-icon:not(.el-table__expand-icon--expanded)')
        .first()
      await expect(expand).toBeVisible()
      await expand.click()
      await expect.poll(() => rows.count()).toBeGreaterThan(observed.rowsBeforeExpansion)
      await settleAppearance(page)
      await expectInlineActions(rows)
      observed.rowsAfterExpansion = await rows.count()
      const scroll = page.locator('.permission-table-scroll')
      await expect(scroll).toHaveCSS('overflow-x', 'auto')
      observed.horizontalScroll = await scroll.evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
        moved: false,
      }))
      if (viewport.width === 390) {
        expect(observed.horizontalScroll.scroll).toBeGreaterThan(observed.horizontalScroll.client)
        await scroll.evaluate((element) => {
          element.scrollLeft = element.scrollWidth
        })
        await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
        observed.horizontalScroll.moved = true
        await expectInlineActions(rows)
        await scroll.evaluate((element) => {
          element.scrollLeft = 0
        })
      }
      const tags = table.locator(
        '.el-table__body-wrapper tr.el-table__row:visible .el-tag__content:visible',
      )
      observed.visibleTags = await tags.count()
      expect(observed.visibleTags).toBeGreaterThan(0)
      for (const [index, tag] of (await tags.all()).entries()) {
        await expectReadableSurface(tag, `真实权限标签 ${index + 1}`)
      }
      await expectNoSeriousAccessibilityViolations(page, `${viewport.width}px 真实暗黑权限列表`)
      observed.listAxePassed = true
      await screenshot(page, info, 'permission-dark-list')
      observed.treeInteractions = await verifyPermissionTree(page, info, body.data[0].name)
      observed.treeAxePassed = true
      await expectCleanDiagnostics(page, diagnostics)
      expect(permissionMutations, '不得提交权限新增、同步、修改或删除请求').toEqual([])
      observed.completed = true
    } finally {
      const path = info.outputPath('permission-theme-observations.json')
      await writeFile(path, JSON.stringify(observed, null, 2), 'utf8')
      await info.attach('permission-theme-observations', { path, contentType: 'application/json' })
    }
  })
}
