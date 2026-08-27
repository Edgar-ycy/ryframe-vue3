import type { MessageCatalogLoader } from './catalog'

function defineCatalogLoader(id: string, load: MessageCatalogLoader['load']): MessageCatalogLoader {
  return Object.freeze({ id, load })
}

export const messageCatalogLoaders = Object.freeze({
  account: defineCatalogLoader('account', () =>
    import('./catalog/account').then((module) => module.messageCatalog),
  ),
  'monitor-jobs': defineCatalogLoader('monitor-jobs', () =>
    import('./catalog/monitor-jobs').then((module) => module.messageCatalog),
  ),
  'monitor-tools': defineCatalogLoader('monitor-tools', () =>
    import('./catalog/monitor-tools').then((module) => module.messageCatalog),
  ),
  'platform-operations': defineCatalogLoader('platform-operations', () =>
    import('./catalog/platform-operations').then((module) => module.messageCatalog),
  ),
  'product-plans': defineCatalogLoader('product-plans', () =>
    import('./catalog/product-plans').then((module) => module.messageCatalog),
  ),
  'profile-service-delegations': defineCatalogLoader('profile-service-delegations', () =>
    import('./catalog/profile-service-delegations').then((module) => module.messageCatalog),
  ),
  'profile-sessions': defineCatalogLoader('profile-sessions', () =>
    import('./catalog/profile-sessions').then((module) => module.messageCatalog),
  ),
  'service-accounts': defineCatalogLoader('service-accounts', () =>
    import('./catalog/service-accounts').then((module) => module.messageCatalog),
  ),
  system: defineCatalogLoader('system', () =>
    import('./catalog/system').then((module) => module.messageCatalog),
  ),
  'tenant-capacity': defineCatalogLoader('tenant-capacity', () =>
    import('./catalog/tenant-capacity').then((module) => module.messageCatalog),
  ),
  'tenant-config-transfer': defineCatalogLoader('tenant-config-transfer', () =>
    import('./catalog/tenant-config-transfer').then((module) => module.messageCatalog),
  ),
  'tenant-data': defineCatalogLoader('tenant-data', () =>
    import('./catalog/tenant-data').then((module) => module.messageCatalog),
  ),
})

export type MessageCatalogName = keyof typeof messageCatalogLoaders

/** 路由命名空间是领域目录的唯一装配事实源；更具体的命名空间会叠加专用目录。 */
export const routeCatalogRegistry = Object.freeze({
  account: ['account'],
  'account.profile': ['profile-sessions', 'profile-service-delegations'],
  home: ['account', 'platform-operations'],
  monitor: ['monitor-tools'],
  'monitor.jobs': ['monitor-jobs'],
  'monitor.overview': ['platform-operations'],
  'monitor.retention': ['platform-operations'],
  'monitor.schedules': ['monitor-jobs'],
  'platform.data-targets': ['tenant-data'],
  'platform.product-plans': ['product-plans'],
  'platform.tenant': ['product-plans', 'tenant-capacity', 'tenant-data'],
  system: ['system'],
  'system.authorization-diagnostics': ['platform-operations'],
  'system.config-transfer': ['tenant-config-transfer'],
  'system.logininfor': ['monitor-tools'],
  'system.operlog': ['monitor-tools'],
  'system.service-accounts': ['service-accounts'],
  'system.user': ['platform-operations'],
} satisfies Readonly<Record<string, readonly MessageCatalogName[]>>)

/** 按父到子命名空间合并默认目录，并保持首次声明顺序。 */
export function messageCatalogsForRoute(routeNamespace: string): readonly MessageCatalogLoader[] {
  const catalogNames = new Set<MessageCatalogName>()
  for (const [namespace, names] of Object.entries(routeCatalogRegistry)) {
    if (routeNamespace !== namespace && !routeNamespace.startsWith(`${namespace}.`)) continue
    for (const name of names) catalogNames.add(name)
  }
  return [...catalogNames].map((name) => messageCatalogLoaders[name])
}
