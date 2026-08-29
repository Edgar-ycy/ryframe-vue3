import { ElMessage } from 'element-plus'
import { computed, onActivated, onDeactivated, onScopeDispose, ref, shallowRef, watch } from 'vue'

import { useAppliedListQuery } from '@/shared/query/useAppliedListQuery'
import { useServerStateScope } from '@/shared/query/client'
import {
  beginServerStatePageOperation,
  type ServerStatePageOperation,
} from '@/shared/query/pageOperationScope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'
import type { PageQuery, PageResponse, Id } from '@/shared/http/types'
import type { FlatCrudResource } from './resource'

type SaveCommand<TCreate extends object, TUpdate extends object> =
  { kind: 'create'; input: TCreate } | { kind: 'update'; id: Id; input: TUpdate }

export function useFlatCrudResource<
  TRecord extends object,
  TQuery extends PageQuery,
  TForm extends object,
  TCreate extends object,
  TUpdate extends object,
>(resource: FlatCrudResource<TRecord, TQuery, TForm, TCreate, TUpdate>) {
  const userStore = useUserStore()
  const pageActive = ref(true)
  let pageGeneration = 0
  const authenticated = () => pageActive.value && userStore.sessionStatus === 'authenticated'
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

  const listQuery = useServerStateQuery<PageResponse<TRecord>>(
    authenticated,
    resource.key,
    () => ({ scope: 'list', filters: { ...appliedQuery.value } }),
    (signal) =>
      runAppliedQuery(signal, (query, requestSignal) =>
        resource.adapter.list(query, requestSignal),
      ),
  )

  const editingRecord = shallowRef<TRecord>()
  const currentEditId = computed(() =>
    editingRecord.value ? resource.recordId(editingRecord.value) : null,
  )
  const dialogVisible = shallowRef(false)
  const form = shallowRef<TForm>(resource.emptyForm())

  const detailQuery = useServerStateQuery<TRecord>(
    () => authenticated() && editingRecord.value !== undefined,
    resource.key,
    () => ({ scope: 'detail', id: currentEditId.value }),
    async (signal) => {
      const id = currentEditId.value
      if (!id) throw new Error(resource.messages.detailMissing)
      return resource.adapter.detail(id, signal)
    },
  )

  const saveMutation = useServerStateMutation<void, SaveCommand<TCreate, TUpdate>>(resource.key, {
    mutationFn: (command) =>
      command.kind === 'create'
        ? resource.adapter.create(command.input)
        : resource.adapter.update(command.id, command.input),
    onSuccess: (_data, command) => {
      ElMessage.success(
        command.kind === 'create' ? resource.messages.addSuccess : resource.messages.updateSuccess,
      )
    },
  })

  const deleteMutation = useServerStateMutation<void, TRecord>(resource.key, {
    mutationFn: (record) => resource.adapter.remove(resource.recordId(record)),
    onSuccess: () => ElMessage.success(resource.messages.deleteSuccess),
  })

  const page = computed({
    get: () => draftQuery.value.page ?? 1,
    set: (value) => {
      draftQuery.value = Object.assign({}, draftQuery.value, { page: value })
    },
  })
  const pageSize = computed({
    get: () => draftQuery.value.page_size ?? 10,
    set: (value) => {
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

  function resetEditor(): void {
    pageGeneration += 1
    dialogVisible.value = false
    editingRecord.value = undefined
    resetForm()
  }

  function pageOperationIsCurrent(generation: number): boolean {
    return pageActive.value && generation === pageGeneration
  }

  const stopScopeWatch = watch(
    useServerStateScope(),
    () => {
      clearSuccessfulQuery()
      resetEditor()
    },
    { flush: 'sync' },
  )

  onActivated(() => {
    pageActive.value = true
  })
  onDeactivated(() => {
    pageActive.value = false
    resetEditor()
  })
  onScopeDispose(stopScopeWatch)

  function add(): void {
    resetEditor()
    editingRecord.value = undefined
    resetForm()
    dialogVisible.value = true
  }

  async function edit(record: TRecord): Promise<void> {
    if (saveMutation.pending.value) return
    resetEditor()
    const operation = beginServerStatePageOperation()
    const generation = pageGeneration
    const id = resource.recordId(record)
    editingRecord.value = record
    const result = await detailQuery.refetch({ throwOnError: true })
    operation.assertCurrent(() => pageOperationIsCurrent(generation) && currentEditId.value === id)
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

  async function submit(operation: ServerStatePageOperation): Promise<void> {
    if (saveMutation.pending.value) return
    const generation = pageGeneration
    const ownsPage = () => pageOperationIsCurrent(generation)
    const ownsDialog = () => ownsPage() && dialogVisible.value
    operation.assertCurrent(ownsDialog)
    const id = currentEditId.value
    if (id) {
      await saveMutation.mutateAsync({
        kind: 'update',
        id,
        input: resource.updateInput(form.value),
      })
    } else {
      await saveMutation.mutateAsync({
        kind: 'create',
        input: resource.createInput(form.value),
      })
    }
    operation.apply(() => {
      dialogVisible.value = false
    }, ownsDialog)
    operation.assertCurrent(ownsPage)
    await refresh()
  }

  async function remove(record: TRecord): Promise<void> {
    if (deleteMutation.pending.value) return
    const operation = beginServerStatePageOperation()
    const generation = pageGeneration
    const ownsOperation = () => pageOperationIsCurrent(generation)
    const confirmed = await confirmAction(
      resource.messages.deleteConfirm(record),
      resource.messages.warningTitle,
      { type: 'warning' },
    )
    if (!confirmed) return
    operation.assertCurrent(ownsOperation)
    await deleteMutation.mutateAsync(record)
    operation.assertCurrent(ownsOperation)
    await refresh()
  }

  return {
    add,
    appliedQuery,
    canExport: hasSuccessfulQuery,
    changePage: applyAndRefresh,
    deletingKey,
    dialogTitle: computed(() =>
      currentEditId.value ? resource.messages.editTitle : resource.messages.addTitle,
    ),
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
