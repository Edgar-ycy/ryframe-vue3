import { onActivated, onDeactivated } from 'vue'
import { useTenantCapacityCommands } from './useTenantCapacityCommands'
import { useTenantCapacityQueries } from './useTenantCapacityQueries'

export type { TenantCapacityFilterState } from './tenantCapacityFilters'

/** 平台租户容量管理的稳定组合入口。 */
export function useTenantCapacityManagement() {
  const queries = useTenantCapacityQueries()
  const commands = useTenantCapacityCommands(queries)

  onActivated(() => {
    void queries.setPageActive(true)
  })
  onDeactivated(() => {
    void queries.setPageActive(false)
  })

  return {
    appliedFilters: queries.appliedFilters,
    applyFilters: queries.applyFilters,
    canViewUsage: queries.canViewUsage,
    changePage: queries.changePage,
    changePageSize: queries.changePageSize,
    closeDetail: queries.closeDetail,
    createTenantRecord: commands.createTenantRecord,
    detail: queries.detail,
    detailLoading: queries.detailLoading,
    detailRefreshing: queries.detailRefreshing,
    filters: queries.filters,
    loading: queries.loading,
    openDetail: queries.openDetail,
    page: queries.page,
    pageActive: queries.pageActive,
    pageSize: queries.pageSize,
    refresh: queries.refresh,
    refreshing: queries.refreshing,
    refreshDetail: queries.refreshDetail,
    resetFilters: queries.resetFilters,
    savePending: commands.savePending,
    selectedTenantId: queries.selectedTenantId,
    setPageActive: queries.setPageActive,
    statusPending: commands.statusPending,
    tenantPage: queries.tenantPage,
    togglingTenantId: commands.togglingTenantId,
    toggleTenantStatus: commands.toggleTenantStatus,
    updateTenantRecord: commands.updateTenantRecord,
  }
}
