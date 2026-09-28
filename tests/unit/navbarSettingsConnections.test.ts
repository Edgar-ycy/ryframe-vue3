import { createPinia } from 'pinia'
import { renderToString } from 'vue/server-renderer'
import { computed, createSSRApp, h, ref, type FunctionalComponent } from 'vue'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import Navbar from '@/components/layout/Navbar/index.vue'

type EventAttributes = Record<string, unknown>

const scenario = vi.hoisted(() => ({
  settingsPanels: [] as EventAttributes[],
  setTheme: vi.fn(),
}))

vi.mock('@/app/settings/coordinator', () => ({ setTheme: scenario.setTheme }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/i18n', () => ({ translateNavigationTitle: (title: unknown) => String(title ?? '') }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ matched: [] }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('element-plus', () => ({ ElMessage: { warning: vi.fn() } }))
vi.mock('@/hooks/useAuthenticatedImage', async () => {
  const { ref: actualRef } = await vi.importActual<typeof import('vue')>('vue')
  return { useAuthenticatedImage: () => ({ imageSrc: actualRef('') }) }
})
vi.mock('@/utils/confirmAction', () => ({ confirmAction: vi.fn() }))
vi.mock('@/components/layout/Navbar/logoutAction', () => ({
  confirmAndLogoutCurrentSession: vi.fn(),
}))

function componentStub(tag: string): FunctionalComponent {
  const stub: FunctionalComponent = (props, { attrs, slots }) => {
    if (tag === 'settings-panel') scenario.settingsPanels.push({ ...props, ...attrs })
    return h(tag, attrs, slots.default?.())
  }
  stub.inheritAttrs = false
  return stub
}

vi.mock('@/components/layout/ExportCenter/index.vue', () => ({
  default: componentStub('exports'),
}))
vi.mock('@/components/layout/MessageCenter/index.vue', () => ({
  default: componentStub('messages'),
}))
vi.mock('@/components/layout/Settings/index.vue', () => ({
  default: componentStub('settings-panel'),
}))

const captured = {
  buttons: [] as EventAttributes[],
  switches: [] as EventAttributes[],
}
let settingsVisibleRef: { value: unknown } | undefined

function captureStub(bucket: EventAttributes[], tag = 'span'): FunctionalComponent {
  const stub: FunctionalComponent = (props, { attrs, slots }) => {
    bucket.push({ ...props, ...attrs })
    return h(tag, attrs, slots.default?.())
  }
  stub.inheritAttrs = false
  return stub
}

const passThrough: FunctionalComponent = (_props, { attrs, slots }) =>
  h('span', attrs, slots.default?.())
passThrough.inheritAttrs = false

async function renderNavbar(): Promise<void> {
  const app = createSSRApp(Navbar)
  app.use(createPinia())
  app.component('ElAvatar', passThrough)
  app.component('ElBreadcrumb', passThrough)
  app.component('ElBreadcrumbItem', passThrough)
  app.component('ElButton', captureStub(captured.buttons, 'button'))
  app.component('ElDropdown', passThrough)
  app.component('ElDropdownItem', passThrough)
  app.component('ElDropdownMenu', passThrough)
  app.component('ElIcon', passThrough)
  app.component('ElSwitch', captureStub(captured.switches))
  app.component('ElTag', passThrough)
  await renderToString(app)
}

async function invoke(attributes: EventAttributes, eventName: string, value?: unknown) {
  const handler = attributes[eventName]
  expect(handler).toBeTypeOf('function')
  await (handler as (event?: unknown) => unknown)(value)
}

function button(label: string): EventAttributes {
  const target = captured.buttons.find((attributes) => attributes['aria-label'] === label)
  expect(target, `找不到 ${label}`).toBeDefined()
  return target!
}

beforeAll(() => {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('ref', <T>(value: T) => {
    const created = ref(value)
    settingsVisibleRef = created
    return created
  })
})

afterAll(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  scenario.setTheme.mockClear()
  scenario.settingsPanels.length = 0
  captured.buttons.length = 0
  captured.switches.length = 0
  settingsVisibleRef = undefined
})

describe('导航栏 settings 接线', () => {
  it('按开关布尔值切换主题', async () => {
    await renderNavbar()
    expect(captured.switches).toHaveLength(1)

    await invoke(captured.switches[0]!, 'onUpdate:modelValue', true)
    await invoke(captured.switches[0]!, 'onUpdate:modelValue', false)

    expect(scenario.setTheme).toHaveBeenNthCalledWith(1, 'dark')
    expect(scenario.setTheme).toHaveBeenNthCalledWith(2, 'light')
  })

  it('设置按钮连接抽屉的可见状态', async () => {
    await renderNavbar()
    expect(scenario.settingsPanels).toHaveLength(1)
    expect(scenario.settingsPanels[0]?.modelValue).toBe(false)
    expect(settingsVisibleRef?.value).toBe(false)

    await invoke(button('navbar.openSettings'), 'onClick')
    expect(settingsVisibleRef?.value).toBe(true)
  })
})
