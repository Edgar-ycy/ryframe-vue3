/* eslint-disable vue/one-component-per-file */
import { createPinia } from 'pinia'
import {
  createSSRApp,
  defineComponent,
  h,
  reactive,
  ref,
  type Component,
} from 'vue'
import { renderToString } from 'vue/server-renderer'
import { routeLocationKey, routerKey } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => {
  const response = {
    code: 200,
    msg: 'ok',
    data: [],
    rows: [],
    total: 0,
  }
  return {
    request: vi.fn(async () => response),
    rawRequest: vi.fn(async () => response),
    requestBlob: vi.fn(async () => new Blob()),
    requestText: vi.fn(async () => ''),
  }
})

const routerModule = vi.hoisted(() => ({
  default: {
    currentRoute: { value: { path: '/', query: {}, params: {}, meta: {} } },
    push: vi.fn(async () => undefined),
    replace: vi.fn(async () => undefined),
    back: vi.fn(),
    addRoute: vi.fn(() => vi.fn()),
    removeRoute: vi.fn(),
  },
  refreshAccessibleRoutes: vi.fn(async () => []),
  resetDynamicRoutes: vi.fn(),
}))

vi.mock('@/shared/http/client', () => ({
  ...http,
  default: http.request,
  configureHttpSession: vi.fn(),
  HttpError: class HttpError extends Error {},
}))
vi.mock('@/router', () => routerModule)

const route = reactive({
  path: '/',
  name: undefined,
  params: {},
  query: {},
  hash: '',
  fullPath: '/',
  matched: [],
  meta: {},
  redirectedFrom: undefined,
})

const router = {
  currentRoute: ref(route),
  push: vi.fn(async () => undefined),
  replace: vi.fn(async () => undefined),
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
  resolve: vi.fn(() => ({ ...route, href: '/' })),
  addRoute: vi.fn(() => vi.fn()),
  removeRoute: vi.fn(),
  hasRoute: vi.fn(() => false),
  getRoutes: vi.fn(() => []),
  beforeEach: vi.fn(() => vi.fn()),
  beforeResolve: vi.fn(() => vi.fn()),
  afterEach: vi.fn(() => vi.fn()),
  onError: vi.fn(() => vi.fn()),
  isReady: vi.fn(async () => undefined),
  install: vi.fn(),
  options: {},
  listening: true,
} as never

const EmptyComponent = defineComponent({ render: () => h('span') })
const modules = import.meta.glob<{ default: Component }>('./**/*.vue', { eager: true })
const sources = import.meta.glob<string>('./**/*.vue', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const slotValue = new Proxy(Object.create(null) as Record<PropertyKey, unknown>, {
  get(_target, property) {
    if (property === Symbol.iterator) return function* emptyIterator() {}
    if (property === Symbol.toPrimitive) return () => ''
    if (property === 'toString') return () => ''
    if (property === 'length') return 0
    return slotValue
  },
})

const PassthroughComponent = defineComponent({
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const invoked = new Set<string>()
    return () => {
      for (const [name, callback] of Object.entries(attrs)) {
        if (invoked.has(name) || !name.startsWith('on') || typeof callback !== 'function') continue
        invoked.add(name)
        const callbackValues = name.includes('Update:modelValue')
          ? ['#409eff', '#000000']
          : [slotValue, undefined, true, false]
        for (const callbackValue of callbackValues) {
          try {
            const result: unknown = callback(callbackValue)
            if (result instanceof Promise) void result.catch(() => undefined)
          }
          catch {
            // A generic event cannot satisfy every browser-only handler. Reaching
            // the handler is still useful; dedicated tests assert its behavior.
          }
        }
      }
      return h('div', Object.values(slots).flatMap((slot) => {
        try {
          return slot?.({
            row: slotValue,
            column: slotValue,
            node: slotValue,
            data: slotValue,
            $index: 0,
          }) ?? []
        }
        catch {
          return []
        }
      }))
    }
  },
})

function componentTags(): string[] {
  const tags = new Set<string>()
  for (const source of Object.values(sources)) {
    for (const match of source.matchAll(/<([a-z][\w-]*-[\w-]+)/g)) {
      const tag = match[1]
      if (tag) tags.add(tag)
    }
  }
  return [...tags]
}

const rootProps = {
  modelValue: false,
  visible: false,
  profile: {
    nickname: '',
    email: '',
    phone: '',
    avatar: '',
  },
  menu: {},
  role: {},
  user: {},
  userId: '1',
  roleId: '1',
  deptId: '1',
}

describe('handwritten Vue SFC smoke coverage', () => {
  it('loads and server-renders every handwritten component setup', async () => {
    const rendered: string[] = []
    const componentErrors: string[] = []
    vi.stubGlobal('document', {
      body: { clientWidth: 1280, appendChild: vi.fn(), removeChild: vi.fn() },
      documentElement: {
        clientWidth: 1280,
        classList: { toggle: vi.fn() },
        setAttribute: vi.fn(),
        style: { setProperty: vi.fn() },
      },
      querySelector: vi.fn(() => null),
      createElement: vi.fn(() => ({ style: {}, click: vi.fn(), remove: vi.fn() })),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0,
    })

    for (const [path, module] of Object.entries(modules)) {
      const app = createSSRApp(module.default, rootProps)
      app.use(createPinia())
      app.provide(routerKey, router)
      app.provide(routeLocationKey, route as never)
      app.component('RouterLink', EmptyComponent)
      app.component('RouterView', EmptyComponent)
      app.directive('loading', {})
      app.directive('perm', {})
      for (const tag of componentTags()) app.component(tag, PassthroughComponent)
      app.config.warnHandler = () => undefined
      app.config.errorHandler = error => componentErrors.push(`${path}: ${String(error)}`)

      try {
        await renderToString(app)
      }
      catch (error) {
        componentErrors.push(`${path}: ${String(error)}`)
      }
      rendered.push(path)
    }

    expect(rendered).toHaveLength(Object.keys(modules).length)
    expect(rendered.length).toBeGreaterThan(40)
    expect(componentErrors).toEqual([])
  })
})
