import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, effectScope, ref, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  acknowledgeMessages: vi.fn(),
  deleteMessages: vi.fn(),
  getUnreadMessageCount: vi.fn(),
  listMessages: vi.fn(),
  markAllMessagesRead: vi.fn(),
  markMessageRead: vi.fn(),
}))
const ui = vi.hoisted(() => ({
  confirm: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}))

vi.mock('@/api/modules/messages', () => api)

vi.mock('element-plus', () => ({
  ElMessage: {
    error: ui.error,
    success: ui.success,
    warning: ui.warning,
  },
  ElMessageBox: { confirm: ui.confirm },
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

import type { MessageRecord } from '@/api/modules/messages'
import { useMessageCenterQueries } from '@/app/messages/messageHooks'
import {
  resetMessageCenterUiState,
  resolveMessageDetail,
  type MessageDetailSeed,
} from '@/components/layout/MessageCenter/messageCenterState'
import { useMessageCenterActions } from '@/components/layout/MessageCenter/useMessageCenterActions'
import { HttpError } from '@/shared/http/client'
import {
  deactivateServerStateScope,
  getServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import type { ServerStateScope } from '@/shared/query/scope'
import { useUserStore } from '@/stores/user'

function activate(fingerprint: string): ServerStateScope {
  transitionServerStateScope(
    {
      tenantId: 'tenant-a',
      subjectId: 'user-a',
      authorizationFingerprint: fingerprint,
    },
    () => undefined,
    { force: true },
  )
  const scope = getServerStateScope()
  if (!scope) throw new Error('测试会话范围未建立')
  return {
    tenantId: scope.tenantId,
    subjectId: scope.subjectId,
    sessionEpoch: scope.sessionEpoch,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept
    reject = decline
  })
  return { promise, reject, resolve }
}

function message(id = 'message-old'): MessageRecord {
  return {
    acked_at: null,
    content: '旧会话正文',
    expires_at: null,
    id,
    payload: null,
    published_at: '2026-08-29T00:00:00.000Z',
    read_at: null,
    severity: 'info',
    title: '旧会话消息',
    topic: 'system',
  }
}

function createHarness() {
  const detailSeed = ref<MessageDetailSeed>()
  const detailVisible = ref(false)
  const pageGeneration = ref(0)
  const selectedIds = ref<string[]>([])
  const messageCenter = {
    markAllRead: vi.fn(async () => undefined),
    markRead: vi.fn(async () => undefined),
    refresh: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  }
  const messageStore = { markMessagesDeleted: vi.fn() }
  const actions = useMessageCenterActions({
    detailSeed,
    detailVisible,
    messageCenter,
    messageStore,
    pageGeneration,
    selectedIds,
  })
  return {
    actions,
    detailSeed,
    detailVisible,
    messageCenter,
    messageStore,
    pageGeneration,
    selectedIds,
  }
}

function runComposable<T>(setup: () => T): { result: T; scope: EffectScope } {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const result = app.runWithContext(() => scope.run(setup))
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, scope }
}

describe('MessageCenter 页面与会话范围', () => {
  beforeEach(() => {
    deactivateServerStateScope()
    queryClient.clear()
    setActivePinia(createPinia())
    useUserStore().$patch({
      sessionStatus: 'authenticated',
      tenantId: 'tenant-a',
      userId: 'user-a',
    })
    activate('authorization-a')
    vi.clearAllMocks()
    api.getUnreadMessageCount.mockResolvedValue({ data: 0 })
    api.listMessages.mockResolvedValue({ data: { next_cursor: null, records: [] } })
  })

  afterEach(() => {
    queryClient.clear()
    deactivateServerStateScope()
  })

  it('nextTick 中切换同主体 epoch 后不向新身份发送旧消息已读请求', async () => {
    const harness = createHarness()
    const operation = harness.actions.openDetail(message())

    activate('authorization-b')
    await operation

    expect(harness.messageCenter.markRead).not.toHaveBeenCalled()
    expect(ui.error).not.toHaveBeenCalled()
  })

  it.each([
    [
      '单条删除',
      (harness: ReturnType<typeof createHarness>) => harness.actions.deleteOne(message()),
    ],
    [
      '批量删除',
      (harness: ReturnType<typeof createHarness>) => {
        harness.selectedIds.value = ['message-old']
        return harness.actions.deleteSelected()
      },
    ],
  ])('confirm 等待期间切换 epoch 后%s零请求且零提示', async (_label, start) => {
    const confirmation = deferred<unknown>()
    ui.confirm.mockReturnValue(confirmation.promise)
    const harness = createHarness()
    const operation = start(harness)

    activate('authorization-b')
    confirmation.resolve('confirm')
    await operation

    expect(harness.messageCenter.remove).not.toHaveBeenCalled()
    expect(harness.messageStore.markMessagesDeleted).not.toHaveBeenCalled()
    expect(ui.error).not.toHaveBeenCalled()
    expect(ui.success).not.toHaveBeenCalled()
  })

  it('KeepAlive 页面代次失效后 confirm 结果不再触发删除', async () => {
    const confirmation = deferred<unknown>()
    ui.confirm.mockReturnValue(confirmation.promise)
    const harness = createHarness()
    const operation = harness.actions.deleteOne(message())

    harness.pageGeneration.value += 1
    confirmation.resolve('confirm')
    await operation

    expect(harness.messageCenter.remove).not.toHaveBeenCalled()
    expect(ui.error).not.toHaveBeenCalled()
  })

  it('消息 mutation 收到旧 expectedScope 时拒绝执行任何接口', async () => {
    const oldScope = getServerStateScope()
    if (!oldScope) throw new Error('缺少旧会话范围')
    const composable = runComposable(() =>
      useMessageCenterQueries({ limit: 100, unread_only: false }),
    )

    activate('authorization-b')
    await expect(composable.result.markRead('message-old', oldScope)).rejects.toMatchObject({
      kind: 'cancelled',
    })
    await expect(composable.result.remove(['message-old'], oldScope)).rejects.toMatchObject({
      kind: 'cancelled',
    })
    await expect(composable.result.markAllRead(oldScope)).rejects.toMatchObject({
      kind: 'cancelled',
    })
    await expect(composable.result.acknowledge(['message-old'], oldScope)).rejects.toMatchObject({
      kind: 'cancelled',
    })

    expect(api.markMessageRead).not.toHaveBeenCalled()
    expect(api.deleteMessages).not.toHaveBeenCalled()
    expect(api.markAllMessagesRead).not.toHaveBeenCalled()
    expect(api.acknowledgeMessages).not.toHaveBeenCalled()
    composable.scope.stop()
  })

  it('删除请求在会话失效后返回错误时不写页面状态且不提示', async () => {
    ui.confirm.mockResolvedValue('confirm')
    const removal = deferred<undefined>()
    const harness = createHarness()
    harness.messageCenter.remove.mockReturnValue(removal.promise)
    const operation = harness.actions.deleteOne(message())
    await vi.waitFor(() => expect(harness.messageCenter.remove).toHaveBeenCalledOnce())

    activate('authorization-b')
    removal.reject(new HttpError('会话已切换', { kind: 'cancelled' }))
    await operation

    expect(harness.messageStore.markMessagesDeleted).not.toHaveBeenCalled()
    expect(ui.error).not.toHaveBeenCalled()
    expect(ui.success).not.toHaveBeenCalled()
  })

  it('同主体 epoch 切换后旧详情回退正文不可见且同步清空抽屉状态', () => {
    const oldScope = getServerStateScope()
    if (!oldScope) throw new Error('缺少旧会话范围')
    const record = message()
    const seed: MessageDetailSeed = { message: record, scope: oldScope }
    expect(resolveMessageDetail(oldScope, [], seed)).toBe(record)

    const currentScope = activate('authorization-b')
    expect(resolveMessageDetail(currentScope, [], seed)).toBeUndefined()

    const state = {
      detailSeed: ref<MessageDetailSeed | undefined>(seed),
      detailVisible: ref(true),
      pageGeneration: ref(7),
      selectedIds: ref(['message-old']),
      visible: ref(true),
    }
    resetMessageCenterUiState(state)
    expect(state.pageGeneration.value).toBe(8)
    expect(state.visible.value).toBe(false)
    expect(state.selectedIds.value).toEqual([])
    expect(state.detailVisible.value).toBe(false)
    expect(state.detailSeed.value).toBeUndefined()
  })
})
