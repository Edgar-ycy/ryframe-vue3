import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  controlAttributes,
  initialForm,
  renderForm,
  resetFlatCrudFormHarness,
  updateControl,
} from './flatCrudFormDialogHarness'

vi.mock('@/shared/query/pageOperationScope', () => ({
  beginServerStatePageOperation: vi.fn(),
}))

beforeEach(resetFlatCrudFormHarness)

describe('平面 CRUD 表单的扩展控件', () => {
  it('按字段类型渲染控件并回写最新值', async () => {
    const { update } = await renderForm(false, false)
    expect(controlAttributes('textarea')).toMatchObject({
      'model-value': '初始说明',
      placeholder: '请输入描述',
      rows: 4,
      type: 'textarea',
    })
    expect(controlAttributes('switch')['model-value']).toBe(true)
    expect(controlAttributes('date')).toMatchObject({
      'model-value': '2026-10-18',
      type: 'date',
      'value-format': 'YYYY-MM-DD',
    })
    expect(controlAttributes('dateTime')).toMatchObject({
      'model-value': '2026-10-18T09:30:00.000Z',
      type: 'datetime',
      'value-format': 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    })
    expect(controlAttributes('json')).toMatchObject({
      'model-value': '{"name":"初始配置"}',
      placeholder: '请输入配置',
      rows: 6,
      spellcheck: 'false',
      type: 'textarea',
    })
    expect(String(controlAttributes('json').class)).toContain('json-input')

    updateControl('textarea', '新的说明')
    updateControl('switch', false)
    updateControl('date', '2026-10-19')
    updateControl('dateTime', '2026-10-19T10:20:30.000+08:00')
    updateControl('json', '{"name":"新的配置"}')
    expect(update.mock.calls.map(([form]) => form)).toEqual([
      { ...initialForm, description: '新的说明' },
      { ...initialForm, active: false },
      { ...initialForm, publishedOn: '2026-10-19' },
      { ...initialForm, occurredAt: '2026-10-19T10:20:30.000+08:00' },
      { ...initialForm, metadata: '{"name":"新的配置"}' },
    ])
  })

  it.each(['textarea', 'switch', 'date', 'dateTime', 'json'] as const)(
    '编辑时新增控件 %s 继续受 disabledOnEdit 约束',
    async (kind) => {
      const { update } = await renderForm(true, true)
      expect(controlAttributes(kind).disabled).toBe(true)

      updateControl(kind, kind === 'switch' ? false : '不应回写')
      expect(update).not.toHaveBeenCalled()
    },
  )
})
