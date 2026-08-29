import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, effectScope, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const lifecycle = vi.hoisted(() => ({
  activated: [] as Array<() => void>,
  deactivated: [] as Array<() => void>,
}))
const message = vi.hoisted(() => ({ success: vi.fn() }))
vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    onActivated: (callback: () => void) => lifecycle.activated.push(callback),
    onDeactivated: (callback: () => void) => lifecycle.deactivated.push(callback),
  }
})
vi.mock('element-plus', () => ({ ElMessage: message }))

import type { FlatCrudResource } from '@/components/business/flat-crud/resource'
import { useFlatCrudResource } from '@/components/business/flat-crud/useFlatCrudResource'
import { emptyPageResponse } from '@/shared/http/types'
import {
  beginServerStatePageOperation,
  type ServerStatePageOperation,
} from '@/shared/query/pageOperationScope'
import {
  deactivateServerStateScope,
  queryClient,
  transitionServerStateScope,
} from '@/shared/query/client'
import { useUserStore } from '@/stores/user'

interface RecordValue {
  id: string
  name: string
}

interface QueryValue {
  page: number
  page_size: number
}

interface FormValue {
  name: string
}

function resource(key: string) {
  const adapter = {
    create: vi.fn().mockResolvedValue(undefined),
    detail: vi.fn(async (id: string) => ({ id, name: '旧身份编辑值' })),
    list: vi.fn(async (query: QueryValue) => emptyPageResponse<RecordValue>(query)),
    remove: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  }
  const definition: FlatCrudResource<RecordValue, QueryValue, FormValue, FormValue, FormValue> = {
    adapter,
    createInput: (form) => ({ ...form }),
    editForm: (record) => ({ name: record.name }),
    emptyForm: () => ({ name: '' }),
    initialQuery: () => ({ page: 1, page_size: 10 }),
    key,
    messages: {
      addSuccess: '新增成功',
      addTitle: '新增',
      deleteConfirm: () => '确认删除',
      deleteSuccess: '删除成功',
      detailMissing: '详情缺失',
      editTitle: '编辑',
      updateSuccess: '更新成功',
      warningTitle: '警告',
    },
    recordId: (record) => record.id,
    updateInput: (form) => ({ ...form }),
  }
  return { adapter, definition }
}

function activate(subjectId: string, fingerprint: string): void {
  transitionServerStateScope(
    {
      tenantId: 'tenant-a',
      subjectId,
      authorizationFingerprint: fingerprint,
    },
    () => {
      useUserStore().$patch({
        sessionStatus: 'authenticated',
        tenantId: 'tenant-a',
        userId: subjectId,
      })
    },
  )
}

function runComposable<T>(setup: () => T): { result: T; scope: EffectScope } {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const result = app.runWithContext(() => scope.run(setup))
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, scope }
}

describe('Post/Notice 平面资源会话范围', () => {
  const scopes: EffectScope[] = []

  beforeEach(() => {
    setActivePinia(createPinia())
    queryClient.clear()
    deactivateServerStateScope()
    activate('user-a', 'authorization-a')
    lifecycle.activated.length = 0
    lifecycle.deactivated.length = 0
    message.success.mockClear()
  })

  afterEach(() => {
    while (scopes.length > 0) scopes.pop()?.stop()
    queryClient.clear()
    deactivateServerStateScope()
  })

  it.each([
    ['posts', '同租户 A→B', 'user-b', 'authorization-b'],
    ['notices', '同租户 A→B', 'user-b', 'authorization-b'],
    ['posts', '同主体授权 epoch 变化', 'user-a', 'authorization-b'],
    ['notices', '同主体授权 epoch 变化', 'user-a', 'authorization-b'],
  ])(
    '%s 在%s时同步清空旧编辑投影且延迟 submit 不发请求',
    async (key, _scenario, nextSubject, nextFingerprint) => {
      const current = resource(key)
      const composable = runComposable(() => useFlatCrudResource(current.definition))
      scopes.push(composable.scope)
      await composable.result.edit({ id: 'old-record', name: '列表旧值' })
      const staleOperation: ServerStatePageOperation = beginServerStatePageOperation()

      expect(composable.result.dialogVisible.value).toBe(true)
      expect(composable.result.form.value.name).toBe('旧身份编辑值')
      activate(nextSubject, nextFingerprint)

      expect(composable.result.dialogVisible.value).toBe(false)
      expect(composable.result.editing.value).toBe(false)
      expect(composable.result.form.value).toEqual({ name: '' })
      await expect(composable.result.submit(staleOperation)).rejects.toMatchObject({
        kind: 'cancelled',
      })
      expect(current.adapter.create).not.toHaveBeenCalled()
      expect(current.adapter.update).not.toHaveBeenCalled()
      expect(message.success).not.toHaveBeenCalled()
    },
  )

  it.each(['posts', 'notices'])(
    '%s 在 KeepAlive 失活时同步清空旧编辑投影且延迟 submit 不发请求',
    async (key) => {
      const current = resource(key)
      const composable = runComposable(() => useFlatCrudResource(current.definition))
      scopes.push(composable.scope)
      await composable.result.edit({ id: 'old-record', name: '列表旧值' })
      const staleOperation = beginServerStatePageOperation()

      expect(lifecycle.deactivated).toHaveLength(1)
      lifecycle.deactivated[0]!()

      expect(composable.result.dialogVisible.value).toBe(false)
      expect(composable.result.editing.value).toBe(false)
      expect(composable.result.form.value).toEqual({ name: '' })
      await expect(composable.result.submit(staleOperation)).rejects.toMatchObject({
        kind: 'cancelled',
      })
      expect(current.adapter.create).not.toHaveBeenCalled()
      expect(current.adapter.update).not.toHaveBeenCalled()
      expect(message.success).not.toHaveBeenCalled()
    },
  )
})
