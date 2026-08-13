/** 服务账号分页与详情使用的租户、用户双重身份隔离资源名。 */
export const SERVICE_ACCOUNTS_RESOURCE = 'service-accounts'

/** 服务账号 API Key 元数据使用的身份隔离资源名。 */
export const SERVICE_CREDENTIALS_RESOURCE = 'service-account-credentials'

/** 服务账号角色快照使用的身份隔离资源名。 */
export const SERVICE_ACCOUNT_ROLES_RESOURCE = 'service-account-roles'

/** 租户服务委托分页使用的身份隔离资源名。 */
export const SERVICE_DELEGATIONS_RESOURCE = 'service-delegations'

/** Agent 访问审计分页使用的身份隔离资源名。 */
export const SERVICE_ACCESS_AUDITS_RESOURCE = 'service-access-audits'

export const SERVICE_ACCOUNT_RESOURCES = [
  SERVICE_ACCOUNTS_RESOURCE,
  SERVICE_CREDENTIALS_RESOURCE,
  SERVICE_ACCOUNT_ROLES_RESOURCE,
  SERVICE_DELEGATIONS_RESOURCE,
  SERVICE_ACCESS_AUDITS_RESOURCE,
] as const
