/* eslint-disable vue/one-component-per-file, vue/component-definition-name-casing */
import {
  createRenderer,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  type Component,
} from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { withRouteComponentName } from './namedRouteComponent'
import { constantRoutes } from './routes/constant'

interface HostNode {
  type: string
  parent: HostNode | null
  children: HostNode[]
  text?: string
}

function insertNode(child: HostNode, parent: HostNode, anchor?: HostNode | null): void {
  if (child.parent) {
    const oldIndex = child.parent.children.indexOf(child)
    if (oldIndex >= 0) child.parent.children.splice(oldIndex, 1)
  }

  child.parent = parent
  const anchorIndex = anchor ? parent.children.indexOf(anchor) : -1
  if (anchorIndex >= 0) parent.children.splice(anchorIndex, 0, child)
  else parent.children.push(child)
}

const renderer = createRenderer<HostNode, HostNode>({
  patchProp: () => undefined,
  insert: insertNode,
  remove(child) {
    if (!child.parent) return
    const index = child.parent.children.indexOf(child)
    if (index >= 0) child.parent.children.splice(index, 1)
    child.parent = null
  },
  createElement: type => ({ type, parent: null, children: [] }),
  createText: text => ({ type: 'text', parent: null, children: [], text }),
  createComment: text => ({ type: 'comment', parent: null, children: [], text }),
  setText(node, text) {
    node.text = text
  },
  setElementText(node, text) {
    node.text = text
    node.children = []
  },
  parentNode: node => node.parent,
  nextSibling(node) {
    if (!node.parent) return null
    const index = node.parent.children.indexOf(node)
    return node.parent.children[index + 1] ?? null
  },
  insertStaticContent(content, parent, anchor) {
    const node: HostNode = { type: 'static', parent: null, children: [], text: content }
    insertNode(node, parent, anchor)
    return [node, node]
  },
})

function componentName(component: Component): string | undefined {
  return (component as unknown as { name?: string }).name
}

function trackedPage(label: string, events: string[]): Component {
  return defineComponent({
    name: 'index',
    setup() {
      onMounted(() => events.push(`${label}:mounted`))
      onActivated(() => events.push(`${label}:activated`))
      onDeactivated(() => events.push(`${label}:deactivated`))
      onUnmounted(() => events.push(`${label}:unmounted`))
      return () => h('main', label)
    },
  })
}

describe('withRouteComponentName', () => {
  it('loads once and gives the wrapper the exact route name', async () => {
    const load = vi.fn(async () => ({ default: defineComponent({ name: 'index' }) }))
    const loadNamedPage = withRouteComponentName('SystemUsers', load)

    const first = await loadNamedPage()
    const second = await loadNamedPage()

    expect(load).toHaveBeenCalledOnce()
    expect(second).toBe(first)
    expect(componentName(first)).toBe('SystemUsers')
  })

  it('retries after a failed chunk load and memoizes the later success', async () => {
    let attempts = 0
    const load = vi.fn(async () => {
      attempts += 1
      if (attempts === 1) throw new Error('temporary chunk failure')
      return { default: defineComponent({ name: 'index' }) }
    })
    const loadNamedPage = withRouteComponentName('RetryablePage', load)

    await expect(loadNamedPage()).rejects.toThrow('temporary chunk failure')
    const recovered = await loadNamedPage()

    expect(componentName(recovered)).toBe('RetryablePage')
    expect(await loadNamedPage()).toBe(recovered)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('preserves real KeepAlive mount, activate, deactivate, and prune semantics', async () => {
    const events: string[] = []
    const routeA = await withRouteComponentName(
      'RouteA',
      async () => ({ default: trackedPage('a', events) }),
    )()
    const routeB = await withRouteComponentName(
      'RouteB',
      async () => ({ default: trackedPage('b', events) }),
    )()
    const active = ref<'a' | 'b'>('a')
    const included = ref(['RouteA', 'RouteB'])
    const root = defineComponent({
      setup() {
        return () => h(KeepAlive, { include: included.value }, {
          default: () => h(active.value === 'a' ? routeA : routeB, { key: active.value }),
        })
      },
    })
    const container: HostNode = { type: 'root', parent: null, children: [] }
    const app = renderer.createApp(root)

    app.mount(container)
    await nextTick()
    expect(events).toEqual(['a:mounted', 'a:activated'])

    active.value = 'b'
    await nextTick()
    expect(events).toEqual([
      'a:mounted',
      'a:activated',
      'a:deactivated',
      'b:mounted',
      'b:activated',
    ])

    active.value = 'a'
    await nextTick()
    expect(events.filter(event => event === 'a:mounted')).toHaveLength(1)
    expect(events.slice(-2)).toEqual(['b:deactivated', 'a:activated'])

    included.value = ['RouteA']
    await nextTick()
    expect(events.at(-1)).toBe('b:unmounted')

    app.unmount()
    expect(events).toContain('a:unmounted')
  })

  it('names every static page component after its route record', async () => {
    const namedRoutes = constantRoutes.flatMap(route => [route, ...(route.children ?? [])])
      .filter(route => route.name && route.component)

    for (const route of namedRoutes) {
      const load = route.component as unknown as () => Promise<Component>
      const component = await load()
      expect(componentName(component), String(route.path)).toBe(String(route.name))
    }
  })
})
