import { nextTick, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type {
  CreateServiceAccountInput,
  CreateServiceCredentialInput,
  ServiceAccount,
  ServiceCredential,
  ServiceDelegation,
  UpdateServiceAccountInput,
} from '@/api/modules/serviceAccount'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import { confirmAction } from '@/utils/confirmAction'
import type {
  ServiceAccountIdentityGuard,
  useServiceAccountManagement,
} from './composables/useServiceAccountManagement'

type Management = Pick<
  ReturnType<typeof useServiceAccountManagement>,
  | 'captureIdentity'
  | 'identityMatches'
  | 'issueCredential'
  | 'removeAccount'
  | 'revokeCredential'
  | 'revokeDelegation'
  | 'saveAccount'
  | 'saveRoles'
  | 'selectAccount'
  | 'selectedAccount'
  | 'setAccountStatus'
>

interface ServiceAccountPageState {
  accountDialogVisible: Ref<boolean>
  accountFormIdentity: Ref<ServiceAccountIdentityGuard | undefined>
  credentialDialogVisible: Ref<boolean>
  credentialSecret: Ref<string | null>
  detailDrawerVisible: Ref<boolean>
  detailIdentity: Ref<ServiceAccountIdentityGuard | undefined>
  editingAccount: Ref<ServiceAccount | null>
  pendingAccountId: Ref<string | undefined>
  secretDialogVisible: Ref<boolean>
}

interface ServiceAccountPageActionsOptions {
  management: Management
  state: ServiceAccountPageState
  t: (key: string, values?: Record<string, string | number>) => string
}

/** 将页面提示、对话框与一次性密钥绑定到操作开始时的完整会话范围。 */
export function createServiceAccountPageActions(options: ServiceAccountPageActionsOptions) {
  const { management, state, t } = options

  async function submitAccount(
    input: CreateServiceAccountInput | UpdateServiceAccountInput,
  ): Promise<void> {
    const guard = state.accountFormIdentity.value
    if (!management.identityMatches(guard)) return
    const operation = beginServerStatePageOperation()
    const ownsOperation = () => management.identityMatches(guard)
    const editingId = state.editingAccount.value?.id
    const account = await management.saveAccount(input, editingId, guard)
    operation.apply(
      () => ElMessage.success(t(editingId ? 'serviceAccounts.updated' : 'serviceAccounts.created')),
      ownsOperation,
    )
    operation.apply(() => {
      state.editingAccount.value = account
    }, ownsOperation)
    operation.apply(() => {
      state.accountDialogVisible.value = false
    }, ownsOperation)
  }

  async function openDetails(account: ServiceAccount): Promise<void> {
    const operation = beginServerStatePageOperation()
    const guard = management.captureIdentity()
    if (!management.identityMatches(guard)) return
    const ownsOperation = () => management.identityMatches(guard)
    operation.apply(() => {
      state.detailIdentity.value = guard
    }, ownsOperation)
    await management.selectAccount(account, guard)
    operation.apply(() => {
      state.detailDrawerVisible.value = true
    }, ownsOperation)
  }

  async function closeDetails(): Promise<void> {
    const operation = beginServerStatePageOperation()
    const guard = state.detailIdentity.value
    if (!management.identityMatches(guard)) return
    const ownsOperation = () => management.identityMatches(guard)
    operation.apply(() => {
      state.detailDrawerVisible.value = false
    }, ownsOperation)
    operation.apply(() => {
      state.detailIdentity.value = undefined
    }, ownsOperation)
    await management.selectAccount(null, guard)
    operation.assertCurrent(ownsOperation)
  }

  async function confirmStatusChange(account: ServiceAccount): Promise<void> {
    const operation = beginServerStatePageOperation()
    const guard = management.captureIdentity()
    const ownsOperation = () => management.identityMatches(guard)
    const nextStatus = account.status === '1' ? 'disabled' : 'enabled'
    const confirmed = await confirmAction(
      t('serviceAccounts.statusConfirm', {
        name: account.name,
        status: t(
          nextStatus === 'enabled' ? 'serviceAccounts.enabled' : 'serviceAccounts.disabled',
        ),
      }),
      t('serviceAccounts.statusConfirmTitle'),
      {
        type: 'warning',
        confirmButtonText: t(
          nextStatus === 'enabled' ? 'serviceAccounts.enable' : 'serviceAccounts.disable',
        ),
      },
    )
    operation.assertCurrent(ownsOperation)
    if (!confirmed || !management.identityMatches(guard)) return
    operation.apply(() => {
      state.pendingAccountId.value = account.id
    }, ownsOperation)
    try {
      await management.setAccountStatus(account, nextStatus, guard)
      operation.apply(() => ElMessage.success(t('serviceAccounts.statusUpdated')), ownsOperation)
    } finally {
      if (operation.isCurrent(ownsOperation) && state.pendingAccountId.value === account.id) {
        state.pendingAccountId.value = undefined
      }
    }
  }

  async function confirmRemove(account: ServiceAccount): Promise<void> {
    const operation = beginServerStatePageOperation()
    const guard = management.captureIdentity()
    const ownsOperation = () => management.identityMatches(guard)
    const confirmed = await confirmAction(
      t('serviceAccounts.removeConfirm', { name: account.name }),
      t('serviceAccounts.removeConfirmTitle'),
      { type: 'error', confirmButtonText: t('serviceAccounts.remove') },
    )
    operation.assertCurrent(ownsOperation)
    if (!confirmed || !management.identityMatches(guard)) return
    operation.apply(() => {
      state.pendingAccountId.value = account.id
    }, ownsOperation)
    try {
      await management.removeAccount(account, guard)
      operation.apply(() => ElMessage.success(t('serviceAccounts.removed')), ownsOperation)
    } finally {
      if (operation.isCurrent(ownsOperation) && state.pendingAccountId.value === account.id) {
        state.pendingAccountId.value = undefined
      }
    }
  }

  async function submitRoles(nextRoleIds: string[]): Promise<void> {
    const guard = state.detailIdentity.value
    const accountId = management.selectedAccount.value?.id
    if (!accountId || !management.identityMatches(guard)) return
    const operation = beginServerStatePageOperation()
    const ownsOperation = () => management.identityMatches(guard)
    await management.saveRoles(accountId, nextRoleIds, guard)
    operation.apply(() => ElMessage.success(t('serviceAccounts.rolesSaved')), ownsOperation)
  }

  async function submitCredential(input: CreateServiceCredentialInput): Promise<void> {
    const guard = state.detailIdentity.value
    const accountId = management.selectedAccount.value?.id
    if (!accountId || !management.identityMatches(guard)) return
    const operation = beginServerStatePageOperation()
    const ownsOperation = () => management.identityMatches(guard)
    const result = await management.issueCredential(accountId, input, guard)
    operation.apply(() => {
      state.credentialDialogVisible.value = false
    }, ownsOperation)
    operation.apply(() => ElMessage.success(t('serviceAccounts.credentialCreated')), ownsOperation)
    operation.apply(() => {
      state.credentialSecret.value = result.secret ?? null
    }, ownsOperation)
    await nextTick()
    operation.apply(() => {
      state.secretDialogVisible.value = true
    }, ownsOperation)
  }

  async function confirmRevokeCredential(credential: ServiceCredential): Promise<void> {
    const guard = state.detailIdentity.value
    const accountId = management.selectedAccount.value?.id
    if (!accountId || !management.identityMatches(guard)) return
    const operation = beginServerStatePageOperation()
    const ownsOperation = () => management.identityMatches(guard)
    const confirmed = await confirmAction(
      t('serviceAccounts.revokeCredentialConfirm', { label: credential.label }),
      t('serviceAccounts.revokeCredentialTitle'),
      { type: 'error', confirmButtonText: t('serviceAccounts.revoke') },
    )
    operation.assertCurrent(ownsOperation)
    if (!confirmed || !management.identityMatches(guard)) return
    await management.revokeCredential(accountId, credential, guard)
    operation.apply(() => ElMessage.success(t('serviceAccounts.credentialRevoked')), ownsOperation)
  }

  async function confirmRevokeDelegation(delegation: ServiceDelegation): Promise<void> {
    const operation = beginServerStatePageOperation()
    const guard = management.captureIdentity()
    const ownsOperation = () => management.identityMatches(guard)
    const confirmed = await confirmAction(
      t('serviceAccounts.revokeDelegationConfirm'),
      t('serviceAccounts.revokeDelegationTitle'),
      { type: 'error', confirmButtonText: t('serviceAccounts.revoke') },
    )
    operation.assertCurrent(ownsOperation)
    if (!confirmed || !management.identityMatches(guard)) return
    await management.revokeDelegation(delegation, guard)
    operation.apply(() => ElMessage.success(t('serviceAccounts.delegationRevoked')), ownsOperation)
  }

  return {
    closeDetails,
    confirmRemove,
    confirmRevokeCredential,
    confirmRevokeDelegation,
    confirmStatusChange,
    openDetails,
    submitAccount,
    submitCredential,
    submitRoles,
  }
}
