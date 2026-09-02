import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp, effectScope, ref, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const importApi = vi.hoisted(() => ({
  cancelUserImport: vi.fn(),
  createUserImport: vi.fn(),
  downloadUserImportReport: vi.fn(),
}))
const migrationApi = vi.hoisted(() => ({
  cancelTenantDataMigration: vi.fn(),
  finalizeTenantDataMigration: vi.fn(),
}))
const ui = vi.hoisted(() => ({ confirm: vi.fn(), success: vi.fn() }))
const downloadApi = vi.hoisted(() => ({ downloadBlobDirect: vi.fn() }))
const userApi = vi.hoisted(() => ({ downloadImportTemplate: vi.fn() }))
const lifecycle = vi.hoisted(() => ({
  activated: [] as Array<() => void>,
  deactivated: [] as Array<() => void>,
}))

vi.mock('vue', async (importOriginal) => {
  const vue = await importOriginal<typeof import('vue')>()
  return {
    ...vue,
    onActivated: (callback: () => void) => lifecycle.activated.push(callback),
    onBeforeUnmount: vi.fn(),
    onDeactivated: (callback: () => void) => lifecycle.deactivated.push(callback),
  }
})
vi.mock('@/api/modules/userImport', () => importApi)
vi.mock('@/api/modules/tenantData', () => migrationApi)
vi.mock('@/api/modules/user', () => userApi)
vi.mock('@/hooks/useDownload', () => downloadApi)
vi.mock('@/i18n', () => ({ translate: (key: string) => key }))
vi.mock('@/utils/confirmAction', () => ({ confirmAction: ui.confirm }))
vi.mock('element-plus', () => ({ ElMessage: { success: ui.success } }))

import type { TenantDataMigration } from '@/api/modules/tenantData'
import type { UserImportJob } from '@/api/modules/userImport'
import {
  beginServerStatePageOperation,
  type ServerStatePageOperation,
} from '@/shared/query/pageOperationScope'
import {
  deactivateServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import { tenantMigrationRetryOwner } from '@/views/platform/tenant/components/tenantDataMigrationCommand'
import {
  tenantMigrationActionRetryOwner,
  useTenantMigrationDetailActions,
} from '@/views/platform/tenant/components/useTenantMigrationDetailActions'
import { useUserImportHistoryActions } from '@/views/system/user/components/useUserImportHistoryActions'
import {
  hashUserImportFile,
  useUserImportManagement,
  userImportRetryOwner,
} from '@/views/system/user/composables/useUserImportManagement'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function activate(subjectId: string, fingerprint: string): void {
  transitionServerStateScope(
    { tenantId: 'tenant-a', subjectId, authorizationFingerprint: fingerprint },
    () => undefined,
    { force: true },
  )
}

function runComposable<T>(setup: () => T): { result: T; scope: EffectScope } {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const result = app.runWithContext(() => scope.run(setup))
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, scope }
}

function importJob(): UserImportJob {
  return {
    cancel_requested: false,
    created_at: '2026-08-29T00:00:00.000Z',
    duplicate_policy: 'skip',
    failure_count: 0,
    id: 'import-a',
    processed_rows: 0,
    report_available: false,
    skipped_count: 0,
    source_name: 'old-user.xlsx',
    status: 'pending',
    success_count: 0,
    total_rows: 1,
    updated_at: '2026-08-29T00:00:00.000Z',
  }
}

