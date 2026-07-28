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
import { useDownload } from '@/hooks/useDownload'
import { translate } from '@/i18n'
import { confirmAction } from '@/utils/confirmAction'

export function useDictManagement() {
  const typeLoading = ref(false)
  const typeList = ref<DictTypeRecord[]>([])
  const typeTotal = ref(0)
  const typePage = ref<DictTypeQuery>({ page: 1, page_size: 10 })
  const currentType = ref<DictTypeRecord | null>(null)
  const typeDialogVisible = ref(false)
  const editingType = ref<DictTypeRecord | null>(null)

  const dataLoading = ref(false)
  const dataList = ref<DictDataRecord[]>([])
  const dataDialogVisible = ref(false)
  const editingData = ref<DictDataRecord | null>(null)

  const { downloading: exportLoading, downloadBlob } = useDownload()
  let typeRequestSequence = 0
  let dataRequestSequence = 0

  function clearCurrentType(): void {
    dataRequestSequence += 1
    currentType.value = null
    dataList.value = []
    dataLoading.value = false
  }

  async function fetchTypeList(): Promise<void> {
    const requestSequence = ++typeRequestSequence
    typeLoading.value = true
    try {
      const response = await listDictType(typePage.value)
      if (requestSequence !== typeRequestSequence) return

      typeList.value = response.data?.items ?? []
      typeTotal.value = response.data?.total ?? 0
      if (currentType.value) {
        const selected = typeList.value.find(item => item.id === currentType.value?.id)
        if (selected) currentType.value = selected
        else clearCurrentType()
      }
    }
    finally {
      if (requestSequence === typeRequestSequence) typeLoading.value = false
    }
  }

  async function fetchDataList(typeCode: string): Promise<void> {
    const requestSequence = ++dataRequestSequence
    dataLoading.value = true
    try {
      const response = await listDictData({ type_code: typeCode })
      if (requestSequence === dataRequestSequence) {
        dataList.value = response.data ?? []
      }
    }
    finally {
      if (requestSequence === dataRequestSequence) dataLoading.value = false
    }
  }

  function handleExport(): Promise<void> {
    return downloadBlob(() => exportDictType(), {
      filename: translate('system.dict.exportFilename'),
    })
  }

  async function handleTypeClick(dictType: DictTypeRecord): Promise<void> {
    currentType.value = dictType
    await fetchDataList(dictType.code)
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
    const confirmed = await confirmAction(
      translate('system.dict.deleteTypeConfirm', { name: dictType.name }),
      translate('system.common.warning'),
      {
        type: 'warning',
        confirmButtonText: translate('system.common.confirmDelete'),
      },
    )
    if (!confirmed) return

    await deleteDictType(dictType.id)
    ElMessage.success(translate('system.common.deleteSuccess'))
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
    if (currentType.value) await fetchDataList(currentType.value.code)
  }

  async function handleDeleteData(dictData: DictDataRecord): Promise<void> {
    const confirmed = await confirmAction(
      translate('system.dict.deleteDataConfirm', { name: dictData.label }),
      translate('system.common.warning'),
      {
        type: 'warning',
        confirmButtonText: translate('system.common.confirmDelete'),
      },
    )
    if (!confirmed) return

    await deleteDictData(dictData.id)
    ElMessage.success(translate('system.common.deleteSuccess'))
    if (currentType.value) await fetchDataList(currentType.value.code)
  }

  onMounted(fetchTypeList)

  return {
    currentType,
    dataDialogVisible,
    dataList,
    dataLoading,
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
