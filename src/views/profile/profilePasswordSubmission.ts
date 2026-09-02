import type { PasswordChangeParams } from '@/api/modules/auth'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import type { ServerStateScope } from '@/shared/query/scope'

interface ProfilePasswordSubmissionOptions {
  applied: () => void
  password: () => PasswordChangeParams
  save: (
    password: PasswordChangeParams,
    expectedScope: ServerStateScope,
    applied: () => void,
  ) => Promise<void>
  validate: () => Promise<boolean>
}

/** 密码表单从异步校验开始即固定页面代次与完整会话范围。 */
export function createProfilePasswordSubmission(options: ProfilePasswordSubmissionOptions) {
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

    const password = options.password()
    operation.assertCurrent(ownsOperation)
    await options.save(password, operation.scope, () => {
      if (operation.isCurrent(ownsOperation)) operation.apply(options.applied, ownsOperation)
    })
  }

  return { invalidate, submit }
}
