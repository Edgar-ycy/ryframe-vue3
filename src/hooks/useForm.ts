import type { Ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useCrud } from './useCrud'

interface FormOptions<T> {
  /** 默认表单数据 */
  defaultData: () => T
  /** 表单校验规则 */
  rules?: FormRules
  /** 提交成功后回调 */
  onSuccess?: () => void
}

/**
 * 通用表单逻辑封装
 * 组合 useCrud + Element Plus Form 校验
 *
 * @example
 * const { formData, formRules, formRef, dialog, validate, handleAdd, handleEdit, handleSubmit } = useForm({
 *   defaultData: () => ({ name: '', status: '1' }),
 *   rules: { name: [{ required: true }] },
 *   onSuccess: () => fetchData(),
 * })
 */
export function useForm<T extends Record<string, any>>(options: FormOptions<T>) {
  const crud = useCrud<T>({ onSuccess: options.onSuccess })
  const formRef = ref<FormInstance>()

  /** 校验表单 */
  async function validate(): Promise<boolean> {
    if (!formRef.value) return true
    try {
      await formRef.value.validate()
      return true
    } catch {
      return false
    }
  }

  /** 新增 */
  function handleAdd() {
    crud.handleAdd(options.defaultData)
  }

  /** 编辑 */
  function handleEdit(row: any, fillForm: (row: any, form: T) => void) {
    crud.handleEdit(row, (r, f) => fillForm(r, f), options.defaultData)
    // 清除校验状态
    nextTick(() => formRef.value?.clearValidate())
  }

  const dialog = computed(() => ({
    visible: crud.dialogVisible,
    title: crud.dialogTitle,
    isEdit: crud.isEdit,
  }))

  return {
    /** 表单数据（响应式） */
    formData: crud.formData as Ref<T>,
    /** 校验规则 */
    formRules: options.rules || {},
    /** 表单 ref */
    formRef,
    /** 弹窗状态 */
    dialog,
    /** 提交 loading */
    submitLoading: crud.submitLoading,
    /** 当前编辑 ID */
    currentId: crud.currentId,
    /** 校验方法 */
    validate,
    /** 新增 */
    handleAdd,
    /** 编辑 */
    handleEdit,
    /** 提交（封装 validate + createApi/updateApi） */
    handleSubmit: crud.handleSubmit,
    /** 删除（封装确认弹窗 + deleteApi） */
    handleDelete: crud.handleDelete,
    /** 重置表单 */
    resetForm: () => crud.resetForm(options.defaultData),
  }
}
