import type { FormInstance, FormRules } from 'element-plus'
import {
  generateCode,
  listTable,
  previewCode,
  type GenQuery,
  type GenerateRequest,
  type GeneratedFile,
  type TableInfo,
  type WriteReport,
} from '@/api/modules/tools'
import { emptyPageResponse, type PageResponse } from '@/shared/http/types'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { buildGenerateRequest, isAbsoluteOutputPath } from './generationForm'

type Translate = (key: string, params?: Record<string, unknown>) => string

export function useGeneratorManagement(t: Translate) {
  const userStore = useUserStore()
  const queryParams = ref<GenQuery>({
    page: 1,
    page_size: 10,
    table_name: '',
    table_comment: '',
  })
  const activeQueryParams = ref<GenQuery>({ ...queryParams.value })

  const tablesQuery = useTenantQuery<PageResponse<TableInfo>>(
    () => userStore.tenantId,
    () => userStore.sessionStatus === 'authenticated',
    'code-generator-tables',
    () => ({ scope: 'list', filters: { ...activeQueryParams.value } }),
    async signal => {
      const response = await listTable({ ...activeQueryParams.value }, signal)
      return response.data ?? emptyPageResponse<TableInfo>(activeQueryParams.value)
    },
  )

  const loading = tablesQuery.isFetching
  const tableResponse = tablesQuery.data

  async function fetchData(): Promise<void> {
    const nextParams = { ...queryParams.value }
    if (JSON.stringify(nextParams) !== JSON.stringify(activeQueryParams.value)) {
      activeQueryParams.value = nextParams
      return
    }
    await tablesQuery.refetch({ throwOnError: true })
  }

  function handleSearch(): void {
    queryParams.value.page = 1
    void fetchData()
  }

  function handleReset(): void {
    queryParams.value = {
      page: 1,
      page_size: queryParams.value.page_size,
      table_name: '',
      table_comment: '',
    }
    void fetchData()
  }

  const previewVisible = ref(false)
  const selectedPreviewTab = ref('')
  const previewTableName = ref<string>()
  const previewQuery = useTenantQuery<GeneratedFile[]>(
    () => userStore.tenantId,
    () => (
      userStore.sessionStatus === 'authenticated'
      && previewTableName.value !== undefined
    ),
    'code-generator-preview',
    () => ({ scope: 'table', table: previewTableName.value }),
    async signal => {
      const tableName = previewTableName.value
      if (!tableName) return []
      const response = await previewCode({ tables: [tableName] }, signal)
      return response.data ?? []
    },
  )
  const previewFiles = computed(() => (previewQuery.data.value ?? []).map(file => ({
    name: file.path,
    content: file.content,
  })))
  const previewTab = computed({
    get: () => {
      const selected = selectedPreviewTab.value
      return previewFiles.value.some(file => file.name === selected)
        ? selected
        : previewFiles.value[0]?.name ?? ''
    },
    set: value => {
      selectedPreviewTab.value = value
    },
  })
  const previewLoading = previewQuery.isFetching
  const previewingTable = computed(() => (
    previewQuery.isFetching.value ? previewTableName.value ?? null : null
  ))

  function handlePreview(row: TableInfo): void {
    const isCurrentTable = previewTableName.value === row.table_name
    previewTableName.value = row.table_name
    previewVisible.value = true
    if (isCurrentTable && !previewQuery.isFetching.value) {
      void previewQuery.refetch({ throwOnError: true })
    }
  }

  const generateVisible = ref(false)
  const generateFormRef = ref<FormInstance>()
  const selectedTable = ref<TableInfo | null>(null)
  const generateForm = reactive({ output_dir: '' })
  const generateRules = computed<FormRules>(() => ({
    output_dir: [
      {
        required: true,
        whitespace: true,
        message: t('tools.generator.outputDirectoryRequired'),
        trigger: 'blur',
      },
      {
        validator: (_rule, value, callback) => {
          if (isAbsoluteOutputPath(String(value || ''))) {
            callback()
          }
          else {
            callback(new Error(t('tools.generator.backendOutputPathRequired')))
          }
        },
        trigger: ['blur', 'change'],
      },
    ],
  }))
  const generationMutation = useTenantMutation<WriteReport, GenerateRequest>(
    () => userStore.tenantId,
    'code-generator-files',
    {
      mutationFn: async request => {
        const response = await generateCode(request)
        if (!response.data) throw new Error(t('tools.generator.responseMissing'))
        return response.data
      },
      onSuccess: report => {
        const message = report.skipped.length > 0
          ? t('tools.generator.generateSuccessWithSkipped', {
              written: report.written.length,
              skipped: report.skipped.length,
            })
          : t('tools.generator.generateSuccess', { written: report.written.length })
        generateVisible.value = false
        ElMessage.success(message)
      },
    },
  )
  const generating = generationMutation.pending

  function handleGen(row: TableInfo): void {
    if (generationMutation.pending.value) return
    selectedTable.value = row
    generateForm.output_dir = ''
    generateVisible.value = true
    nextTick(() => generateFormRef.value?.clearValidate())
  }

  function resetGenerateForm(): void {
    selectedTable.value = null
    generateForm.output_dir = ''
    generateFormRef.value?.clearValidate()
  }

  function setGenerateFormRef(instance: unknown): void {
    generateFormRef.value = instance as FormInstance | undefined
  }

  async function submitGeneration(): Promise<void> {
    if (generationMutation.pending.value) return
    const valid = await generateFormRef.value?.validate().catch(() => false)
    if (!valid || !selectedTable.value) return

    const request = buildGenerateRequest(
      selectedTable.value.table_name,
      generateForm.output_dir,
    )
    await generationMutation.mutateAsync(request)
  }

  return {
    fetchData,
    generateForm,
    generateRules,
    generateVisible,
    generating,
    handleGen,
    handlePreview,
    handleReset,
    handleSearch,
    loading,
    previewFiles,
    previewLoading,
    previewTab,
    previewVisible,
    previewingTable,
    queryParams,
    resetGenerateForm,
    selectedTable,
    setGenerateFormRef,
    submitGeneration,
    tableResponse,
  }
}
