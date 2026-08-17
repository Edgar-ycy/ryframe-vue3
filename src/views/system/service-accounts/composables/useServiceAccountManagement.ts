import { useServiceAccountAudits } from './useServiceAccountAudits'
import { useServiceAccountContext, type ServiceAccountIdentityGuard } from './useServiceAccountContext'
import { useServiceAccountCredentials } from './useServiceAccountCredentials'
import { useServiceAccountDelegations } from './useServiceAccountDelegations'
import { useServiceAccountDirectory } from './useServiceAccountDirectory'
import { useServiceAccountLifecycle } from './useServiceAccountLifecycle'
import { useServiceAccountRoles } from './useServiceAccountRoles'

export type { ServiceAccountIdentityGuard }

/** 服务账号管理页面的稳定 facade。 */
export function useServiceAccountManagement() {
  const context = useServiceAccountContext()
  const directory = useServiceAccountDirectory(context)
  const roles = useServiceAccountRoles(context)
  const credentials = useServiceAccountCredentials(context)
  const delegations = useServiceAccountDelegations(context)
  const audits = useServiceAccountAudits(context)
  useServiceAccountLifecycle({
    clearPendingCredentialKeys: credentials.clearPendingCredentialKeys,
    context,
    refresh: directory.refresh,
  })

  return {
    accounts: context.accounts,
    accountsError: context.accountsQuery.error,
    accountsLoading: context.accountsQuery.isFetching,
    activeAuditsQueryParams: context.activeAuditsQueryParams,
    activeDelegationsQueryParams: context.activeDelegationsQueryParams,
    activeQueryParams: context.activeQueryParams,
    audits: context.audits,
    auditsError: context.auditsQuery.error,
    auditsLoading: context.auditsQuery.isFetching,
    auditsQueryParams: context.auditsQueryParams,
    canAddAccount: context.canAddAccount,
    canEditAccount: context.canEditAccount,
    canListAccounts: context.canListAccounts,
    canListAudits: context.canListAudits,
    canListDepartments: context.canListDepartments,
    canListDelegations: context.canListDelegations,
    canListRoles: context.canListRoles,
    canManageRoles: context.canManageRoles,
    canRemoveAccount: context.canRemoveAccount,
    canRevokeDelegation: context.canRevokeDelegation,
    canRevokeKey: context.canRevokeKey,
    canRotateKey: context.canRotateKey,
    captureIdentity: context.captureIdentity,
    credentials: context.credentials,
    credentialsError: context.credentialsQuery.error,
    credentialsLoading: context.credentialsQuery.isFetching,
    delegations: context.delegations,
    delegationsError: context.delegationsQuery.error,
    delegationsLoading: context.delegationsQuery.isFetching,
    delegationsQueryParams: context.delegationsQueryParams,
    detail: context.detail,
    detailError: context.detailQuery.error,
    detailLoading: context.detailQuery.isFetching,
    error: context.accountsQuery.error,
    fetchAccounts: directory.fetchAccounts,
    fetchAudits: audits.fetchAudits,
    fetchCredentials: credentials.fetchCredentials,
    fetchDelegations: delegations.fetchDelegations,
    issueCredential: credentials.issueCredential,
    issueCredentialPending: credentials.issueCredentialPending,
    identityMatches: context.identityMatches,
    loading: context.accountsQuery.isFetching,
    onIdentityChanged: context.onIdentityChanged,
    onIdentityInvalidated: context.onIdentityChanged,
    pageActive: context.pageActive,
    queryParams: context.queryParams,
    refresh: directory.refresh,
    removeAccount: directory.removeAccount,
    removePending: directory.removePending,
    resetAccountFilters: directory.resetAccountFilters,
    revokeCredential: credentials.revokeCredential,
    revokeDelegation: delegations.revokeDelegation,
    revokingCredentialId: credentials.revokingCredentialId,
    revokingDelegationId: delegations.revokingDelegationId,
    roleIds: context.roleIds,
    rolesPending: roles.rolesPending,
    saveAccount: directory.saveAccount,
    savePending: directory.savePending,
    saveRoles: roles.saveRoles,
    selectAccount: directory.selectAccount,
    selectedAccount: context.selectedAccount,
    featureAvailable: context.featureAvailable,
    setAccountStatus: directory.setAccountStatus,
    statusPending: directory.statusPending,
  }
}
