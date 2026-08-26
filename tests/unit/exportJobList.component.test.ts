import { renderToString } from 'vue/server-renderer'
import { createSSRApp, h, type FunctionalComponent } from 'vue'
import { describe, expect, it } from 'vitest'

import type { ExportJob } from '@/api/modules/exportJob'
import { i18n } from '@/i18n'
import ExportJobList from '@/views/profile/exports/components/ExportJobList.vue'

const PassThrough: FunctionalComponent = (_props, { attrs, slots }) =>
  h('span', attrs, slots.default?.())
const TableStub: FunctionalComponent = (_props, { slots }) => h('div', slots.default?.())
const EmptyStub: FunctionalComponent = () => null

function exportJob(id: string, status: string, resultFileName: string): ExportJob {
  return {
    id,
    resource: 'users',
    status,
    result_file_name: resultFileName,
    created_at: '2026-08-20T00:00:00.000Z',
    matched_rows: 1,
    snapshot_at: '2026-08-20T00:00:00.000Z',
    updated_at: '2026-08-20T00:00:00.000Z',
  }
}

describe('导出任务列表组件', () => {
  it('移动卡片只允许选择终态任务，并展示单条删除', async () => {
    const previousLocale = i18n.global.locale.value
    i18n.global.locale.value = 'zh-CN'
    const jobs = [
      exportJob('done', 'succeeded', '完成.xlsx'),
      exportJob('active', 'running', '执行中.xlsx'),
    ]
    const app = createSSRApp({
      render: () =>
        h(ExportJobList, {
          canCancel: (status: string) => status === 'queued' || status === 'running',
          canDelete: (status: string) =>
            ['succeeded', 'failed', 'cancelled', 'expired'].includes(status),
          deletingJobIds: [],
          displayName: (job: ExportJob) => job.result_file_name ?? job.id,
          isDownloadUnavailable: () => false,
          jobs,
          loading: false,
          resourceLabel: () => '用户',
          selectedJobIds: ['done'],
          statusLabel: (status) => status,
          visibleJobs: jobs,
        }),
    })
    app.use(i18n)
    app.component('ElButton', PassThrough)
    app.component('ElCheckbox', PassThrough)
    app.component('ElEmpty', EmptyStub)
    app.component('ElTable', TableStub)
    app.component('ElTableColumn', EmptyStub)
    app.component('ElTag', PassThrough)
    app.directive('loading', {})

    let html: string
    try {
      html = await renderToString(app)
    } finally {
      i18n.global.locale.value = previousLocale
    }

    expect(html.match(/aria-label="选择导出记录/g)).toHaveLength(1)
    expect(html).toContain('删除')
    expect(html).toContain('取消任务')
    expect(html).toContain('完成.xlsx')
    expect(html).toContain('执行中.xlsx')
  })
})
