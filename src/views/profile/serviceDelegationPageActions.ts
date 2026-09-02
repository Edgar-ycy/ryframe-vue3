import type {
  CreateProfileServiceDelegationInput,
  CreatedProfileServiceDelegation,
  ProfileServiceDelegation,
} from '@/api/modules/profileServiceDelegation'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'

interface ProfileServiceDelegationPageActionsOptions {
  identityMatches: (guard: string | undefined) => boolean
  issueDelegation: (
    input: CreateProfileServiceDelegationInput,
    guard: string | undefined,
  ) => Promise<CreatedProfileServiceDelegation>
  notifyCreated: () => void
  notifyRevoked: () => void
  revokeDelegation: (
    delegation: ProfileServiceDelegation,
    guard: string | undefined,
  ) => Promise<void>
}

/** 页面层只在发起操作的完整会话范围仍有效时展示一次性材料和成功提示。 */
export function createProfileServiceDelegationPageActions(
  options: ProfileServiceDelegationPageActionsOptions,
) {
  async function createServiceDelegation(
    input: CreateProfileServiceDelegationInput,
    guard: string | undefined,
    done: (token: string | null) => void,
  ): Promise<void> {
    if (!options.identityMatches(guard)) return
    const operation = beginServerStatePageOperation()
    const result = await options.issueDelegation(input, guard)
    const ownsOperation = () => options.identityMatches(guard)
    operation.apply(options.notifyCreated, ownsOperation)
    operation.apply(() => done(result.token ?? null), ownsOperation)
  }

  async function revokeServiceDelegation(
    delegation: ProfileServiceDelegation,
    guard: string | undefined,
  ): Promise<void> {
    if (!options.identityMatches(guard)) return
    const operation = beginServerStatePageOperation()
    await options.revokeDelegation(delegation, guard)
    operation.apply(options.notifyRevoked, () => options.identityMatches(guard))
  }

  return { createServiceDelegation, revokeServiceDelegation }
}
