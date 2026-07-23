import { defineComponent, h, type Component } from 'vue'

export type RouteComponentModule = { default: Component }
export type RouteComponentLoader = () => Promise<RouteComponentModule>

/**
 * Give a lazy route page the exact name used by its route record.
 *
 * KeepAlive's `include` option matches a component's name, not the route name.
 * Page files in this project are generally named `index.vue`, so a stable named
 * wrapper is required for the tag cache to select the intended page.
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
