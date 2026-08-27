import { describe, expect, it, vi } from 'vitest'
import type { MessageCatalog, MessageCatalogLoader } from '@/i18n/catalog'
import { createMessageCatalogCoordinator } from '@/i18n/lazyCatalog'
import { messageCatalogsForRoute } from '@/i18n/routeCatalogRegistry'

const catalog: MessageCatalog = {
  'zh-CN': { testCatalog: { value: '中文' } },
  'en-US': { testCatalog: { value: 'English' } },
}

describe('路由文案目录加载', () => {
  it('首次加载后重复请求不再调用 loader', async () => {
    const install = vi.fn()
    const load = vi.fn().mockResolvedValue(catalog)
    const coordinator = createMessageCatalogCoordinator(install)
    const loader: MessageCatalogLoader = { id: 'repeat', load }

    await coordinator.ensure(loader)
    await coordinator.ensure(loader)

    expect(load).toHaveBeenCalledTimes(1)
    expect(install).toHaveBeenCalledTimes(1)
  })

  it('同一 loader 的并发请求共享一个 pending', async () => {
    let finish: ((value: MessageCatalog) => void) | undefined
    const load = vi.fn(
      () =>
        new Promise<MessageCatalog>((resolve) => {
          finish = resolve
        }),
    )
    const install = vi.fn()
    const coordinator = createMessageCatalogCoordinator(install)
    const loader: MessageCatalogLoader = { id: 'concurrent', load }

    const first = coordinator.ensure(loader)
    const second = coordinator.ensure(loader)
    expect(second).toBe(first)
    expect(load).toHaveBeenCalledTimes(1)

    finish?.(catalog)
    await Promise.all([first, second])
    expect(install).toHaveBeenCalledTimes(1)
  })

  it('加载失败会清除 pending 并允许下次重试', async () => {
    const load = vi
      .fn<MessageCatalogLoader['load']>()
      .mockRejectedValueOnce(new Error('暂时失败'))
      .mockResolvedValueOnce(catalog)
    const install = vi.fn()
    const coordinator = createMessageCatalogCoordinator(install)
    const loader: MessageCatalogLoader = { id: 'retry', load }

    await expect(coordinator.ensure(loader)).rejects.toThrow('暂时失败')
    await expect(coordinator.ensure(loader)).resolves.toBeUndefined()

    expect(load).toHaveBeenCalledTimes(2)
    expect(install).toHaveBeenCalledTimes(1)
  })

  it('父级与具体 route namespace 自动叠加且去重', () => {
    expect(messageCatalogsForRoute('system.user').map((loader) => loader.id)).toEqual([
      'system',
      'platform-operations',
    ])
    expect(messageCatalogsForRoute('monitor.jobs').map((loader) => loader.id)).toEqual([
      'monitor-tools',
      'monitor-jobs',
    ])
    expect(messageCatalogsForRoute('unknown.route')).toEqual([])
  })
})
