import type { Ref } from 'vue'

interface CrudOptions {
  /** 提交成功后回调 */
  onSuccess?: () => void
}

/**
 * 通用 CRUD 逻辑封装
 * 封装：弹窗显示/隐藏、表单数据、新增/编辑/删除/提交的通用流程
 *
 * @example
 * const crud = useCrud({
 *   onSuccess: () => fetchData(),
 * })
 * // 模板中: crud.dialogVisible, crud.dialogTitle, crud.formData
 * // 按钮: @click="crud.handleAdd()" / crud.handleEdit(row)
 * // 提交: crud.handleSubmit(apiCall, validateFn)
 */
export function useCrud<T extends Record<string, any>>(options: CrudOptions = {}) {
  const dialogVisible = ref(false)
  const dialogTitle = ref('')
  const isEdit = ref(false)
  const submitLoading = ref(false)
  const currentId = ref<number | string | null>(null)
  const formData = ref<T>({} as T) as Ref<T>

  /** 重置表单（子类负责覆盖具体字段） */
  function resetForm(defaultData: () => T) {
    formData.value = defaultData()
  }

  /** 新增 */
  function handleAdd(defaultData: () => T) {
    currentId.value = null
    isEdit.value = false
    dialogTitle.value = '新增'
    resetForm(defaultData)
    dialogVisible.value = true
  }

  /** 编辑 */
  function handleEdit(row: any, fillForm: (row: any, form: T) => void, defaultData: () => T) {
    currentId.value = row.id
    isEdit.value = true
    dialogTitle.value = '编辑'
    resetForm(defaultData)
    fillForm(row, formData.value)
    dialogVisible.value = true
  }

  /** 提交 */
  async function handleSubmit(
    createApi: (data: T) => Promise<any>,
    updateApi: (id: number | string, data: Partial<T>) => Promise<any>,
    validate: () => Promise<boolean>,
    successMsg = '操作成功',
  ) {
    const valid = await validate()
    if (!valid) return
    submitLoading.value = true
    try {
      if (isEdit.value) {
        await updateApi(currentId.value!, formData.value)
      } else {
        await createApi(formData.value)
      }
      ElMessage.success(isEdit.value ? '更新成功' : successMsg)
      dialogVisible.value = false
      options.onSuccess?.()
    } finally {
      submitLoading.value = false
    }
  }

  /** 删除 */
  async function handleDelete(
    row: any,
    deleteApi: (id: number | string) => Promise<any>,
    labelKey = 'name',
  ) {
    try {
      await ElMessageBox.confirm(
        `确认删除"${row[labelKey]}"吗？此操作不可恢复。`,
        '警告',
        { type: 'warning' },
      )
      await deleteApi(row.id)
      ElMessage.success('删除成功')
      options.onSuccess?.()
    } catch { /* cancelled */ }
  }

  return {
    dialogVisible,
    dialogTitle,
    isEdit,
    submitLoading,
    currentId,
    formData,
    resetForm,
    handleAdd,
    handleEdit,
    handleSubmit,
    handleDelete,
  }
}
