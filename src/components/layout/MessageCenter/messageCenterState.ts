import type { Ref } from 'vue'
import type { MessageRecord } from '@/api/modules/messages'
import { sameServerStateScope, type ServerStateScope } from '@/shared/query/scope'

export interface MessageDetailSeed {
  message: MessageRecord
  scope: ServerStateScope
}

interface MessageCenterUiState {
  detailSeed: Ref<MessageDetailSeed | undefined>
  detailVisible: Ref<boolean>
  pageGeneration: Ref<number>
  selectedIds: Ref<string[]>
  visible: Ref<boolean>
}

/** 会话或 KeepAlive 页面代次失效时同步撤销全部可见的消息投影。 */
export function resetMessageCenterUiState(state: MessageCenterUiState): void {
  state.pageGeneration.value += 1
  state.visible.value = false
  state.selectedIds.value = []
  state.detailVisible.value = false
  state.detailSeed.value = undefined
}

/** 详情回退正文只能属于当前完整会话范围，不能跨授权代次复用。 */
export function resolveMessageDetail(
  scope: ServerStateScope | undefined,
  messages: readonly MessageRecord[],
  seed: MessageDetailSeed | undefined,
): MessageRecord | undefined {
  if (!scope || !seed || !sameServerStateScope(scope, seed.scope)) return undefined
  return messages.find((message) => message.id === seed.message.id) ?? seed.message
}
