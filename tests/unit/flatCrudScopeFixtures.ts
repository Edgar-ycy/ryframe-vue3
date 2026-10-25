import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp, effectScope, type EffectScope } from 'vue'
import { vi } from 'vitest'
import type { FlatCrudResource } from '@/components/business/flat-crud/resource'
import { emptyPageResponse } from '@/shared/http/types'
import { queryClient, transitionServerStateScope } from '@/shared/query/client'
import { useUserStore } from '@/stores/user'

export interface RecordValue {
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

export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

export function resource(key: string) {
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
  const readPermission = key === 'notices' ? 'system:notice:list' : 'system:post:list'
  return { adapter, definition, readPermission }
}

export function activate(
  subjectId: string,
  fingerprint: string,
  permissions = ['system:post:list', 'system:notice:list'],
): void {
  transitionServerStateScope(
    {
      tenantId: 'tenant-a',
      subjectId,
      authorizationFingerprint: fingerprint,
    },
    () => {
      useUserStore().$patch({
        sessionStatus: 'authenticated',
        permissions,
        tenantId: 'tenant-a',
        userId: subjectId,
      })
    },
  )
}

export function runComposable<T>(setup: () => T): { result: T; scope: EffectScope } {
  const app = createApp({ render: () => null })
  app.use(VueQueryPlugin, { queryClient })
  const scope = effectScope()
  const result = app.runWithContext(() => scope.run(setup))
  if (!result) throw new Error('测试组合式函数未返回结果')
  return { result, scope }
}
