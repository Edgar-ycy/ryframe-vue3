import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ui = vi.hoisted(() => ({
  confirm: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: { error: ui.error, success: ui.success },
  ElMessageBox: { confirm: ui.confirm },
}))

import type { TenantConfigBundle, TenantConfigTransfer } from '@/api/modules/tenantConfigTransfer'
import { deactivateServerStateScope, transitionServerStateScope } from '@/shared/query/client'
import { createConfigTransferPageActions } from '@/views/system/config-transfer/configTransferPageActions'

function activate(fingerprint: string): void {
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

function configBundle(): TenantConfigBundle {
  return {
    created_at: '2026-08-29T00:00:00.000Z',
    id: 'bundle-1',
    item_count: 1,
    origin: 'generated',
    package_schema_version: '1',
    resource_counts: { config: 1 },
    source_app_version: '1',
    source_tenant_key: 'tenant-a',
    source_tenant_name: 'Tenant A',
    status: 'ready',
    updated_at: '2026-08-29T00:00:00.000Z',
  }
}

function configTransfer(): TenantConfigTransfer {
  return {
    bundle_summary: {
      created_at: '2026-08-29T00:00:00.000Z',
      item_count: 1,
      origin: 'generated',
      package_schema_version: '1',
      resource_counts: { config: 1 },
      source_app_version: '1',
      source_tenant_key: 'tenant-a',
      source_tenant_name: 'Tenant A',
      status: 'ready',
    },
    change_counts: { config: 1 },
    created_at: '2026-08-29T00:00:00.000Z',
    id: 'transfer-1',
    status: 'preview_ready',
    target_authorization_epoch: '1',
    target_configuration_version: 1,
    updated_at: '2026-08-29T00:00:00.000Z',
  }
}

beforeEach(() => {
  activate('authorization-a')
  ui.confirm.mockReset()
  ui.error.mockReset()
  ui.success.mockReset()
})

afterEach(() => {
  deactivateServerStateScope()
})

describe('页面异步操作 scope', () => {
  it('Config Transfer epoch 切换后迟到上传不关闭对话框且零提示', async () => {
    const pending = deferred<TenantConfigTransfer>()
    const bundle = configBundle()
    const management: Parameters<typeof createConfigTransferPageActions>[0]['management'] = {
      applyTransfer: vi.fn(),
      captureIdentity: () => 'guard-a',
      createFromPackage: vi.fn(),
      createPackage: vi.fn(async () => bundle),
      downloadPackage: vi.fn(),
      fetchData: vi.fn(),
      fetchItems: vi.fn(),
      fetchPackages: vi.fn(),
      identityMatches: () => true,
      itemQueryParams: ref({ page: 1, page_size: 20 }),
      previewTransfer: vi.fn(),
      queryParams: ref({ page: 1, page_size: 10 }),
      rollbackTransfer: vi.fn(),
      selectPackage: vi.fn(),
      selectTransfer: vi.fn(),
      uploadPackage: () => pending.promise,
    }
    const uploadVisible = ref(true)
    const actions = createConfigTransferPageActions({
      historyVisible: ref(true),
      management,
      t: (key) => key,
      uploadVisible,
    })

    const operation = actions.handleUploadPackage({ name: 'config.zip' } as File)
    activate('authorization-b')
    pending.resolve(configTransfer())
    await expect(operation).rejects.toMatchObject({ kind: 'cancelled' })

    expect(uploadVisible.value).toBe(true)
    expect(ui.success).not.toHaveBeenCalled()
    expect(ui.error).not.toHaveBeenCalled()
  })
})
