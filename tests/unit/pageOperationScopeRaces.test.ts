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

import type {
  CreateProfileServiceDelegationInput,
  CreatedProfileServiceDelegation,
  ProfileServiceDelegation,
} from '@/api/modules/profileServiceDelegation'
import type {
  CreatedServiceCredential,
  CreateServiceCredentialInput,
  ServiceAccount,
} from '@/api/modules/serviceAccount'
import type { TenantConfigBundle, TenantConfigTransfer } from '@/api/modules/tenantConfigTransfer'
import { deactivateServerStateScope, transitionServerStateScope } from '@/shared/query/client'
import { createProfileServiceDelegationPageActions } from '@/views/profile/serviceDelegationPageActions'
import { createConfigTransferPageActions } from '@/views/system/config-transfer/configTransferPageActions'
import { createServiceAccountPageActions } from '@/views/system/service-accounts/serviceAccountPageActions'

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

function delegation(): ProfileServiceDelegation {
  return {
    account_id: 'account-1',
    capability_keys: ['reports.read'],
    created_at: '2026-08-29T00:00:00.000Z',
    expires_at: '2026-08-30T00:00:00.000Z',
    id: 'delegation-1',
    not_before: '2026-08-29T00:00:00.000Z',
    reason: 'test',
    status: 'active',
    user_id: 'user-a',
    version: 1,
  }
}

function serviceAccount(): ServiceAccount {
  return {
    authorization_version: 1,
    code: 'automation',
    created_at: '2026-08-29T00:00:00.000Z',
    id: 'account-1',
    max_requests_per_minute: 60,
    name: 'Automation',
    status: '1',
    updated_at: '2026-08-29T00:00:00.000Z',
  }
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
  it('Profile 失活后迟到委托结果不提示且不回传一次性令牌', async () => {
    let identityCurrent = true
    const pending = deferred<CreatedProfileServiceDelegation>()
    const done = vi.fn()
    const actions = createProfileServiceDelegationPageActions({
      identityMatches: () => identityCurrent,
      issueDelegation: () => pending.promise,
      notifyCreated: ui.success,
      notifyRevoked: vi.fn(),
      revokeDelegation: vi.fn(),
    })
    const input: CreateProfileServiceDelegationInput = {
      capability_keys: ['reports.read'],
      reason: 'test',
      service_account_id: 'account-1',
    }

    const operation = actions.createServiceDelegation(input, 'guard-a', done)
    identityCurrent = false
    pending.resolve({ delegation: delegation(), token: 'old-token' })

    await expect(operation).rejects.toMatchObject({ kind: 'cancelled' })
    expect(ui.success).not.toHaveBeenCalled()
    expect(done).not.toHaveBeenCalled()
  })

  it('Service Account 失活后迟到密钥不打开对话框且不提示', async () => {
    let identityCurrent = true
    const pending = deferred<CreatedServiceCredential>()
    const account = serviceAccount()
    const management: Parameters<typeof createServiceAccountPageActions>[0]['management'] = {
      captureIdentity: () => 'guard-a',
      identityMatches: () => identityCurrent,
      issueCredential: () => pending.promise,
      removeAccount: vi.fn(),
      revokeCredential: vi.fn(),
      revokeDelegation: vi.fn(),
      saveAccount: vi.fn(async () => account),
      saveRoles: vi.fn(),
      selectAccount: vi.fn(),
      selectedAccount: ref<ServiceAccount | null>(account),
      setAccountStatus: vi.fn(),
    }
    const state: Parameters<typeof createServiceAccountPageActions>[0]['state'] = {
      accountDialogVisible: ref(false),
      accountFormIdentity: ref('guard-a'),
      credentialDialogVisible: ref(true),
      credentialSecret: ref(null),
      detailDrawerVisible: ref(true),
      detailIdentity: ref('guard-a'),
      editingAccount: ref(null),
      pendingAccountId: ref(),
      secretDialogVisible: ref(false),
    }
    const actions = createServiceAccountPageActions({ management, state, t: (key) => key })
    const input: CreateServiceCredentialInput = {
      expires_at: '2026-08-30T00:00:00.000Z',
      label: 'automation',
    }

    const operation = actions.submitCredential(input)
    identityCurrent = false
    pending.resolve({
      credential: {
        account_id: account.id,
        created_at: '2026-08-29T00:00:00.000Z',
        expires_at: input.expires_at,
        id: 'credential-1',
        key_id: 'key-1',
        label: input.label,
        status: 'active',
      },
      secret: 'old-secret',
    })

    await expect(operation).rejects.toMatchObject({ kind: 'cancelled' })
    expect(ui.success).not.toHaveBeenCalled()
    expect(state.credentialSecret.value).toBeNull()
    expect(state.secretDialogVisible.value).toBe(false)
    expect(state.credentialDialogVisible.value).toBe(true)
  })

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
