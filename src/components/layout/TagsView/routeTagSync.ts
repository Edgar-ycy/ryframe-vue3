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
  })
}

/** Register tag synchronization and return the router-provided cleanup callback. */
export function installRouteTagSync(
  router: Pick<Router, 'afterEach'>,
  currentRoute: TagRoute,
  addView: (view: TagView) => void,
): () => void {
  addRouteTag(currentRoute, addView)
  return router.afterEach(to => addRouteTag(to, addView))
}
