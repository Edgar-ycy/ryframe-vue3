import { ref, computed } from 'vue'

/**
 * 通用 Loading 状态管理
 * 
 * @example
 * const { loading, startLoading, stopLoading, withLoading } = useLoading()
 * withLoading(() => fetchData())
 */
export function useLoading(initial = false) {
  const loading = ref(initial)
  /** 活跃的并发请求数（用于并发场景） */
  const pendingCount = ref(0)
  const isActive = computed(() => pendingCount.value > 0 || loading.value)

  function startLoading() {
    loading.value = true
  }

  function stopLoading() {
    loading.value = false
  }

  /** 包裹异步函数，自动管理 loading 状态 */
  async function withLoading<T>(fn: () => Promise<T>): Promise<T> {
    pendingCount.value++
    loading.value = true
    try {
      return await fn()
    } finally {
      pendingCount.value--
      if (pendingCount.value === 0) {
        loading.value = false
      }
    }
  }

  return {
    loading,
    isActive,
    startLoading,
    stopLoading,
    withLoading,
  }
}
