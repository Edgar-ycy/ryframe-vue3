import type { RouteComponentLoader } from '@/shared/navigation/routeComponent'
import { i18n } from '@/i18n'
import type { MessageCatalog, MessageCatalogLoader } from './catalog'
import { messageCatalogsForRoute } from './routeCatalogRegistry'

export interface MessageCatalogCoordinator {
  ensure(loader: MessageCatalogLoader): Promise<void>
}

/** 同一目录只安装一次；并发共享 pending，失败后删除 pending 以允许重试。 */
export function createMessageCatalogCoordinator(
  install: (catalog: MessageCatalog) => void,
): MessageCatalogCoordinator {
  const installed = new Set<string>()
  const pending = new Map<string, Promise<void>>()

  return {
    ensure(loader) {
      if (installed.has(loader.id)) return Promise.resolve()
      const active = pending.get(loader.id)
      if (active) return active

      const request = loader
        .load()
        .then((catalog) => {
          install(catalog)
          installed.add(loader.id)
        })
        .finally(() => {
          if (pending.get(loader.id) === request) pending.delete(loader.id)
        })
      pending.set(loader.id, request)
      return request
    },
  }
}

const applicationCatalogs = createMessageCatalogCoordinator((catalog) => {
  i18n.global.mergeLocaleMessage('zh-CN', catalog['zh-CN'])
  i18n.global.mergeLocaleMessage('en-US', catalog['en-US'])
})

export function ensureRouteMessageCatalogs(routeNamespace: string): Promise<void> {
  const loaders = messageCatalogsForRoute(routeNamespace)
  return Promise.all(loaders.map((loader) => applicationCatalogs.ensure(loader))).then(
    () => undefined,
  )
}

/** 页面与路由命名空间目录并行加载，并在组件初始化前完成注册。 */
export function withRouteMessageCatalogs(
  routeNamespace: string,
  page: RouteComponentLoader,
): RouteComponentLoader {
  const catalogs = messageCatalogsForRoute(routeNamespace)
  if (catalogs.length === 0) return page
  return async () => {
    const [component] = await Promise.all([page(), ensureRouteMessageCatalogs(routeNamespace)])
    return component
  }
}
