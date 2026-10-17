import { ElInput, ElInputNumber, ElRadio, ElRadioGroup } from 'element-plus'
import { createSSRApp, h, type Component, type FunctionalComponent } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import FlatCrudFormDialog from '@/components/business/flat-crud/FlatCrudFormDialog.vue'
import type { FlatCrudFormField } from '@/components/business/flat-crud/model'

vi.mock('@/shared/query/pageOperationScope', () => ({
  beginServerStatePageOperation: vi.fn(),
}))

interface FormModel {
  code: string
  count: number
  enabled: boolean
}

type ControlKind = 'text' | 'number' | 'radio'
type Attributes = Record<string, unknown>

const captured: Record<ControlKind, Attributes> = { text: {}, number: {}, radio: {} }
const initialForm: FormModel = { code: '初始编码', count: 5, enabled: true }

const passThrough: FunctionalComponent = (_props, { slots }) => h('section', slots.default?.())
passThrough.inheritAttrs = false

function captureControl(kind: ControlKind, component: Component): FunctionalComponent {
  const control: FunctionalComponent = (_props, { attrs, slots }) => {
    captured[kind] = { ...attrs }
    return h(component, attrs, slots)
  }
  control.inheritAttrs = false
  return control
}

function fields(disabledOnEdit: boolean): readonly FlatCrudFormField<FormModel>[] {
  const editingPolicy = disabledOnEdit ? { disabledOnEdit: true } : {}
  return [
    { key: 'code', kind: 'text', label: '编码', placeholder: '请输入编码', ...editingPolicy },
    { key: 'count', kind: 'number', label: '数量', min: 0, max: 100, ...editingPolicy },
    {
      key: 'enabled',
      kind: 'radio',
      label: '状态',
      options: [
        { label: '启用', value: true },
        { label: '停用', value: false },
      ],
      ...editingPolicy,
    },
  ]
}

async function renderForm(editing: boolean, disabledOnEdit: boolean, editableKind?: ControlKind) {
  const update = vi.fn<(value: FormModel) => void>()
  const app = createSSRApp({
    render: () =>
      h(FlatCrudFormDialog<FormModel>, {
        editing,
        fields: fields(disabledOnEdit).map((field) =>
          field.kind === editableKind ? { ...field, disabledOnEdit: false } : field,
        ),
        labels: { cancel: '取消', confirm: '确定' },
        modelValue: initialForm,
        permissions: { create: 'item:create', update: 'item:update' },
        saving: false,
        title: editing ? '编辑' : '新建',
        visible: true,
        'onUpdate:modelValue': update,
      }),
  })
  for (const name of ['ElDialog', 'ElForm', 'ElFormItem']) app.component(name, passThrough)
  app.component('ElInput', captureControl('text', ElInput))
  app.component('ElInputNumber', captureControl('number', ElInputNumber))
  app.component('ElRadioGroup', captureControl('radio', ElRadioGroup))
  app.component('ElRadio', ElRadio)
  return { html: await renderToString(app), update }
}

function updateControl(kind: ControlKind, value: string | number | boolean): void {
  const handler = captured[kind]['onUpdate:modelValue']
  if (typeof handler !== 'function') throw new Error(`找不到 ${kind} 控件的更新入口`)
  ;(handler as (value: string | number | boolean) => void)(value)
}

beforeEach(() => {
  captured.text = {}
  captured.number = {}
  captured.radio = {}
})

describe('平面 CRUD 表单的创建专用字段', () => {
  it.each([
    { name: '新建时创建专用字段可输入', editing: false, disabledOnEdit: true },
    { name: '编辑时可更新字段仍可输入', editing: true, disabledOnEdit: false },
  ])('$name', async ({ editing, disabledOnEdit }) => {
    const { html, update } = await renderForm(editing, disabledOnEdit)
    expect(html).not.toMatch(/<input\b[^>]*\sdisabled(?:\s|=|>)/u)
    for (const kind of ['text', 'number', 'radio'] as const) {
      expect(Boolean(captured[kind].disabled)).toBe(false)
    }

    updateControl('text', '新编码')
    updateControl('number', 12)
    updateControl('radio', false)
    expect(update.mock.calls.map(([form]) => form)).toEqual([
      { ...initialForm, code: '新编码' },
      { ...initialForm, count: 12 },
      { ...initialForm, enabled: false },
    ])
    expect(initialForm).toEqual({ code: '初始编码', count: 5, enabled: true })
  })

  it('编辑时文本、数字与枚举控件均禁用，且拒绝迟到的更新事件', async () => {
    const { html, update } = await renderForm(true, true)
    expect(html.match(/<input\b[^>]*\sdisabled(?:\s|=|>)/gu)?.length).toBeGreaterThanOrEqual(3)
    for (const kind of ['text', 'number', 'radio'] as const) {
      expect(captured[kind].disabled).toBe(true)
    }

    updateControl('text', '不应回写')
    updateControl('number', 99)
    updateControl('radio', false)
    expect(update).not.toHaveBeenCalled()
    expect(initialForm).toEqual({ code: '初始编码', count: 5, enabled: true })
  })

  it.each(['text', 'number', 'radio'] as const)(
    '同一编辑表单按字段区分只读状态，%s 可更新字段保持可输入',
    async (editableKind) => {
      const { update } = await renderForm(true, true, editableKind)
      for (const kind of ['text', 'number', 'radio'] as const) {
        expect(captured[kind].disabled).toBe(kind !== editableKind)
      }

      updateControl('text', '新编码')
      updateControl('number', 12)
      updateControl('radio', false)
      const changed = { text: { code: '新编码' }, number: { count: 12 }, radio: { enabled: false } }
      expect(update).toHaveBeenCalledExactlyOnceWith({ ...initialForm, ...changed[editableKind] })
    },
  )
})
