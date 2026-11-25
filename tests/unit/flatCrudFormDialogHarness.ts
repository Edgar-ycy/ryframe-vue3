import type { FormItemRule, FormRules } from 'element-plus'
import { ElInput } from 'element-plus/es/components/input/index'
import { ElInputNumber } from 'element-plus/es/components/input-number/index'
import { ElRadio, ElRadioGroup } from 'element-plus/es/components/radio/index'
import { createSSRApp, h, type Component, type FunctionalComponent } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { vi } from 'vitest'

import FlatCrudFormDialog from '@/components/business/flat-crud/FlatCrudFormDialog.vue'
import type { FlatCrudFormField, FlatCrudScalar } from '@/components/business/flat-crud/model'

export interface FormModel {
  active: boolean
  code: string
  count: number
  description: string
  enabled: boolean
  metadata: string
  occurredAt: string
  publishedOn: string
}

export type ControlKind =
  'text' | 'number' | 'radio' | 'textarea' | 'switch' | 'date' | 'dateTime' | 'json'

type Attributes = Record<string, unknown>

function emptyCaptures(): Record<ControlKind, Attributes> {
  return {
    text: {},
    number: {},
    radio: {},
    textarea: {},
    switch: {},
    date: {},
    dateTime: {},
    json: {},
  }
}

let captured = emptyCaptures()
let formRules: FormRules = {}

export const initialForm: Readonly<FormModel> = {
  active: true,
  code: '初始编码',
  count: 5,
  description: '初始说明',
  enabled: true,
  metadata: '{"name":"初始配置"}',
  occurredAt: '2026-10-18T09:30:00.000Z',
  publishedOn: '2026-10-18',
}

const passThrough: FunctionalComponent = (_props, { slots }) => h('section', slots.default?.())
passThrough.inheritAttrs = false

const captureForm: FunctionalComponent<{ rules: FormRules }> = (props, { slots }) => {
  formRules = props.rules
  return h('form', slots.default?.())
}
captureForm.inheritAttrs = false

function captureControl(kind: ControlKind, component: Component): FunctionalComponent {
  const control: FunctionalComponent = (_props, { attrs, slots }) => {
    captured[kind] = { ...attrs }
    return h(component, attrs, slots)
  }
  control.inheritAttrs = false
  return control
}

const captureInput: FunctionalComponent = (_props, { attrs, slots }) => {
  const kind: ControlKind =
    attrs.type !== 'textarea'
      ? 'text'
      : String(attrs.class ?? '').includes('json-input')
        ? 'json'
        : 'textarea'
  captured[kind] = { ...attrs }
  return h(ElInput, attrs, slots)
}
captureInput.inheritAttrs = false

const captureDate: FunctionalComponent = (_props, { attrs }) => {
  const kind: ControlKind = attrs.type === 'datetime' ? 'dateTime' : 'date'
  captured[kind] = { ...attrs }
  return h('span', { 'data-control': kind })
}
captureDate.inheritAttrs = false

const captureSwitch: FunctionalComponent = (_props, { attrs }) => {
  captured.switch = { ...attrs }
  return h('span', { 'data-control': 'switch' })
}
captureSwitch.inheritAttrs = false

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
    {
      key: 'description',
      kind: 'textarea',
      label: '描述',
      placeholder: '请输入描述',
      ...editingPolicy,
    },
    { key: 'active', kind: 'switch', label: '活跃', ...editingPolicy },
    {
      key: 'publishedOn',
      kind: 'date',
      label: '发布日期',
      placeholder: '请选择日期',
      ...editingPolicy,
    },
    {
      key: 'occurredAt',
      kind: 'date_time',
      label: '发生时间',
      placeholder: '请选择时间',
      ...editingPolicy,
    },
    {
      key: 'metadata',
      kind: 'json',
      label: '配置',
      placeholder: '请输入配置',
      requiredMessage: '请输入配置',
      invalidMessage: '配置必须是合法 JSON',
      ...editingPolicy,
    },
  ]
}

export async function renderForm(
  editing: boolean,
  disabledOnEdit: boolean,
  editableKind?: ControlKind,
) {
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
  for (const name of ['ElDialog', 'ElFormItem', 'ElButton']) app.component(name, passThrough)
  app.component('ElForm', captureForm)
  app.component('ElInput', captureInput)
  app.component('ElInputNumber', captureControl('number', ElInputNumber))
  app.component('ElRadioGroup', captureControl('radio', ElRadioGroup))
  app.component('ElRadio', ElRadio)
  app.component('ElSwitch', captureSwitch)
  app.component('ElDatePicker', captureDate)
  app.directive('perm', {})
  return { html: await renderToString(app), update }
}

export function controlAttributes(kind: ControlKind): Attributes {
  return captured[kind]
}

export function updateControl(kind: ControlKind, value: FlatCrudScalar): void {
  const handler = captured[kind]['onUpdate:modelValue']
  if (typeof handler !== 'function') throw new Error(`找不到 ${kind} 控件的更新入口`)
  ;(handler as (value: FlatCrudScalar) => void)(value)
}

export function jsonFieldRules(): FormItemRule[] {
  return formRules.metadata as FormItemRule[]
}

export function validateJson(value: unknown): Promise<string | undefined> {
  const validator = jsonFieldRules().find((rule) => typeof rule.validator === 'function')?.validator
  if (!validator) throw new Error('找不到 JSON 校验器')
  return new Promise((resolve) => {
    validator(
      {},
      value,
      (error) => resolve(typeof error === 'string' ? error : error?.message),
      {},
      {},
    )
  })
}

export function resetFlatCrudFormHarness(): void {
  captured = emptyCaptures()
  formRules = {}
}
