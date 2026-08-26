import type { FormInstance, FormRules } from 'element-plus'
import {
  createDept,
  deleteDept,
  getDept,
  getDeptTree,
  updateDept,
  type DeptCreateInput,
  type DeptNode,
  type DeptRecord,
  type DeptUpdateInput,
} from '@/api/modules/dept'
import type { Id } from '@/shared/http/types'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'

type Translate = (key: string, params?: Record<string, unknown>) => string
type SaveDeptCommand =
  { kind: 'create'; data: DeptCreateInput } | { kind: 'update'; id: Id; data: DeptUpdateInput }

export function useDeptManagement(t: Translate) {
  const userStore = useUserStore()
  const dialog = ref({ visible: false, title: '', isEdit: false })
  const formRef = ref<FormInstance>()
  const currentEditId = ref<Id | null>(null)
  const form = ref({
    parent_id: undefined as Id | undefined,
    name: '',
    sort: 0,
    status: '1',
  })

  const departmentsQuery = useTenantQuery<DeptNode[]>(
    () => userStore.tenantId,
    () => userStore.sessionStatus === 'authenticated',
    'departments',
    () => ({ scope: 'tree' }),
    async (signal) => {
      const response = await getDeptTree(signal)
      return response.data ?? []
    },
  )
  const detailQuery = useTenantQuery<DeptRecord>(
    () => userStore.tenantId,
    () =>
      userStore.sessionStatus === 'authenticated' &&
      dialog.value.visible &&
      dialog.value.isEdit &&
      currentEditId.value !== null,
    'departments',
    () => ({ scope: 'detail', id: currentEditId.value }),
    async (signal) => {
      const id = currentEditId.value
      if (id === null) throw new Error(t('system.department.detailMissing'))
      const response = await getDept(id, signal)
      if (!response.data) throw new Error(t('system.department.detailMissing'))
      return response.data
    },
  )
  const saveMutation = useTenantMutation<void, SaveDeptCommand>(
    () => userStore.tenantId,
    'departments',
    {
      mutationFn: async (command) => {
        if (command.kind === 'update') await updateDept(command.id, command.data)
        else await createDept(command.data)
      },
      onSuccess: (_data, command) => {
        ElMessage.success(
          t(command.kind === 'update' ? 'system.common.updateSuccess' : 'system.common.addSuccess'),
        )
      },
    },
  )
  const deleteMutation = useTenantMutation<void, DeptNode>(
    () => userStore.tenantId,
    'departments',
    {
      mutationFn: async (department) => {
        await deleteDept(department.id)
      },
      onSuccess: () => {
        ElMessage.success(t('system.common.deleteSuccess'))
      },
    },
  )

  const loading = departmentsQuery.isFetching
  const tableData = departmentsQuery.data
  const deptOptions = tableData
  const detailLoading = detailQuery.isFetching
  const submitLoading = saveMutation.pending
  const deletingId = computed<Id | null>(() =>
    deleteMutation.pending.value ? (deleteMutation.variables.value?.id ?? null) : null,
  )
  const rules = computed<FormRules>(() => ({
    name: [{ required: true, message: t('system.department.enterName'), trigger: 'blur' }],
  }))

  async function fetchData(): Promise<void> {
    await departmentsQuery.refetch({ throwOnError: true })
  }

  function resetForm(): void {
    form.value = { parent_id: undefined, name: '', sort: 0, status: '1' }
    formRef.value?.clearValidate()
  }

  function handleAdd(parentId?: Id): void {
    currentEditId.value = null
    dialog.value = {
      visible: true,
      title: t('system.department.addTitle'),
      isEdit: false,
    }
    resetForm()
    form.value.parent_id = parentId
  }

  function populateForm(department: DeptRecord): void {
    form.value = {
      parent_id: department.parent_id ?? undefined,
      name: department.name,
      sort: department.sort ?? 0,
      status: department.status,
    }
  }

  function handleEdit(row: DeptNode): void {
    currentEditId.value = row.id
    dialog.value = {
      visible: true,
      title: t('system.department.editTitle'),
      isEdit: true,
    }
    resetForm()
    if (detailQuery.data.value) populateForm(detailQuery.data.value)
  }

  watch(
    () => detailQuery.data.value,
    (department) => {
      if (dialog.value.visible && dialog.value.isEdit && department) populateForm(department)
    },
  )

  async function handleSubmit(): Promise<void> {
    if (submitLoading.value) return
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
    const data = {
      name: form.value.name,
      parent_id: form.value.parent_id,
      sort: form.value.sort,
    }
    const command: SaveDeptCommand =
      dialog.value.isEdit && currentEditId.value !== null
        ? {
            kind: 'update',
            id: currentEditId.value,
            data: { ...data, status: form.value.status },
          }
        : { kind: 'create', data }
    await saveMutation.mutateAsync(command)
    dialog.value.visible = false
    await fetchData()
  }

  async function handleDelete(row: DeptNode): Promise<void> {
    if (deleteMutation.pending.value) return
    const confirmed = await confirmAction(
      t('system.department.deleteConfirm', { name: row.name }),
      t('system.common.warning'),
      { type: 'warning' },
    )
    if (!confirmed) return

    await deleteMutation.mutateAsync(row)
    await fetchData()
  }

  return {
    deletingId,
    deptOptions,
    detailLoading,
    dialog,
    fetchData,
    form,
    formRef,
    handleAdd,
    handleDelete,
    handleEdit,
    handleSubmit,
    loading,
    resetForm,
    rules,
    submitLoading,
    tableData,
  }
}
