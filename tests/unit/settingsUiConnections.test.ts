import { createPinia } from 'pinia'
import { renderToString } from 'vue/server-renderer'
import { createSSRApp, h, type FunctionalComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from '@/components/layout/Settings/index.vue'

type EventAttributes = Record<string, unknown>

const actions = vi.hoisted(() => ({
  resetSettings: vi.fn(),
  setComponentSize: vi.fn(),
  setLocale: vi.fn(),
  setTheme: vi.fn(),
  setThemeColor: vi.fn(),
  toggleSidebarLogo: vi.fn(),
  toggleTagsView: vi.fn(),
}))

vi.mock('@/app/settings/coordinator', () => actions)
vi.mock('@/api/modules/auth', () => ({ updateProfile: vi.fn() }))
vi.mock('@/app/messages/messageController', () => ({
  messageController: { restartConnection: vi.fn() },
}))
vi.mock('@/shared/query/useServerStateMutation', () => ({
  useServerStateMutation: () => ({ mutateAsync: vi.fn(), pending: { value: false } }),
}))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values?.color ? `${key}:${String(values.color)}` : key,
  }),
}))
vi.mock('@/i18n', () => ({
  normalizeLocale: (value: unknown) => {
    if (value === 'zh-CN' || value === 'en-US') return value
    return undefined
  },
}))

const captured = {
  buttons: [] as EventAttributes[],
  colorPickers: [] as EventAttributes[],
  radioGroups: [] as EventAttributes[],
  switches: [] as EventAttributes[],
}

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

async function renderSettings(): Promise<string> {
  const app = createSSRApp(Settings, { modelValue: true })
  app.use(createPinia())
  app.component('ElButton', captureStub(captured.buttons, 'button'))
  app.component('ElColorPicker', captureStub(captured.colorPickers))
  app.component('ElDivider', passThrough)
  app.component('ElDrawer', passThrough)
  app.component('ElRadioButton', passThrough)
  app.component('ElRadioGroup', captureStub(captured.radioGroups))
  app.component('ElSwitch', captureStub(captured.switches))
  return renderToString(app)
}

async function invoke(
  attributes: EventAttributes,
  eventName: string,
  value?: unknown,
): Promise<void> {
  const handler = attributes[eventName]
  expect(handler).toBeTypeOf('function')
  await (handler as (event?: unknown) => unknown)(value)
}

beforeEach(() => {
  vi.clearAllMocks()
  captured.buttons.length = 0
  captured.colorPickers.length = 0
  captured.radioGroups.length = 0
  captured.switches.length = 0
})

describe('settings 界面调用连接', () => {
  it('设置抽屉把合法输入交给 coordinator，并拒绝无效枚举值', async () => {
    await renderSettings()
    expect(captured.radioGroups).toHaveLength(3)
    expect(captured.switches).toHaveLength(2)

    await invoke(captured.radioGroups[0]!, 'onChange', 'en-US')
    await invoke(captured.radioGroups[0]!, 'onChange', 'fr-FR')
    expect(actions.setLocale).toHaveBeenCalledOnce()
    expect(actions.setLocale).toHaveBeenCalledWith('en-US')

    await invoke(captured.radioGroups[1]!, 'onChange', 'dark')
    await invoke(captured.radioGroups[1]!, 'onChange', 'contrast')
    expect(actions.setTheme).toHaveBeenCalledOnce()
    expect(actions.setTheme).toHaveBeenCalledWith('dark')

    await invoke(captured.radioGroups[2]!, 'onChange', 'small')
    await invoke(captured.radioGroups[2]!, 'onChange', 'compact')
    expect(actions.setComponentSize).toHaveBeenCalledOnce()
    expect(actions.setComponentSize).toHaveBeenCalledWith('small')

    await invoke(captured.switches[0]!, 'onChange', false)
    await invoke(captured.switches[1]!, 'onChange', false)
    expect(actions.toggleTagsView).toHaveBeenCalledOnce()
    expect(actions.toggleSidebarLogo).toHaveBeenCalledOnce()

    expect(captured.buttons).toHaveLength(1)
    await invoke(captured.buttons[0]!, 'onClick')
    expect(actions.resetSettings).toHaveBeenCalledOnce()
  })

  it('主题色选择器转发有效颜色、忽略空颜色并保留预设按钮语义', async () => {
    const html = await renderSettings()
    expect(captured.colorPickers).toHaveLength(1)

    await invoke(captured.colorPickers[0]!, 'onUpdate:modelValue', '#22C55E')
    await invoke(captured.colorPickers[0]!, 'onUpdate:modelValue', null)

    expect(actions.setThemeColor).toHaveBeenCalledOnce()
    expect(actions.setThemeColor).toHaveBeenCalledWith('#22C55E')
    expect(html.match(/type="button"/g)).toHaveLength(10)
    expect(html.match(/aria-label="settings\.selectThemeColor:/g)).toHaveLength(10)
    expect(html.match(/aria-pressed="(?:true|false)"/g)).toHaveLength(10)
  })
})
