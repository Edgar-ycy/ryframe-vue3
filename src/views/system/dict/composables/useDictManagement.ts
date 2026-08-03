import {
  deleteDictData,
  deleteDictType,
  exportDictType,
  listDictData,
  listDictType,
  type DictDataRecord,
  type DictTypeQuery,
  type DictTypeRecord,
} from '@/api/modules/dict'
import { useAsyncExport } from '@/hooks/useAsyncExport'
import { translate } from '@/i18n'
import type { Id, PageResponse } from '@/shared/http/types'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'

export function useDictManagement() {
  const typePage = ref<DictTypeQuery>({ page: 1, page_size: 10 })
  const currentType = ref<DictTypeRecord | null>(null)
  const typeDialogVisible = ref(false)
  const editingType = ref<DictTypeRecord | null>(null)
  const dataDialogVisible = ref(false)
  const editingData = ref<DictDataRecord | null>(null)

  const userStore = useUserStore()
  const { pending: exportLoading, exportAndDownload } = useAsyncExport(() => userStore.tenantId)
  const authenticated = () => userStore.sessionStatus === 'authenticated'

  const typesQuery = useTenantQuery<PageResponse<DictTypeRecord>>(
    () => userStore.tenantId,
    authenticated,
    'dict-types',
    () => ({ scope: 'list', filters: { ...typePage.value } }),
    async signal => {
      const response = await listDictType({ ...typePage.value }, signal)
      return response.data ?? {
        items: [],
        page: typePage.value.page ?? 1,
        page_size: typePage.value.page_size ?? 10,
        total: 0,
        total_pages: 0,
        max_page_size: typePage.value.page_size ?? 10,
      }
    },
  )
  const dataQuery = useTenantQuery<DictDataRecord[]>(
    () => userStore.tenantId,
    () => authenticated() && currentType.value !== null,
    'dict-data',
    () => ({ scope: 'list', typeCode: currentType.value?.code ?? null }),
    async signal => {
      const typeCode = currentType.value?.code
      if (!typeCode) return []
      const response = await listDictData({ type_code: typeCode }, signal)
      return response.data ?? []
    },
  )

  const typeList = computed(() => typesQuery.data.value?.items ?? [])
  const typeTotal = computed(() => typesQuery.data.value?.total ?? 0)
  const typeLoading = computed(() => typesQuery.isFetching.value)
  const dataList = computed(() => dataQuery.data.value ?? [])
  const dataLoading = computed(() => dataQuery.isFetching.value)

  watch(typeList, items => {
    if (!currentType.value) return
    currentType.value = items.find(item => item.id === currentType.value?.id) ?? null
  })

  const deleteTypeMutation = useTenantMutation<void, DictTypeRecord>(
    () => userStore.tenantId,
    'dict-types',
    {
      mutationFn: async dictType => {
        await deleteDictType(dictType.id)
      },
      onSuccess: () => {
        ElMessage.success(translate('system.common.deleteSuccess'))
      },
    },
  )
  const deleteDataMutation = useTenantMutation<void, DictDataRecord>(
    () => userStore.tenantId,
    'dict-data',
    {
      mutationFn: async dictData => {
        await deleteDictData(dictData.id)
      },
      onSuccess: () => {
        ElMessage.success(translate('system.common.deleteSuccess'))
      },
    },
  )
  const deletingTypeId = computed<Id | null>(() => (
    deleteTypeMutation.pending.value
      ? deleteTypeMutation.variables.value?.id ?? null
      : null
  ))
  const deletingDataId = computed<Id | null>(() => (
    deleteDataMutation.pending.value
      ? deleteDataMutation.variables.value?.id ?? null
      : null
  ))

  function clearCurrentType(): void {
    currentType.value = null
  }

  async function fetchTypeList(): Promise<void> {
    await typesQuery.refetch({ throwOnError: true })
  }

  async function fetchDataList(): Promise<void> {
    if (!currentType.value) return
    await dataQuery.refetch({ throwOnError: true })
  }

  function handleExport(): Promise<void> {
    return exportAndDownload(signal => exportDictType(typePage.value, signal), {
      filename: translate('system.dict.exportFilename'),
    })
  }

  async function handleTypeClick(dictType: DictTypeRecord): Promise<void> {
    const unchanged = currentType.value?.id === dictType.id
    currentType.value = dictType
    if (unchanged) await fetchDataList()
  }

  function handleAddType(): void {
    editingType.value = null
    typeDialogVisible.value = true
  }

  function handleEditType(dictType: DictTypeRecord): void {
    editingType.value = dictType
    typeDialogVisible.value = true
  }

  async function handleTypeSaved(): Promise<void> {
    await fetchTypeList()
  }

  async function handleDeleteType(dictType: DictTypeRecord): Promise<void> {
    if (deleteTypeMutation.pending.value) return
    const confirmed = await confirmAction(
      translate('system.dict.deleteTypeConfirm', { name: dictType.name }),
      translate('system.common.warning'),
      {
        type: 'warning',
        confirmButtonText: translate('system.common.confirmDelete'),
      },
    )
    if (!confirmed) return

    await deleteTypeMutation.mutateAsync(dictType)
    if (currentType.value?.id === dictType.id) clearCurrentType()
    if (typeList.value.length === 1 && (typePage.value.page ?? 1) > 1) {
      typePage.value.page = (typePage.value.page ?? 1) - 1
    }
    await fetchTypeList()
  }

  function handleAddData(): void {
    if (!currentType.value) return
    editingData.value = null
    dataDialogVisible.value = true
  }

  function handleEditData(dictData: DictDataRecord): void {
    editingData.value = dictData
    dataDialogVisible.value = true
  }

  async function handleDataSaved(): Promise<void> {
    await fetchDataList()
  }

  async function handleDeleteData(dictData: DictDataRecord): Promise<void> {
    if (deleteDataMutation.pending.value) return
    const confirmed = await confirmAction(
      translate('system.dict.deleteDataConfirm', { name: dictData.label }),
      translate('system.common.warning'),
      {
        type: 'warning',
        confirmButtonText: translate('system.common.confirmDelete'),
      },
    )
    if (!confirmed) return

    await deleteDataMutation.mutateAsync(dictData)
    await fetchDataList()
  }

  return {
    currentType,
    dataDialogVisible,
    dataList,
    dataLoading,
    deletingDataId,
    deletingTypeId,
    editingData,
    editingType,
    exportLoading,
    fetchTypeList,
    handleAddData,
    handleAddType,
    handleDataSaved,
    handleDeleteData,
    handleDeleteType,
    handleEditData,
    handleEditType,
    handleExport,
    handleTypeClick,
    handleTypeSaved,
    typeDialogVisible,
    typeList,
    typeLoading,
    typePage,
    typeTotal,
  }
}
