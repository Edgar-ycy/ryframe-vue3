import { expect, type Locator, type Page } from '@playwright/test'
import type { DeptNode } from '@/api/modules/dept'
import type { PermissionTreeNode } from '@/api/modules/permission'
import { installApiFixture } from './apiFixture'
import { fixtureRequest, fulfillJson } from './http'
import { createSessionContext } from './sessionFixture'
import type { BrowserDiagnostics } from './types'

export const permissionRows: PermissionTreeNode[] = [
  {
    id: '3101',
    name: '主题菜单权限',
    code: 'system:theme:menu',
    parent_id: null,
    perm_type: 'menu',
    sort: 1,
    status: '1',
    children: [],
  },
  {
    id: '3102',
    name: '主题接口权限',
    code: 'system:theme:read',
    parent_id: null,
    perm_type: 'api',
    sort: 2,
    status: '1',
    children: [],
  },
  {
    id: '3103',
    name: '停用接口权限',
    code: 'system:theme:disabled',
    parent_id: null,
    perm_type: 'api',
    sort: 3,
    status: '0',
    children: [],
  },
]

export async function installPermissionThemeFixture(
  page: Page,
  diagnostics: BrowserDiagnostics,
): Promise<{ permissionRequests: string[] }> {
  const options = { tenantId: 'system', multiTenancyEnabled: false } as const
  await installApiFixture(page, diagnostics, options)
  const context = createSessionContext(options)
  context.permissions.push(
    'system:perm:list',
    'system:perm:add',
    'system:perm:edit',
    'system:perm:remove',
  )
  const systemMenu = context.menus.find((menu) => menu.route_key === 'system')
  if (!systemMenu) throw new Error('会话 fixture 缺少系统菜单')
  systemMenu.children.push({
    children: [],
    icon: '',
    id: '103',
    menu_type: 'C',
    name: 'system.perm',
    parent_id: systemMenu.id,
    perm_code: 'system:perm:list',
    route_key: 'system.perm',
    sort: 3,
    status: '1',
    visible: true,
  })
  const departments: DeptNode[] = []
  const permissionRequests: string[] = []
  const paths = new Set([
    '/auth/login',
    '/auth/context',
    '/system/perms/tree',
    '/system/depts/tree',
  ])
  await page.route('**/api/v1/**', async (route) => {
    const { path, method, request, url } = fixtureRequest(route)
    if (!paths.has(path)) {
      await route.fallback()
      return
    }
    expect(method, `局部 fixture 不接受 ${method} ${path}`).toBe(
      path === '/auth/login' ? 'POST' : 'GET',
    )
    expect(url.search, `局部 fixture 不接受额外查询参数：${path}`).toBe('')
    if (path === '/auth/login') {
      const body: unknown = request.postDataJSON()
      expect(body).toMatchObject({ username: 'tester', password: 'browser-secret' })
      expect(request.headers()['x-csrf-token']).toBe('csrf-smoke')
      await fulfillJson(route, {
        access_token: 'access-token-smoke',
        expires_in: 900,
        session_context: context,
      })
    } else if (path === '/auth/context') {
      await fulfillJson(route, context)
    } else if (path === '/system/perms/tree') {
      permissionRequests.push(request.url())
      await fulfillJson(route, permissionRows)
    } else {
      await fulfillJson(route, departments)
    }
  })
  return { permissionRequests }
}

export async function expectReadableSurface(target: Locator, label: string): Promise<void> {
  await expect(target, label).toBeVisible()
  await expect
    .poll(
      async () => {
        const colors = await target.evaluate((element) => {
          const canvas = document.createElement('canvas')
          canvas.width = 1
          canvas.height = 1
          const painter = canvas.getContext('2d', { willReadFrequently: true })
          if (!painter) throw new Error('无法读取浏览器颜色')
          function rgba(color: string): number[] {
            if (!painter) throw new Error('颜色画布不可用')
            if (!CSS.supports('color', color)) throw new Error(`不支持的计算颜色：${color}`)
            painter.clearRect(0, 0, 1, 1)
            painter.fillStyle = color
            painter.fillRect(0, 0, 1, 1)
            return Array.from(painter.getImageData(0, 0, 1, 1).data)
          }
          function composite(top: number[], bottom: number[]): number[] {
            const alpha = top[3] / 255
            return top.slice(0, 3).map((channel, index) => {
              return channel * alpha + bottom[index] * (1 - alpha)
            })
          }
          function luminance(color: number[]): number {
            const linear = color.map((channel) => {
              const normalized = channel / 255
              return normalized <= 0.04045
                ? normalized / 12.92
                : ((normalized + 0.055) / 1.055) ** 2.4
            })
            return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
          }
          const ancestors: Element[] = []
          for (let node: Element | null = element; node; node = node.parentElement) {
            ancestors.unshift(node)
          }
          // 先合成祖先底色，再合成半透明文字，避免只检查 CSS 变量声明。
          let background = [255, 255, 255]
          let stable = true
          for (const ancestor of ancestors) {
            const style = getComputedStyle(ancestor)
            if (style.backgroundImage !== 'none') {
              throw new Error('颜色采样遇到图片背景，不能推断对比度')
            }
            if (Number(style.opacity) !== 1) stable = false
            background = composite(rgba(style.backgroundColor), background)
          }
          if (!stable) return null
          const foreground = composite(rgba(getComputedStyle(element).color), background)
          const backgroundLuminance = luminance(background)
          const foregroundLuminance = luminance(foreground)
          return {
            background,
            foreground,
            backgroundLuminance,
            contrast:
              (Math.max(backgroundLuminance, foregroundLuminance) + 0.05) /
              (Math.min(backgroundLuminance, foregroundLuminance) + 0.05),
          }
        })
        if (colors === null) {
          return { readable: false, darkBackground: false, measured: '过渡中' }
        }
        return {
          readable: colors.contrast >= 4.5,
          darkBackground: colors.backgroundLuminance < 0.5,
          measured: JSON.stringify(colors),
        }
      },
      { message: `${label} 应使用暗色底，实际文字对比度至少为 4.5` },
    )
    .toMatchObject({ readable: true, darkBackground: true })
}
