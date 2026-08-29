import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp, effectScope, ref, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  cancelUserImport: vi.fn(),
  createUserImport: vi.fn(),
  downloadImportTemplate: vi.fn(),
  downloadUserImportReport: vi.fn(),
}))
const lifecycle = vi.hoisted(() => ({ deactivated: [] as Array<() => void> }))
const reporter = vi.hoisted(() => vi.fn())
const ui = vi.hoisted(() => ({ success: vi.fn() }))

vi.mock('vue', async (importOriginal) => {
  const vue = await importOriginal<typeof import('vue')>()
  return {
    ...vue,
    onActivated: vi.fn(),
    onBeforeUnmount: vi.fn(),
    onDeactivated: (callback: () => void) => lifecycle.deactivated.push(callback),
  }
})
vi.mock('@/api/modules/userImport', () => ({
  cancelUserImport: api.cancelUserImport,
  createUserImport: api.createUserImport,
  downloadUserImportReport: api.downloadUserImportReport,
}))
vi.mock('@/api/modules/user', () => ({ downloadImportTemplate: api.downloadImportTemplate }))
vi.mock('@/hooks/useDownload', () => ({ downloadBlobDirect: vi.fn() }))
vi.mock('@/i18n', () => ({ translate: (key: string) => key }))
vi.mock('@/utils/confirmAction', () => ({ confirmAction: vi.fn(async () => true) }))
vi.mock('element-plus', () => ({ ElMessage: { success: ui.success } }))

