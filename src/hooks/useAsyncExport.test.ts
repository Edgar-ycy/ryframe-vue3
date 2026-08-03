import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAsyncExport } from './useAsyncExport'
import type { ExportJob } from '@/api/modules/exportJob'
import type { ApiResponse } from '@/shared/http/types'

const exportApi = vi.hoisted(() => ({
  downloadExportJob: vi.fn(),
  getExportJob: vi.fn(),
}))
const download = vi.hoisted(() => ({ downloadBlobDirect: vi.fn() }))
const message = vi.hoisted(() => ({ success: vi.fn() }))
const query = vi.hoisted(() => ({
  invalidateTenantResource: vi.fn(),
  useTenantMutation: vi.fn(),
}))

vi.mock('@/api/modules/exportJob', () => exportApi)
vi.mock('./useDownload', () => download)
vi.mock('element-plus', () => ({ ElMessage: message }))
vi.mock('@/shared/query/client', () => ({
  invalidateTenantResource: query.invalidateTenantResource,
}))
vi.mock('@/shared/query/useTenantMutation', () => ({
  useTenantMutation: query.useTenantMutation,
}))
vi.mock('@/i18n', () => ({
  translate: (key: string) => ({
    'shell.download.success': '下载成功',
    'shell.http.requestFailed': '请求失败',
  })[key] ?? key,
}))

interface CapturedMutationOptions {
  meta?: { errorMode?: 'global' | 'silent' }
  mutationFn: (variables: unknown) => Promise<void>
  onSuccess?: (
    data: void,
    variables: unknown,
    onMutateResult: unknown,
    context: object,
  ) => void | Promise<void>
  onError?: (
    error: unknown,
    variables: unknown,
    onMutateResult: unknown,
    context: object,
  ) => void | Promise<void>
}

function capturedMutation(): CapturedMutationOptions {
  const options = query.useTenantMutation.mock.calls.at(-1)?.[2] as
    | CapturedMutationOptions
    | undefined
  if (!options) throw new Error('导出 Mutation 选项未注册')
  return options
}

function exportJob(status: ExportJob['status'], overrides: Partial<ExportJob> = {}): ExportJob {
  return {
    id: 'job-1',
    status,
    ...overrides,
  } as ExportJob
}