describe('导入与迁移破坏性操作范围', () => {
  const scopes: EffectScope[] = []

  beforeEach(() => {
    queryClient.clear()
    deactivateServerStateScope()
    vi.clearAllMocks()
    lifecycle.activated.length = 0
    lifecycle.deactivated.length = 0
    activate('user-a', 'authorization-a')
  })

  afterEach(() => {
    for (const scope of scopes.splice(0)) scope.stop()
    queryClient.clear()
    deactivateServerStateScope()
  })

  it('用户导入取消确认期间 A→B 后零 HTTP、零刷新、零 toast', async () => {
    const confirmation = deferred<boolean>()
    const refresh = vi.fn(async () => undefined)
    ui.confirm.mockReturnValueOnce(confirmation.promise)
    const job = importJob()
    const composable = runComposable(() =>
      useUserImportHistoryActions({
        findJob: (id) => (id === job.id ? job : undefined),
        refresh,
        t: (key) => key,
        visible: ref(true),
      }),
    )
    scopes.push(composable.scope)

    const pending = composable.result.cancelImportById(job.id)
    activate('user-b', 'authorization-b')
    confirmation.resolve(true)
    await pending

    expect(importApi.cancelUserImport).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
    expect(ui.success).not.toHaveBeenCalled()
  })

  it('租户迁移完成确认期间同主体 epoch 变化后零 HTTP、零回写', async () => {
    const confirmation = deferred<boolean>()
    const emitUpdated = vi.fn()
    const refresh = vi.fn(async () => undefined)
    ui.confirm.mockReturnValueOnce(confirmation.promise)
    const migration = { id: 'migration-a' } as TenantDataMigration
    const composable = runComposable(() =>
      useTenantMigrationDetailActions({
        active: () => true,
        canCancel: () => true,
        canFinalize: () => true,
        emitUpdated,
        migration: ref(migration),
        refresh,
        t: (key) => key,
        visible: ref(true),
      }),
    )
    scopes.push(composable.scope)

    const pending = composable.result.handleFinalize()
    activate('user-a', 'authorization-b')
    confirmation.resolve(true)
    await pending

    expect(migrationApi.finalizeTenantDataMigration).not.toHaveBeenCalled()
    expect(emitUpdated).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
    expect(ui.success).not.toHaveBeenCalled()
  })

  it('租户迁移取消确认期间 KeepAlive 失活后零 HTTP、零回写', async () => {
    const confirmation = deferred<boolean>()
    const active = ref(true)
    const emitUpdated = vi.fn()
    ui.confirm.mockReturnValueOnce(confirmation.promise)
    const migration = { id: 'migration-a' } as TenantDataMigration
    const composable = runComposable(() =>
      useTenantMigrationDetailActions({
        active: () => active.value,
        canCancel: () => true,
        canFinalize: () => true,
        emitUpdated,
        migration: ref(migration),
        refresh: vi.fn(async () => undefined),
        t: (key) => key,
        visible: ref(true),
      }),
    )
    scopes.push(composable.scope)

    const pending = composable.result.handleCancel()
    active.value = false
    confirmation.resolve(true)
    await pending

    expect(migrationApi.cancelTenantDataMigration).not.toHaveBeenCalled()
    expect(emitUpdated).not.toHaveBeenCalled()
    expect(ui.success).not.toHaveBeenCalled()
  })

  it('迁移动作与创建重试 owner 绑定完整范围和完整意图', () => {
    const scope = beginServerStatePageOperation().scope
    const nextScope = { ...scope, sessionEpoch: scope.sessionEpoch + 1 }
    const preview = {
      expected_placement_generation: '7',
      plan_hash: 'plan-a',
      target_target_key: 'target-a',
    } as Parameters<typeof tenantMigrationRetryOwner>[2]

    expect(tenantMigrationActionRetryOwner('cancel', 'migration-a', scope)).not.toBe(
      tenantMigrationActionRetryOwner('finalize', 'migration-a', scope),
    )
    expect(tenantMigrationActionRetryOwner('cancel', 'migration-a', scope)).not.toBe(
      tenantMigrationActionRetryOwner('cancel', 'migration-b', scope),
    )
    expect(tenantMigrationRetryOwner(scope, 'tenant-a', preview)).not.toBe(
      tenantMigrationRetryOwner(nextScope, 'tenant-a', preview),
    )
    expect(tenantMigrationRetryOwner(scope, 'tenant-a', preview)).not.toBe(
      tenantMigrationRetryOwner(scope, 'tenant-b', preview),
    )
  })

  it('用户导入上传响应晚于 KeepAlive 失活时零刷新、零 toast、零 overlay', async () => {
    const upload = deferred<unknown>()
    importApi.createUserImport.mockReturnValueOnce(upload.promise)
    const refresh = vi.fn(async () => undefined)
    const composable = runComposable(() => useUserImportManagement(refresh))
    scopes.push(composable.scope)
    composable.result.openImport()
    const file = new File(['users'], 'users.xlsx', {
      lastModified: 1,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const operation: ServerStatePageOperation = beginServerStatePageOperation()

    const pending = composable.result.submitImport(file, operation.scope)
    await vi.waitFor(() => expect(importApi.createUserImport).toHaveBeenCalledTimes(1))
    lifecycle.deactivated.forEach((deactivate) => deactivate())
    upload.resolve({})
    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' })

    expect(refresh).not.toHaveBeenCalled()
    expect(ui.success).not.toHaveBeenCalled()
    expect(composable.result.importDialogVisible.value).toBe(false)
    expect(composable.result.importHistoryVisible.value).toBe(false)
  })

  it('用户导入旧 scope 不上传，模板响应晚于失活时不下载', async () => {
    const oldScope = beginServerStatePageOperation().scope
    const file = new File(['users'], 'users.xlsx', { lastModified: 1 })
    const template = deferred<Blob>()
    userApi.downloadImportTemplate.mockReturnValueOnce(template.promise)
    const composable = runComposable(() => useUserImportManagement(vi.fn()))
    scopes.push(composable.scope)
    activate('user-b', 'authorization-b')

    await expect(composable.result.submitImport(file, oldScope)).rejects.toMatchObject({
      kind: 'cancelled',
    })
    const pendingDownload = composable.result.handleDownloadTemplate()
    await vi.waitFor(() => expect(userApi.downloadImportTemplate).toHaveBeenCalledTimes(1))
    lifecycle.deactivated.forEach((deactivate) => deactivate())
    template.resolve(new Blob(['template']))
    await pendingDownload

    expect(importApi.createUserImport).not.toHaveBeenCalled()
    expect(downloadApi.downloadBlobDirect).not.toHaveBeenCalled()
  })

  it('用户导入重试 owner 绑定 scope 与文件内容指纹', async () => {
    const scope = beginServerStatePageOperation().scope
    const first = new File(['a'], 'users.xlsx', { lastModified: 1, type: 'text/plain' })
    const second = new File(['b'], 'users.xlsx', { lastModified: 1, type: 'text/plain' })
    const firstHash = await hashUserImportFile(first)
    const secondHash = await hashUserImportFile(second)

    expect(userImportRetryOwner(scope, first, firstHash)).not.toBe(
      userImportRetryOwner({ ...scope, sessionEpoch: scope.sessionEpoch + 1 }, first, firstHash),
    )
    expect(userImportRetryOwner(scope, first, firstHash)).not.toBe(
      userImportRetryOwner(scope, second, secondHash),
    )
  })
})
