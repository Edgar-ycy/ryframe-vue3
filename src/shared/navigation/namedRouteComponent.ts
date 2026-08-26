import { defineComponent, h, type Component } from 'vue'
import type { RouteComponentLoader } from '@/shared/navigation/routeComponent'

export type { RouteComponentLoader, RouteComponentModule } from '@/shared/navigation/routeComponent'

/**
 * 为懒加载路由页面指定与其路由记录完全一致的名称。
 *
 * KeepAlive 的 `include` 选项匹配的是组件名称，而不是路由名称。
 * 本项目的页面文件通常名为 `index.vue`，因此标签缓存需要稳定的具名包装组件
 * 才能选中目标页面。
 */
export function withRouteComponentName(
  name: string,
  load: RouteComponentLoader,
): () => Promise<Component> {
  let namedComponent: Promise<Component> | undefined

  return () => {
    if (!namedComponent) {
      const loading = load().then(({ default: component }) => defineComponent({
        name,
        inheritAttrs: false,
        setup(_props, { attrs, slots }) {
          return () => h(component, attrs, slots)
        },
      }))
      namedComponent = loading
      void loading.catch(() => {
        if (namedComponent === loading) namedComponent = undefined
      })
    }

    return namedComponent
  }
}
