import { HttpError } from '@/shared/http/client'
import {
  beginServerStatePageOperation,
  type ServerStatePageOperation,
} from '@/shared/query/pageOperationScope'
import type { ServerStateScope } from '@/shared/query/scope'

interface PendingAvatarCommand {
  generation: number
  operation: ServerStatePageOperation
}

/** 将 Element Upload 的文件选择与稍后触发的自定义 HTTP 请求绑定到同一会话。 */
export function createProfileAvatarCommandScope() {
  let generation = 0
  let pending = new WeakMap<File, PendingAvatarCommand>()

  function capture(file: File): void {
    pending.set(file, { generation, operation: beginServerStatePageOperation() })
  }

  function invalidate(): void {
    generation += 1
    pending = new WeakMap<File, PendingAvatarCommand>()
  }

  async function run<T>(
    file: File,
    execute: (scope: ServerStateScope) => Promise<T>,
    apply: (result: T) => void,
  ): Promise<void> {
    const command = pending.get(file)
    pending.delete(file)
    if (!command) throw new HttpError('头像上传会话已切换', { kind: 'cancelled' })
    const ownsOperation = () => generation === command.generation
    command.operation.assertCurrent(ownsOperation)
    const result = await execute(command.operation.scope)
    command.operation.apply(() => apply(result), ownsOperation)
  }

  return { capture, invalidate, run }
}
