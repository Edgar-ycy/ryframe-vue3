import type { RouteLocationNormalized, Router } from 'vue-router'
import type { TagView } from '@/stores/tagsView'

type TagRoute = Pick<RouteLocationNormalized, 'meta' | 'name' | 'path'>

function addRouteTag(route: TagRoute, addView: (view: TagView) => void): void {
  if (!route.name) return
  addView({
    path: route.path,
    name: String(route.name),
    title: typeof route.meta.title === 'string' ? route.meta.title : undefined,
    affix: route.meta.affix === true,
    noCache: route.meta.noCache === true,
    requiredCapabilities: route.meta.requiredCapabilities,
  })
}

/** 注册标签同步，并返回路由器提供的清理回调。 */
export function installRouteTagSync(
  router: Pick<Router, 'afterEach'>,
  currentRoute: TagRoute,
  addView: (view: TagView) => void,
): () => void {
  addRouteTag(currentRoute, addView)
  return router.afterEach((to) => addRouteTag(to, addView))
}
