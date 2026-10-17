import { createSSRApp, defineComponent, h, type FunctionalComponent } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import FlatCrudTable from '@/components/business/flat-crud/FlatCrudTable.vue'
import type { FlatCrudColumn } from '@/components/business/flat-crud/model'

interface RecordModel {
  id: string
  metadata: unknown
  scheduledAt: unknown
}

const passThrough: FunctionalComponent = (_props, { slots }) => h('span', slots.default?.())
passThrough.inheritAttrs = false

async function renderTable(
  records: readonly RecordModel[],
  columns: readonly FlatCrudColumn<RecordModel>[],
): Promise<string> {
  const TableStub = defineComponent({
    props: {
      data: { type: Array, default: undefined },
      label: { type: String, default: '' },
    },
    setup(props, { slots }) {
      return () =>
        props.data
          ? h('div', { 'data-row-count': String(props.data.length) }, slots.default?.())
          : h(
              'section',
              { 'data-column': props.label },
              records.map((record) => slots.default?.({ row: record })),
            )
    },
  })
  const app = createSSRApp({
    render: () =>
      h(FlatCrudTable<RecordModel>, {
        columns,
        deletingKey: null,
        labels: { actions: '操作', edit: '编辑', remove: '删除' },
        loading: false,
        permissions: { update: 'item:update', remove: 'item:remove' },
        rowKey: (record) => record.id,
        rows: records,
      }),
  })
  app.component('ElTable', TableStub)
  app.component('ElTableColumn', TableStub)
  app.component('ElButton', passThrough)
  app.component('ElTag', passThrough)
  app.directive('loading', {})
  app.directive('perm', {})
  return renderToString(app)
}

describe('平面 CRUD 表格', () => {
  it('格式化 JSON 单元格，并安全展示自定义日期格式化无法识别的字符串', async () => {
    const formatDate = vi.fn((value: string) => (value === '待确认' ? `未知日期：${value}` : value))
    const html = await renderTable(
      [
        {
          id: '1',
          metadata: { name: '配置', values: [1, true] },
          scheduledAt: '待确认',
        },
      ],
      [
        { key: 'metadata', label: '配置', display: 'json' },
        { key: 'scheduledAt', label: '时间', display: 'datetime', format: formatDate },
      ],
    )

    expect(formatDate).toHaveBeenCalledWith('待确认')
    expect(html).toContain('data-row-count="1"')
    expect(html).toMatch(
      /<code class="json-cell"[^>]*>\{&quot;name&quot;:&quot;配置&quot;,&quot;values&quot;:\[1,true\]\}<\/code>/u,
    )
    expect(html).toContain('未知日期：待确认')
  })
})
