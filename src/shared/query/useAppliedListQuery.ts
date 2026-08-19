import { computed, ref, shallowRef, type Ref } from 'vue'

export type QuerySnapshot<TQuery extends object> = Readonly<TQuery>

function snapshot<TQuery extends object>(query: TQuery): QuerySnapshot<TQuery> {
  return Object.freeze({ ...query })
}

function isSameSnapshot<TQuery extends object>(
  left: QuerySnapshot<TQuery>,
  right: QuerySnapshot<TQuery>,
): boolean {
  const leftKeys = Object.keys(left) as Array<keyof TQuery>
  const rightKeys = Object.keys(right) as Array<keyof TQuery>
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every(key => (
    Object.prototype.hasOwnProperty.call(right, key)
    && Object.is(left[key], right[key])
  ))
}

/**
 * 管理列表筛选的草稿、已应用值和最后一次成功值。查询快照只做浅复制，
 * 调用方不应在筛选对象中放入可变的嵌套结构。
 */
export function useAppliedListQuery<TQuery extends object>(initialQuery: TQuery) {
  const draftQuery = ref({ ...initialQuery }) as Ref<TQuery>
  const appliedQuery = shallowRef<QuerySnapshot<TQuery>>(snapshot(initialQuery))
  const lastSuccessfulQuery = shallowRef<QuerySnapshot<TQuery>>()
  const hasSuccessfulQuery = computed(() => lastSuccessfulQuery.value !== undefined)
  let generation = 0

  function invalidateCurrentGeneration(): void {
    generation += 1
  }

  /** 将当前草稿应用到查询；返回值表示查询键是否发生变化。 */
  function applyDraft(): boolean {
    const nextQuery = snapshot(draftQuery.value)
    if (isSameSnapshot(nextQuery, appliedQuery.value)) return false
    invalidateCurrentGeneration()
    appliedQuery.value = nextQuery
    return true
  }

  /** 刷新当前已应用条件，不读取也不应用表单草稿。 */
  async function refreshApplied<TResult>(refresh: () => Promise<TResult>): Promise<TResult> {
    return refresh()
  }

  /** 仅允许最新代次的成功请求提交导出所需的查询快照。 */
  async function runAppliedQuery<TResult>(
    signal: AbortSignal,
    load: (query: QuerySnapshot<TQuery>, signal: AbortSignal) => Promise<TResult>,
  ): Promise<TResult> {
    const requestGeneration = ++generation
    const query = appliedQuery.value
    const result = await load(query, signal)
    if (!signal.aborted && requestGeneration === generation) {
      lastSuccessfulQuery.value = query
    }
    return result
  }

  /** 身份或租户变化时清除成功快照，并阻止旧请求重新写入。 */
  function clearSuccessfulQuery(): void {
    invalidateCurrentGeneration()
    lastSuccessfulQuery.value = undefined
  }

  return {
    appliedQuery,
    applyDraft,
    clearSuccessfulQuery,
    draftQuery,
    hasSuccessfulQuery,
    lastSuccessfulQuery,
    refreshApplied,
    runAppliedQuery,
  }
}
