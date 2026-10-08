import { ref, watch } from 'vue'
import type { TableInstance } from 'element-plus'
import type { Id } from '@/shared/http/types'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'

/** 选中范围只属于当前可见页，不能跨查询或会话保留。 */
export function useExportRowSelection<TRecord extends object>(
  currentRows: () => readonly TRecord[],
  loading: () => boolean,
  recordId: (record: TRecord) => Id,
) {
  const exportTableRef = ref<TableInstance>()
  const selectedExportIds = ref<Id[]>([])
  const lifecycle = useServerStatePageLifecycle(clearSelection)
  let selectionRevision = 0

  function clearSelection(): void {
    selectionRevision += 1
    selectedExportIds.value = []
    exportTableRef.value?.clearSelection()
  }

  watch(currentRows, lifecycle.resetPageState, { flush: 'sync' })
  watch(loading, (pending) => pending && lifecycle.resetPageState(), { flush: 'sync' })

  function handleExportSelectionChange(rows: readonly TRecord[]): void {
    selectionRevision += 1
    if (loading() || !lifecycle.pageActive.value) {
      selectedExportIds.value = []
      return
    }
    const visibleIds = new Set(currentRows().map(recordId))
    selectedExportIds.value = [...new Set(rows.map(recordId))].filter((id) => visibleIds.has(id))
  }

  function selectCurrentPage(): void {
    if (loading() || !lifecycle.pageActive.value) return
    for (const row of currentRows()) exportTableRef.value?.toggleRowSelection(row, true)
  }

  return {
    exportTableRef,
    setExportTableRef: (table: unknown) => {
      exportTableRef.value = table as TableInstance | undefined
    },
    selectedExportIds,
    handleExportSelectionChange,
    selectCurrentPage,
    captureSelectionOwnership: () => {
      const ownsPage = lifecycle.captureOwnership()
      const revision = selectionRevision
      return () => ownsPage() && revision === selectionRevision
    },
  }
}
