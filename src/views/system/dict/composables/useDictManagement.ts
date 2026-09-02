import { ElMessage } from 'element-plus'
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
import { confirmAndSubmitExportIntent, normalizeExportIntent } from '@/app/exports/exportIntent'
import { useExportJobRequest } from '@/hooks/useExportJobRequest'
import { translate } from '@/i18n'
import { emptyPageResponse, type Id, type PageResponse } from '@/shared/http/types'
import { confirmServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import { useAppliedListQuery } from '@/shared/query/useAppliedListQuery'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'

export function useDictManagement() {
  const {
    appliedQuery: appliedTypeQuery,
    applyDraft,
    clearSuccessfulQuery,
    draftQuery: typePage,
    hasSuccessfulQuery: canExport,
    lastSuccessfulQuery,
    refreshApplied,
    runAppliedQuery,
  } = useAppliedListQuery<DictTypeQuery>({
    page: 1,
    page_size: 10,
    name: '',
    code: '',
    status: '',
  })
  const currentTypeId = ref<Id | null>(null)
  const typeDialogVisible = ref(false)
  const editingType = ref<DictTypeRecord | null>(null)
  const dataDialogVisible = ref(false)
  const editingData = ref<DictDataRecord | null>(null)

  const userStore = useUserStore()
  const { pending: exportLoading, submitExport } = useExportJobRequest()
  const pageLifecycle = useServerStatePageLifecycle(resetPageState)
  const authenticated = () =>
    pageLifecycle.pageActive.value && userStore.sessionStatus === 'authenticated'

  const typesQuery = useServerStateQuery<PageResponse<DictTypeRecord>>(
    authenticated,
    'dict-types',
    () => ({ scope: 'list', filters: { ...appliedTypeQuery.value } }),
    (signal) =>
      runAppliedQuery(signal, async (query, requestSignal) => {
        const params = { ...query }
        const response = await listDictType(params, requestSignal)
        return response.data ?? emptyPageResponse<DictTypeRecord>(params)
      }),
  )
  const typePageResponse = typesQuery.data
  const currentType = computed<DictTypeRecord | null>({
    get: () => {
      const id = currentTypeId.value
      return id === null
        ? null
        : (typePageResponse.value?.items.find((item) => item.id === id) ?? null)
    },
    set: (value) => {
      currentTypeId.value = value?.id ?? null
    },
  })
  const dataQuery = useServerStateQuery<DictDataRecord[]>(
    () => authenticated() && currentType.value !== null,
    'dict-data',
    () => ({ scope: 'list', typeCode: currentType.value?.code ?? null }),
    async (signal) => {
      const typeCode = currentType.value?.code
      if (!typeCode) return []
      const response = await listDictData({ type_code: typeCode }, signal)
      return response.data ?? []
    },
  )

  const typeLoading = typesQuery.isFetching
  const dataList = dataQuery.data
  const dataLoading = dataQuery.isFetching

  const deleteTypeMutation = useServerStateMutation<void, DictTypeRecord>('dict-types', {
    mutationFn: async (dictType) => {
      await deleteDictType(dictType.id)
    },
  })
  const deleteDataMutation = useServerStateMutation<void, DictDataRecord>('dict-data', {
    mutationFn: async (dictData) => {
      await deleteDictData(dictData.id)
    },
  })
  const deletingTypeId = computed<Id | null>(() =>
    deleteTypeMutation.pending.value ? (deleteTypeMutation.variables.value?.id ?? null) : null,
  )
  const deletingDataId = computed<Id | null>(() =>
    deleteDataMutation.pending.value ? (deleteDataMutation.variables.value?.id ?? null) : null,
  )

  function clearCurrentType(): void {
    currentTypeId.value = null
  }

  function resetPageState(): void {
    clearSuccessfulQuery()
    clearCurrentType()
    typeDialogVisible.value = false
    editingType.value = null
    dataDialogVisible.value = false
    editingData.value = null
  }

  async function fetchTypeList(): Promise<void> {
    if (applyDraft()) return
    await refreshTypeList()
  }

  async function refreshTypeList(): Promise<void> {
    await refreshApplied(async () => {
      await typesQuery.refetch({ throwOnError: true })
    })
  }

  async function fetchDataList(): Promise<void> {
    if (!currentType.value) return
    await dataQuery.refetch({ throwOnError: true })
  }

  async function handleExport(): Promise<void> {
    const successfulQuery = lastSuccessfulQuery.value
    if (!successfulQuery) {
      ElMessage.warning(translate('system.common.exportRequiresSuccessfulQuery'))
      return
    }
    const intent = normalizeExportIntent('dict-types', successfulQuery)
    await confirmAndSubmitExportIntent(
      intent,
      (scope) =>
        submitExport(scope, intent.signature, (idempotencyKey, signal) =>
          exportDictType(intent.filter, idempotencyKey, signal, intent.isEmpty),
        ),
      { ownsOperation: pageLifecycle.captureOwnership() },
    )
  }

  function handleSearch(): void {
    typePage.value.page = 1
    void fetchTypeList()
  }

  function handleReset(): void {
    typePage.value = {
      page: 1,
      page_size: typePage.value.page_size,
      name: '',
      code: '',
      status: '',
    }
    void fetchTypeList()
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
    await refreshTypeList()
  }

  async function handleDeleteType(dictType: DictTypeRecord): Promise<void> {
    if (deleteTypeMutation.pending.value) return
    const ownsOperation = pageLifecycle.captureOwnership()
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          translate('system.dict.deleteTypeConfirm', { name: dictType.name }),
          translate('system.common.warning'),
          {
            type: 'warning',
            confirmButtonText: translate('system.common.confirmDelete'),
          },
        ),
      ownsOperation,
    )
    if (!operation) return

    await deleteTypeMutation.mutateAsync(dictType)
    operation.apply(
      () => ElMessage.success(translate('system.common.deleteSuccess')),
      ownsOperation,
    )
    if (currentType.value?.id === dictType.id) clearCurrentType()
    await refreshTypeList()
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
    const ownsOperation = pageLifecycle.captureOwnership()
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          translate('system.dict.deleteDataConfirm', { name: dictData.label }),
          translate('system.common.warning'),
          {
            type: 'warning',
            confirmButtonText: translate('system.common.confirmDelete'),
          },
        ),
      ownsOperation,
    )
    if (!operation) return

    await deleteDataMutation.mutateAsync(dictData)
    operation.apply(
      () => ElMessage.success(translate('system.common.deleteSuccess')),
      ownsOperation,
    )
    await fetchDataList()
  }

  return {
    canExport,
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
    handleReset,
    handleSearch,
    handleTypeClick,
    handleTypeSaved,
    typeDialogVisible,
    typeLoading,
    typePage,
    typePageResponse,
  }
}