function response(data?: ExportJob): ApiResponse<ExportJob> {
  return {
    code: 200,
    message: 'ok',
    request_id: 'request-1',
    data,
  }
}

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('异步导出 Mutation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    exportApi.downloadExportJob.mockReset()
    exportApi.getExportJob.mockReset()
    download.downloadBlobDirect.mockReset()
    message.success.mockReset()
    query.invalidateTenantResource.mockReset().mockResolvedValue(undefined)
    query.useTenantMutation.mockReset().mockImplementation((
      _tenantId: unknown,
      _resource: string,
      options: CapturedMutationOptions,
    ) => {
      const pending = { value: false }
      return {
        pending,
        mutateAsync: vi.fn(async (variables: unknown) => {
          pending.value = true
          try {
            const result = await options.mutationFn(variables)
            await options.onSuccess?.(result, variables, undefined, {})
            return result
          }
          catch (error) {
            await options.onError?.(error, variables, undefined, {})
            throw error
          }
          finally {
            pending.value = false
          }
        }),
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('通过统一 Mutation 轮询至成功、传递同一信号并阻止重复触发', async () => {
    const blob = new Blob(['report'])
    const create = vi.fn(async (_signal: AbortSignal) => response(exportJob('queued')))
    const ignoredCreate = vi.fn(async (_signal: AbortSignal) => response(exportJob('succeeded')))
    exportApi.getExportJob
      .mockResolvedValueOnce(response(exportJob('running')))
      .mockResolvedValueOnce(response(exportJob('succeeded', { result_file_name: '服务端报表.xlsx' })))
    exportApi.downloadExportJob.mockResolvedValueOnce(blob)
    const { pending, exportAndDownload } = useAsyncExport('tenant-a')

    const task = exportAndDownload(create, { filename: '默认报表.xlsx' })
    const duplicate = exportAndDownload(ignoredCreate, { filename: '忽略.xlsx' })
    expect(duplicate).toBe(task)
    expect(pending.value).toBe(true)
    expect(ignoredCreate).not.toHaveBeenCalled()

    await flushPromises()
    await vi.runAllTimersAsync()
    await task

    const signal = create.mock.calls[0]?.[0]
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(exportApi.getExportJob).toHaveBeenNthCalledWith(1, 'job-1', signal)
    expect(exportApi.getExportJob).toHaveBeenNthCalledWith(2, 'job-1', signal)
    expect(exportApi.downloadExportJob).toHaveBeenCalledWith('job-1', signal)
    expect(download.downloadBlobDirect).toHaveBeenCalledWith(blob, '服务端报表.xlsx')
    expect(message.success).toHaveBeenCalledWith('下载成功')
    expect(pending.value).toBe(false)
    expect(query.useTenantMutation.mock.calls[0]?.[1]).toBe('background-jobs')
    expect(capturedMutation().meta).toEqual({ errorMode: 'global' })
  })

  it('已完成任务直接下载并使用调用方文件名兜底', async () => {
    const blob = new Blob(['ready'])
    exportApi.downloadExportJob.mockResolvedValueOnce(blob)
    const { exportAndDownload } = useAsyncExport('tenant-a')

    await exportAndDownload(
      async () => response(exportJob('succeeded', { result_file_name: null })),
      { filename: '调用方.csv' },
    )

    expect(exportApi.getExportJob).not.toHaveBeenCalled()
    expect(exportApi.downloadExportJob).toHaveBeenCalledWith(
      'job-1',
      expect.any(AbortSignal),
    )
    expect(download.downloadBlobDirect).toHaveBeenCalledWith(blob, '调用方.csv')
  })

  it('缺少任务数据时走统一 Mutation 错误出口', async () => {
    const { pending, exportAndDownload } = useAsyncExport('tenant-a')

    await expect(exportAndDownload(
      async () => response(),
      { filename: '无效.xlsx' },
    )).rejects.toMatchObject({
      message: '请求失败',
      kind: 'invalid_response',
    })

    expect(message.success).not.toHaveBeenCalled()
    expect(pending.value).toBe(false)
    expect(query.invalidateTenantResource).not.toHaveBeenCalled()
  })

  it('任务失败后保留服务端原因并只失效原租户任务缓存', async () => {
    const { exportAndDownload } = useAsyncExport('tenant-a')
    const task = exportAndDownload(
      async () => response(exportJob('failed', { error_message: '文件生成失败' })),
      { filename: '失败.xlsx' },
    )

    await expect(task).rejects.toMatchObject({
      message: '文件生成失败',
      kind: 'unknown',
    })

    expect(query.invalidateTenantResource).toHaveBeenCalledWith(
      'tenant-a',
      'background-jobs',
    )
    expect(exportApi.downloadExportJob).not.toHaveBeenCalled()
  })

  it('租户切换会立即取消旧租户导出并失效旧租户任务缓存', async () => {
    const tenantId = ref('tenant-a')
    const create = vi.fn(async (_signal: AbortSignal) => response(exportJob('queued')))
    const { exportAndDownload } = useAsyncExport(tenantId)
    const task = exportAndDownload(create, { filename: '切换租户.xlsx' })
    const rejection = expect(task).rejects.toMatchObject({ kind: 'cancelled' })
    await flushPromises()

    tenantId.value = 'tenant-b'

    await rejection
    expect(create.mock.calls[0]?.[0].aborted).toBe(true)
    expect(query.invalidateTenantResource).toHaveBeenCalledWith(
      'tenant-a',
      'background-jobs',
    )
  })

  it('轮询超时后通过统一错误路径结束并失效任务缓存', async () => {
    const startedAt = new Date('2026-08-03T00:00:00Z')
    vi.setSystemTime(startedAt)
    exportApi.getExportJob.mockResolvedValueOnce(response(exportJob('queued')))
    const { exportAndDownload } = useAsyncExport('tenant-a')
    const task = exportAndDownload(
      async () => response(exportJob('queued')),
      { filename: '超时.xlsx' },
    )
    const rejection = expect(task).rejects.toMatchObject({ kind: 'timeout' })
    await flushPromises()

    vi.setSystemTime(new Date(startedAt.getTime() + 120_000))
    await vi.runOnlyPendingTimersAsync()

    await rejection
    expect(exportApi.getExportJob).toHaveBeenCalledOnce()
    expect(exportApi.downloadExportJob).not.toHaveBeenCalled()
    expect(query.invalidateTenantResource).toHaveBeenCalledWith(
      'tenant-a',
      'background-jobs',
    )
  })

  it('主动取消会中止等待和后续 HTTP 请求且不会进入全局提示', async () => {
    const create = vi.fn(async (_signal: AbortSignal) => response(exportJob('queued')))
    const { cancel, exportAndDownload, pending } = useAsyncExport('tenant-a')
    const task = exportAndDownload(create, { filename: '取消.xlsx' })
    await flushPromises()

    cancel()
    await expect(task).rejects.toMatchObject({ kind: 'cancelled' })

    expect(create.mock.calls[0]?.[0].aborted).toBe(true)
    expect(exportApi.getExportJob).not.toHaveBeenCalled()
    expect(exportApi.downloadExportJob).not.toHaveBeenCalled()
    expect(message.success).not.toHaveBeenCalled()
    expect(pending.value).toBe(false)
  })
})
