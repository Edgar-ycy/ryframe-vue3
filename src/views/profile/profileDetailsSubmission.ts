import type { ProfileUpdateParams } from '@/api/modules/auth'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import type { ServerStateScope } from '@/shared/query/scope'

interface ProfileDetailsSubmissionOptions {
  payload: () => ProfileUpdateParams
  save: (payload: ProfileUpdateParams, expectedScope: ServerStateScope) => Promise<void>
  saved: (payload: ProfileUpdateParams) => void
  validate: () => Promise<boolean>
}

/** 将异步表单校验、HTTP 写入和成功回调绑定到同一页面与会话代次。 */
export function createProfileDetailsSubmission(options: ProfileDetailsSubmissionOptions) {
  let generation = 0

  function invalidate(): void {
    generation += 1
  }

  async function submit(): Promise<void> {
    const capturedGeneration = generation
    const operation = beginServerStatePageOperation()
    const ownsOperation = () => generation === capturedGeneration
    const valid = await options.validate()
    operation.assertCurrent(ownsOperation)
    if (!valid) return

    const payload = options.payload()
    operation.assertCurrent(ownsOperation)
    await options.save(payload, operation.scope)
    operation.apply(() => options.saved(payload), ownsOperation)
  }

  return { invalidate, submit }
}
