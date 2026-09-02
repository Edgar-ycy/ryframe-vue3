import { ref, type Ref } from 'vue'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'

export interface LogPageScope<TRecord extends object> {
  captureOwnership: () => () => boolean
  detailRow: Ref<Partial<TRecord>>
  detailVisible: Ref<boolean>
  pageActive: Readonly<Ref<boolean>>
  showDetail: (record: TRecord) => void
}

/** 统一隔离审计日志页面的导出快照、详情投影与 KeepAlive 生命周期。 */
export function useLogPageScope<TRecord extends object>(
  clearSuccessfulQuery: () => void,
): LogPageScope<TRecord> {
  const detailVisible = ref(false)
  const detailRow = ref<Partial<TRecord>>({}) as Ref<Partial<TRecord>>
  const lifecycle = useServerStatePageLifecycle(() => {
    clearSuccessfulQuery()
    detailVisible.value = false
    detailRow.value = {}
  })

  function showDetail(record: TRecord): void {
    detailRow.value = record
    detailVisible.value = true
  }

  return {
    captureOwnership: lifecycle.captureOwnership,
    detailRow,
    detailVisible,
    pageActive: lifecycle.pageActive,
    showDetail,
  }
}
