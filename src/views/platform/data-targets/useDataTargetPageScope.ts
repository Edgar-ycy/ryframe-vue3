import { ref, type Ref } from 'vue'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'

export interface DataTargetPageScope {
  detailVisible: Ref<boolean>
  openTargetDetail: (targetKey: string) => void
  pageActive: Readonly<Ref<boolean>>
  scheduleSearch: (value: string, apply: (keyword: string) => void) => void
  selectedTargetKey: Ref<string>
}

/** 隔离数据目标页的详情选择与延迟搜索，防止旧选择进入新会话范围。 */
export function useDataTargetPageScope(): DataTargetPageScope {
  const detailVisible = ref(false)
  const selectedTargetKey = ref('')
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  function clearSearchTimer(): void {
    if (searchTimer !== undefined) clearTimeout(searchTimer)
    searchTimer = undefined
  }

  const lifecycle = useServerStatePageLifecycle(() => {
    clearSearchTimer()
    detailVisible.value = false
    selectedTargetKey.value = ''
  })

  function scheduleSearch(value: string, apply: (keyword: string) => void): void {
    clearSearchTimer()
    searchTimer = setTimeout(() => {
      searchTimer = undefined
      if (lifecycle.pageActive.value) apply(value.trim())
    }, 300)
  }

  function openTargetDetail(targetKey: string): void {
    selectedTargetKey.value = targetKey
    detailVisible.value = true
  }

  return {
    detailVisible,
    openTargetDetail,
    pageActive: lifecycle.pageActive,
    scheduleSearch,
    selectedTargetKey,
  }
}
