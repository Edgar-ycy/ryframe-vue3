import type { RouteComponentLoader } from '@/shared/navigation/routeComponent'
import { i18n } from '@/i18n'
import type { MessageCatalog, MessageCatalogLoader } from './catalog'

const installedCatalogs = new WeakSet<MessageCatalog>()

function installMessageCatalog(catalog: MessageCatalog): void {
  if (installedCatalogs.has(catalog)) return
  i18n.global.mergeLocaleMessage('zh-CN', catalog['zh-CN'])
  i18n.global.mergeLocaleMessage('en-US', catalog['en-US'])
  installedCatalogs.add(catalog)
}

/** 页面与领域文案并行加载，并在组件初始化前完成注册。 */
export function withMessageCatalogs(
  page: RouteComponentLoader,
  catalogs: readonly MessageCatalogLoader[] | undefined,
): RouteComponentLoader {
  if (!catalogs?.length) return page
  return async () => {
    const [component, ...messages] = await Promise.all([page(), ...catalogs.map((load) => load())])
    for (const catalog of messages) installMessageCatalog(catalog)
    return component
  }
}
