import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('@/shared/http/client', () => ({ default: http.request }))

import { getNotice, listNotice } from '@/api/modules/notice'
import { getPost, listPost } from '@/api/modules/post'
import { getConfig, listConfig } from '@/api/modules/config'
import { getDept, getDeptTree } from '@/api/modules/dept'
import { listDictData, listDictType } from '@/api/modules/dict'
import { getMenuTree } from '@/api/modules/menu'
import { listTenants } from '@/api/modules/tenant'

describe('列表请求取消信号', () => {
  beforeEach(() => {
    http.request.mockReset().mockResolvedValue({
      code: 200,
      message: 'ok',
      request_id: 'test',
    })
  })

  it('公告和岗位列表把 AbortSignal 传递到 Axios 边界', async () => {
    const controller = new AbortController()

    await listNotice({ page: 1, page_size: 10 }, controller.signal)
    await listPost({ page: 1, page_size: 10 }, controller.signal)
    await getNotice('notice-1', controller.signal)
    await getPost('post-1', controller.signal)

    expect(http.request).toHaveBeenNthCalledWith(1, expect.objectContaining({
      url: '/system/notices',
      signal: controller.signal,
    }))
    expect(http.request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: '/system/posts',
      signal: controller.signal,
    }))
    expect(http.request).toHaveBeenNthCalledWith(3, expect.objectContaining({
      url: '/system/notices/notice-1',
      signal: controller.signal,
    }))
    expect(http.request).toHaveBeenNthCalledWith(4, expect.objectContaining({
      url: '/system/posts/post-1',
      signal: controller.signal,
    }))
  })

  it('参数配置和租户读取把 AbortSignal 传递到 Axios 边界', async () => {
    const controller = new AbortController()

    await listConfig({ page: 1, page_size: 10 }, controller.signal)
    await getConfig('config-1', controller.signal)
    await listTenants(controller.signal)

    for (const [index, url] of [
      '/system/configs',
      '/system/configs/config-1',
      '/platform/tenants',
    ].entries()) {
      expect(http.request).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({
        url,
        signal: controller.signal,
      }))
    }
  })

  it('菜单、部门和字典读取把 AbortSignal 传递到 Axios 边界', async () => {
    const controller = new AbortController()

    await getMenuTree(controller.signal)
    await getDeptTree(controller.signal)
    await getDept('dept-1', controller.signal)
    await listDictType({ page: 1, page_size: 10 }, controller.signal)
    await listDictData({ type_code: 'status' }, controller.signal)

    for (const [index, url] of [
      '/system/menus/tree',
      '/system/depts/tree',
      '/system/depts/dept-1',
      '/system/dict/types',
      '/system/dict/data',
    ].entries()) {
      expect(http.request).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({
        url,
        signal: controller.signal,
      }))
    }
  })
})
