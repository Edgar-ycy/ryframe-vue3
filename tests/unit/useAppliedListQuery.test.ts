import { describe, expect, it, vi } from 'vitest'
import { useAppliedListQuery } from '@/shared/query/useAppliedListQuery'

interface TestQuery {
  keyword: string
  page: number
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

describe('列表成功筛选快照', () => {
  it('明确区分草稿、已应用条件和最后一次成功条件', async () => {
    const state = useAppliedListQuery<TestQuery>({ keyword: '', page: 1 })
    const controller = new AbortController()

    state.draftQuery.value.keyword = '草稿'
    expect(state.appliedQuery.value.keyword).toBe('')
    expect(state.lastSuccessfulQuery.value).toBeUndefined()

    expect(state.applyDraft()).toBe(true)
    expect(state.appliedQuery.value).toEqual({ keyword: '草稿', page: 1 })
    expect(state.lastSuccessfulQuery.value).toBeUndefined()

    await state.runAppliedQuery(controller.signal, async (query) => query.keyword)
    expect(state.lastSuccessfulQuery.value).toEqual({ keyword: '草稿', page: 1 })
    expect(state.hasSuccessfulQuery.value).toBe(true)
  })

  it('刷新已应用条件时不会读取未提交草稿', async () => {
    const state = useAppliedListQuery<TestQuery>({ keyword: '已应用', page: 1 })
    const controller = new AbortController()
    const refresh = vi.fn(async () => '已刷新')

    await state.runAppliedQuery(controller.signal, async () => '首次成功')

    state.draftQuery.value.keyword = '未提交草稿'

    await expect(state.refreshApplied(refresh)).resolves.toBe('已刷新')
    expect(refresh).toHaveBeenCalledOnce()
    expect(state.appliedQuery.value).toEqual({ keyword: '已应用', page: 1 })
    expect(state.lastSuccessfulQuery.value).toEqual({ keyword: '已应用', page: 1 })
  })

  it('失败请求保留最后一次成功快照', async () => {
    const state = useAppliedListQuery<TestQuery>({ keyword: '首次', page: 1 })
    const controller = new AbortController()

    await state.runAppliedQuery(controller.signal, async () => '成功')
    state.draftQuery.value.keyword = '失败条件'
    state.applyDraft()

    await expect(
      state.runAppliedQuery(controller.signal, async () => {
        throw new Error('请求失败')
      }),
    ).rejects.toThrow('请求失败')
    expect(state.lastSuccessfulQuery.value).toEqual({ keyword: '首次', page: 1 })
  })

  it('并发请求只有最新代次能提交成功快照', async () => {
    const state = useAppliedListQuery<TestQuery>({ keyword: '较早', page: 1 })
    const first = deferred<string>()
    const second = deferred<string>()
    const controller = new AbortController()

    const firstRun = state.runAppliedQuery(controller.signal, async () => first.promise)
    state.draftQuery.value.keyword = '最新'
    state.applyDraft()
    const secondRun = state.runAppliedQuery(controller.signal, async () => second.promise)

    second.resolve('最新响应')
    await secondRun
    first.resolve('较早响应')
    await firstRun

    expect(state.lastSuccessfulQuery.value).toEqual({ keyword: '最新', page: 1 })
  })

  it('显式清除会阻止在途旧请求恢复成功快照', async () => {
    const state = useAppliedListQuery<TestQuery>({ keyword: '旧身份', page: 1 })
    const pending = deferred<string>()
    const controller = new AbortController()
    const run = state.runAppliedQuery(controller.signal, async () => pending.promise)

    state.clearSuccessfulQuery()
    pending.resolve('旧身份响应')
    await run

    expect(state.lastSuccessfulQuery.value).toBeUndefined()
    expect(state.hasSuccessfulQuery.value).toBe(false)
  })
})