import type { UserImportJob } from '@/api/modules/userImport'
import {
  configureServerStateErrorReporter,
  deactivateServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import { useUserImportHistoryActions } from '@/views/system/user/components/useUserImportHistoryActions'
import { useUserImportManagement } from '@/views/system/user/composables/useUserImportManagement'

function deferred<T>() {
  let reject!: (reason?: unknown) => void
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept, rejectPromise) => {
    resolve = accept
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

function runComposable<T>(setup: () => T): { result: T; scope: EffectScope } {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const result = app.runWithContext(() => scope.run(setup))
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, scope }
}

function historyActions() {
  const visible = ref(true)
  const job = { id: 'import-a', source_name: 'users.xlsx' } as UserImportJob
  const composable = runComposable(() =>
    useUserImportHistoryActions({
      findJob: (id) => (id === job.id ? job : undefined),
      refresh: vi.fn(async () => undefined),
      t: (key) => key,
      visible,
    }),
  )
  return { ...composable, job, visible }
}

describe('用户导入页面所有权错误上报', () => {
  const scopes: EffectScope[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    lifecycle.deactivated.length = 0
    queryClient.clear()
    deactivateServerStateScope()
    transitionServerStateScope(
      { tenantId: 'tenant-a', subjectId: 'user-a', authorizationFingerprint: 'auth-a' },
      () => undefined,
      { force: true },
    )
    configureServerStateErrorReporter(reporter)
  })

  afterEach(() => {
    scopes.splice(0).forEach((scope) => scope.stop())
    configureServerStateErrorReporter(undefined)
    deactivateServerStateScope()
    queryClient.clear()
  })

  it('模板下载 current 失败上报一次，失活后的失败零上报', async () => {
    const current = runComposable(() => useUserImportManagement(vi.fn()))
    scopes.push(current.scope)
    api.downloadImportTemplate.mockRejectedValueOnce(new Error('template failed'))
    await expect(current.result.handleDownloadTemplate()).rejects.toMatchObject({
      message: 'template failed',
    })
    expect(reporter).toHaveBeenCalledTimes(1)

    reporter.mockClear()
    const late = deferred<Blob>()
    api.downloadImportTemplate.mockReturnValueOnce(late.promise)
    const pending = current.result.handleDownloadTemplate()
    await vi.waitFor(() => expect(api.downloadImportTemplate).toHaveBeenCalledTimes(2))
    lifecycle.deactivated.forEach((deactivate) => deactivate())
    late.reject(new Error('late template failure'))
    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    expect(reporter).not.toHaveBeenCalled()
  })

  it('报告下载 current 失败上报一次，抽屉失效后的失败零上报', async () => {
    const current = historyActions()
    scopes.push(current.scope)
    api.downloadUserImportReport.mockRejectedValueOnce(new Error('report failed'))
    await expect(current.result.downloadReportById(current.job.id)).rejects.toMatchObject({
      message: 'report failed',
    })
    expect(reporter).toHaveBeenCalledTimes(1)

    reporter.mockClear()
    const late = deferred<Blob>()
    api.downloadUserImportReport.mockReturnValueOnce(late.promise)
    const pending = current.result.downloadReportById(current.job.id)
    await vi.waitFor(() => expect(api.downloadUserImportReport).toHaveBeenCalledTimes(2))
    current.visible.value = false
    current.result.invalidate()
    late.reject(new Error('late report failure'))
    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    expect(reporter).not.toHaveBeenCalled()
  })

  it('取消导入 current 失败上报一次，抽屉失效后的失败零上报', async () => {
    const current = historyActions()
    scopes.push(current.scope)
    api.cancelUserImport.mockRejectedValueOnce(new Error('cancel failed'))
    await expect(current.result.cancelImportById(current.job.id)).rejects.toMatchObject({
      message: 'cancel failed',
    })
    expect(reporter).toHaveBeenCalledTimes(1)

    reporter.mockClear()
    const late = deferred<unknown>()
    api.cancelUserImport.mockReturnValueOnce(late.promise)
    const pending = current.result.cancelImportById(current.job.id)
    await vi.waitFor(() => expect(api.cancelUserImport).toHaveBeenCalledTimes(2))
    current.visible.value = false
    current.result.invalidate()
    late.reject(new Error('late cancel failure'))
    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    expect(reporter).not.toHaveBeenCalled()
  })

  it('创建导入 current 失败上报一次，失活后的失败零上报', async () => {
    const current = runComposable(() => useUserImportManagement(vi.fn(async () => undefined)))
    scopes.push(current.scope)
    const file = new File(['users'], 'users.xlsx', { lastModified: 1 })
    const expectedScope = beginServerStatePageOperation().scope
    api.createUserImport.mockRejectedValueOnce(new Error('create failed'))

    await expect(current.result.submitImport(file, expectedScope)).rejects.toMatchObject({
      message: 'create failed',
    })
    expect(reporter).toHaveBeenCalledTimes(1)

    reporter.mockClear()
    const late = deferred<unknown>()
    api.createUserImport.mockReturnValueOnce(late.promise)
    const pending = current.result.submitImport(file, expectedScope)
    await vi.waitFor(() => expect(api.createUserImport).toHaveBeenCalledTimes(2))
    lifecycle.deactivated.forEach((deactivate) => deactivate())
    late.reject(new Error('late create failure'))
    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
    expect(reporter).not.toHaveBeenCalled()
  })

  it('文件内容指纹计算期间双击提交只创建一个导入任务', async () => {
    const bytes = deferred<ArrayBuffer>()
    const current = runComposable(() => useUserImportManagement(vi.fn(async () => undefined)))
    scopes.push(current.scope)
    const file = new File(['users'], 'users.xlsx', { lastModified: 1 })
    vi.spyOn(file, 'arrayBuffer').mockReturnValueOnce(bytes.promise)
    api.createUserImport.mockResolvedValueOnce({})
    const expectedScope = beginServerStatePageOperation().scope

    const first = current.result.submitImport(file, expectedScope)
    const second = current.result.submitImport(file, expectedScope)
    expect(current.result.importLoading.value).toBe(true)
    bytes.resolve(new Uint8Array([1, 2, 3]).buffer)
    await Promise.all([first, second])

    expect(api.createUserImport).toHaveBeenCalledTimes(1)
    expect(current.result.importLoading.value).toBe(false)
  })

  it('创建成功后的用户刷新失败只由 Query 全局出口上报一次', async () => {
    const refreshError = new Error('refresh failed')
    const refreshUsers = () =>
      queryClient.fetchQuery({
        queryKey: ['user-import-refresh-failure'],
        queryFn: () => Promise.reject(refreshError),
        retry: false,
      })
    const current = runComposable(() => useUserImportManagement(refreshUsers))
    scopes.push(current.scope)
    current.result.openImport()
    api.createUserImport.mockResolvedValueOnce({})
    const file = new File(['users'], 'users.xlsx', { lastModified: 1 })

    await expect(
      current.result.submitImport(file, beginServerStatePageOperation().scope),
    ).rejects.toBe(refreshError)

    expect(reporter).toHaveBeenCalledTimes(1)
    expect(ui.success).not.toHaveBeenCalled()
    expect(current.result.importDialogVisible.value).toBe(true)
    expect(current.result.importHistoryVisible.value).toBe(false)
    expect(current.result.importLoading.value).toBe(false)
  })
})
