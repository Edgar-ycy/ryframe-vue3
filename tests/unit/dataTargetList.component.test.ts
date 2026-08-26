import { renderToString } from 'vue/server-renderer'
import { createSSRApp, h, type FunctionalComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import type { DataTargetSummary } from '@/api/modules/dataTarget'
import { i18n } from '@/i18n'
import DataTargetList from '@/views/platform/data-targets/DataTargetList.vue'

const PassThrough: FunctionalComponent = (_props, { attrs, slots }) =>
  h('span', attrs, slots.default?.())
const TableStub: FunctionalComponent = (_props, { slots }) => h('div', slots.default?.())
const EmptyStub: FunctionalComponent = () => null

describe('数据目标列表组件', () => {
  it('桌面和移动布局共享同一份目标数据', async () => {
    const target: DataTargetSummary = {
      active_leases: 2,
      connected: true,
      eligible: true,
      health: 'verified',
      key: 'primary-mysql',
      kind: 'mysql',
      mode: 'shared',
      pool_max_connections: 20,
      reasons: [],
      region: 'cn-east',
      schema_fingerprint: 'schema-v1',
    }
    const app = createSSRApp({
      render: () =>
        h(DataTargetList, {
          healthLabel: () => '健康',
          loading: false,
          page: 1,
          pageSize: 20,
          targets: [target],
          total: 1,
        }),
    })
    app.use(i18n)
    app.component('ElButton', PassThrough)
    app.component('ElEmpty', EmptyStub)
    app.component('ElPagination', EmptyStub)
    app.component('ElTable', TableStub)
    app.component('ElTableColumn', EmptyStub)
    app.component('ElTag', PassThrough)
    app.directive('loading', {})

    const html = await renderToString(app)
    expect(html).toContain('primary-mysql')
    expect(html).toContain('cn-east')
    expect(html).toContain('schema-v1')
    expect(html).toContain('健康')
  })
})
