import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runtime = vi.hoisted(() => ({
  cancelJob: vi.fn(),
  confirmAction: vi.fn(),
  messages: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({ ElMessage: runtime.messages }))
vi.mock('vue-i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-i18n')>()),
  useI18n: () => ({ t: (key: string) => key }),
}))
vi.mock('@/utils/confirmAction', () => ({ confirmAction: runtime.confirmAction }))
vi.mock('@/app/exports/useExportJobs', () => ({
  useExportJobActions: () => ({
    cancelJob: runtime.cancelJob,
    cancellingJobId: { value: undefined },
    deleteJobs: vi.fn(),
    deletingJobIds: { value: [] },
    downloadJob: vi.fn(),
    downloadingJobId: { value: undefined },
    isJobActionBusy: vi.fn(() => false),
  }),
}))

import type { ExportJob } from '@/api/modules/exportJob'
import { useExportPageActions } from '@/views/profile/exports/useExportPageActions'
import { HttpError } from '@/shared/http/client'
import { deactivateServerStateScope, transitionServerStateScope } from '@/shared/query/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'

function exportJob(): ExportJob {
  return {
    id: 'job-1',
    resource: 'users',
    status: 'running',
    created_at: '2026-09-05T00:00:00.000Z',
    matched_rows: 0,
    snapshot_at: '2026-09-05T00:00:00.000Z',
    updated_at: '2026-09-05T00:00:00.000Z',
  }
}

function activateScope(fingerprint: string): void {
  transitionServerStateScope(
    {
      tenantId: 'tenant-a',
      subjectId: 'user-a',
      authorizationFingerprint: fingerprint,
    },
    () => undefined,
    { force: true },
  )
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function createActions(refresh = vi.fn().mockResolvedValue(undefined)) {
  const jobs = ref([exportJob()])
  return {
    actions: useExportPageActions({
      jobs,
      selectedJobIds: ref<string[]>([]),
      visibleJobs: () => jobs.value,
      beginPageOperation: () => [beginServerStatePageOperation(), () => true] as const,
      refresh,
    }),
    refresh,
  }
}

beforeEach(() => {
  activateScope('authorization-a')
  runtime.confirmAction.mockResolvedValue(true)
})

afterEach(() => {
  deactivateServerStateScope()
})

describe('导出中心页面动作 scope', () => {
  it('确认框返回前 scope 失效时不借用新身份取消任务，也不提示失败', async () => {
    const confirmation = deferred<boolean>()
    runtime.confirmAction.mockReturnValueOnce(confirmation.promise)
    const { actions } = createActions()

    const pending = actions.handleCancel(exportJob())
    activateScope('authorization-b')
    confirmation.resolve(true)
    await pending

    expect(runtime.cancelJob).not.toHaveBeenCalled()
    expect(runtime.messages.error).not.toHaveBeenCalled()
    expect(runtime.messages.info).not.toHaveBeenCalled()
  })

  it('底层主动取消保持静默，普通失败补拉后只显示一次页面错误', async () => {
    runtime.cancelJob.mockRejectedValueOnce(new HttpError('请求取消', { kind: 'cancelled' }))
    const first = createActions()
    await first.actions.handleCancel(exportJob())
    expect(first.refresh).not.toHaveBeenCalled()
    expect(runtime.messages.error).not.toHaveBeenCalled()

    runtime.cancelJob.mockRejectedValueOnce(new HttpError('服务失败', { status: 500 }))
    const second = createActions()
    await second.actions.handleCancel(exportJob())
    expect(second.refresh).toHaveBeenCalledOnce()
    expect(runtime.messages.error).toHaveBeenCalledOnce()
    expect(runtime.messages.error).toHaveBeenCalledWith('exportCenter.cancelFailed')
  })
})
