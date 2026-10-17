import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  controlAttributes,
  initialForm,
  jsonFieldRules,
  renderForm,
  resetFlatCrudFormHarness,
  updateControl,
  validateJson,
} from './flatCrudFormDialogHarness'

vi.mock('@/shared/query/pageOperationScope', () => ({
  beginServerStatePageOperation: vi.fn(),
}))

beforeEach(resetFlatCrudFormHarness)

describe('平面 CRUD 表单的创建专用字段', () => {
  it.each([
    { name: '新建时创建专用字段可输入', editing: false, disabledOnEdit: true },
    { name: '编辑时可更新字段仍可输入', editing: true, disabledOnEdit: false },
  ])('$name', async ({ editing, disabledOnEdit }) => {
    const { html, update } = await renderForm(editing, disabledOnEdit)
    expect(html).not.toMatch(/<input\b[^>]*\sdisabled(?:\s|=|>)/u)
    for (const kind of ['text', 'number', 'radio'] as const) {
      expect(Boolean(controlAttributes(kind).disabled)).toBe(false)
    }

    updateControl('text', '新编码')
    updateControl('number', 12)
    updateControl('radio', false)
    expect(update.mock.calls.map(([form]) => form)).toEqual([
      { ...initialForm, code: '新编码' },
      { ...initialForm, count: 12 },
      { ...initialForm, enabled: false },
    ])
    expect(initialForm).toEqual({
      active: true,
      code: '初始编码',
      count: 5,
      description: '初始说明',
      enabled: true,
      metadata: '{"name":"初始配置"}',
      occurredAt: '2026-10-18T09:30:00.000Z',
      publishedOn: '2026-10-18',
    })
  })

  it('编辑时文本、数字与枚举控件均禁用，且拒绝迟到的更新事件', async () => {
    const { html, update } = await renderForm(true, true)
    expect(html.match(/<input\b[^>]*\sdisabled(?:\s|=|>)/gu)?.length).toBeGreaterThanOrEqual(3)
    for (const kind of ['text', 'number', 'radio'] as const) {
      expect(controlAttributes(kind).disabled).toBe(true)
    }

    updateControl('text', '不应回写')
    updateControl('number', 99)
    updateControl('radio', false)
    expect(update).not.toHaveBeenCalled()
    expect(initialForm).toEqual({
      active: true,
      code: '初始编码',
      count: 5,
      description: '初始说明',
      enabled: true,
      metadata: '{"name":"初始配置"}',
      occurredAt: '2026-10-18T09:30:00.000Z',
      publishedOn: '2026-10-18',
    })
  })

  it.each(['text', 'number', 'radio'] as const)(
    '同一编辑表单按字段区分只读状态，%s 可更新字段保持可输入',
    async (editableKind) => {
      const { update } = await renderForm(true, true, editableKind)
      for (const kind of ['text', 'number', 'radio'] as const) {
        expect(controlAttributes(kind).disabled).toBe(kind !== editableKind)
      }

      updateControl('text', '新编码')
      updateControl('number', 12)
      updateControl('radio', false)
      const changed = { text: { code: '新编码' }, number: { count: 12 }, radio: { enabled: false } }
      expect(update).toHaveBeenCalledExactlyOnceWith({ ...initialForm, ...changed[editableKind] })
    },
  )

  it('JSON 字段配置必填提示并拒绝非法值、接受合法值', async () => {
    await renderForm(false, false)
    expect(jsonFieldRules()[0]).toMatchObject({ required: true, message: '请输入配置' })
    expect(await validateJson('{name:')).toBe('配置必须是合法 JSON')
    expect(await validateJson('{"name":"合法配置"}')).toBeUndefined()
  })
})
