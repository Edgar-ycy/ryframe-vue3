import { computed, shallowRef, watch } from 'vue'

import { useAppliedListQuery } from '@/shared/query/useAppliedListQuery'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'
import type { PageQuery, PageResponse, Id } from '@/shared/http/types'
import type { FlatCrudResource } from './resource'

type SaveCommand<TCreate extends object, TUpdate extends object> =
  | { kind: 'create'; input: TCreate }
  | { kind: 'update'; id: Id; input: TUpdate }

export function useFlatCrudResource<
  TRecord extends object,
  TQuery extends PageQuery,
  TForm extends object,
  TCreate extends object,
  TUpdate extends object,
>(resource: FlatCrudResource<TRecord, TQuery, TForm, TCreate, TUpdate>) {
  const userStore = useUserStore()
  const authenticated = () => userStore.sessionStatus === 'authenticated'
  const {
    appliedQuery,
    applyDraft,
    clearSuccessfulQuery,
    draftQuery,
    hasSuccessfulQuery,
    lastSuccessfulQuery,
    refreshApplied,
    runAppliedQuery,
  } = useAppliedListQuery(resource.initialQuery())

  watch(
    () => [userStore.tenantId, userStore.userId] as const,
    () => clearSuccessfulQuery(),
    { flush: 'sync' },
  )

  const listQuery = useTenantQuery<PageResponse<TRecord>>(
    () => userStore.tenantId,
    authenticated,
    resource.key,
    () => ({ scope: 'list', filters: { ...appliedQuery.value } }),
    signal => runAppliedQuery(signal, (query, requestSignal) => (
      resource.adapter.list(query, requestSignal)
    )),
  )

  const editingRecord = shallowRef<TRecord>()
  const currentEditId = computed(() => (
    editingRecord.value ? resource.recordId(editingRecord.value) : null
  ))
  const dialogVisible = shallowRef(false)
  const form = shallowRef<TForm>(resource.emptyForm())

  const detailQuery = useTenantQuery<TRecord>(
    () => userStore.tenantId,
    () => authenticated() && editingRecord.value !== undefined,
    resource.key,
    () => ({ scope: 'detail', id: currentEditId.value }),
    async signal => {
      const id = currentEditId.value
      if (!id) throw new Error(resource.messages.detailMissing)
      return resource.adapter.detail(id, signal)
    },
  )

  const saveMutation = useTenantMutation<
    void,
    SaveCommand<TCreate, TUpdate>
  >(
    () => userStore.tenantId,
    resource.key,
    {
      mutationFn: command => command.kind === 'create'
        ? resource.adapter.create(command.input)
        : resource.adapter.update(command.id, command.input),
      onSuccess: (_data, command) => {
        ElMessage.success(command.kind === 'create'
          ? resource.messages.addSuccess
          : resource.messages.updateSuccess)
      },
    },
  )

  const deleteMutation = useTenantMutation<void, TRecord>(
    () => userStore.tenantId,
    resource.key,
    {
      mutationFn: record => resource.adapter.remove(resource.recordId(record)),
      onSuccess: () => ElMessage.success(resource.messages.deleteSuccess),
    },
  )

  const page = computed({
    get: () => draftQuery.value.page ?? 1,
    set: value => {
      draftQuery.value = Object.assign({}, draftQuery.value, { page: value })
    },
  })
  const pageSize = computed({
    get: () => draftQuery.value.page_size ?? 10,
    set: value => {
      draftQuery.value = Object.assign({}, draftQuery.value, { page_size: value })
    },
  })
  const deletingKey = computed(() => {
    const record = deleteMutation.variables.value
    return deleteMutation.pending.value && record ? resource.recordId(record) : null
  })

  function setQuery(query: TQuery): void {
    draftQuery.value = query
  }

  function resetForm(): void {
    form.value = resource.emptyForm()
  }

  function add(): void {
    editingRecord.value = undefined
    resetForm()
    dialogVisible.value = true
  }

  async function edit(record: TRecord): Promise<void> {
    if (saveMutation.pending.value) return
    editingRecord.value = record
    const result = await detailQuery.refetch({ throwOnError: true })
    if (!result.data) throw new Error(resource.messages.detailMissing)
    form.value = resource.editForm(result.data)
    dialogVisible.value = true
  }

  async function refresh(): Promise<void> {
    await refreshApplied(async () => {
      await listQuery.refetch({ throwOnError: true })
    })
  }

  async function applyAndRefresh(): Promise<void> {
    if (applyDraft()) return
    await refresh()
  }

  function search(): void {
    page.value = 1
    void applyAndRefresh()
  }

  function reset(): void {
    const preservedPageSize = pageSize.value
    draftQuery.value = Object.assign(resource.initialQuery(), { page_size: preservedPageSize })
    void applyAndRefresh()
  }

  async function submit(): Promise<void> {
    if (saveMutation.pending.value) return
    const id = currentEditId.value
    if (id) {
      await saveMutation.mutateAsync({
        kind: 'update',
        id,
        input: resource.updateInput(form.value),
      })
    }
    else {
      await saveMutation.mutateAsync({
        kind: 'create',
        input: resource.createInput(form.value),
      })
    }
    dialogVisible.value = false
    await refresh()
  }

  async function remove(record: TRecord): Promise<void> {
    if (deleteMutation.pending.value) return
    const confirmed = await confirmAction(
      resource.messages.deleteConfirm(record),
      resource.messages.warningTitle,
      { type: 'warning' },
    )
    if (!confirmed) return
    await deleteMutation.mutateAsync(record)
    await refresh()
  }

  return {
    add,
    appliedQuery,
    canExport: hasSuccessfulQuery,
    changePage: applyAndRefresh,
    deletingKey,
    dialogTitle: computed(() => currentEditId.value
      ? resource.messages.editTitle
      : resource.messages.addTitle),
    dialogVisible,
    edit,
    editing: computed(() => currentEditId.value !== null),
    form,
    lastSuccessfulQuery,
    listQuery,
    page,
    pageSize,
    query: draftQuery,
    refresh,
    remove,
    reset,
    search,
    setQuery,
    submit,
    saving: saveMutation.pending,
  }
}
