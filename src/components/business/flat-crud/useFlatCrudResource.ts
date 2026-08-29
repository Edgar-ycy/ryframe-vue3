import { ElMessage } from 'element-plus'
import { computed, onActivated, onDeactivated, onScopeDispose, ref, shallowRef, watch } from 'vue'

import { useAppliedListQuery } from '@/shared/query/useAppliedListQuery'
import {
  assertServerStateScopeCurrent,
  invalidateServerStateResource,
  useServerStateScope,
} from '@/shared/query/client'
import {
  beginServerStatePageOperation,
  propagateServerStatePageOperationError,
  type ServerStatePageOperation,
} from '@/shared/query/pageOperationScope'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'
import type { PageQuery, PageResponse, Id } from '@/shared/http/types'
import type { ServerStateScope } from '@/shared/query/scope'
import type { FlatCrudResource } from './resource'

type SaveCommand<TCreate extends object, TUpdate extends object> =
  | { kind: 'create'; input: TCreate; scope: ServerStateScope }
  | { kind: 'update'; id: Id; input: TUpdate; scope: ServerStateScope }

interface DeleteCommand<TRecord extends object> {
  record: TRecord
  scope: ServerStateScope
}

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
    invalidateOnSuccess: false,
    meta: { errorMode: 'silent' },
    mutationFn: (command) => {
      assertServerStateScopeCurrent(command.scope)
      return command.kind === 'create'
        ? resource.adapter.create(command.input)
        : resource.adapter.update(command.id, command.input)
    },
  })

  const deleteMutation = useServerStateMutation<void, DeleteCommand<TRecord>>(resource.key, {
    invalidateOnSuccess: false,
    meta: { errorMode: 'silent' },
    mutationFn: (command) => {
      assertServerStateScopeCurrent(command.scope)
      return resource.adapter.remove(resource.recordId(command.record))
    },
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
    const command = deleteMutation.variables.value
    return deleteMutation.pending.value && command ? resource.recordId(command.record) : null
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
    const successMessage = id ? resource.messages.updateSuccess : resource.messages.addSuccess
    try {
      if (id) {
        await saveMutation.mutateAsync({
          kind: 'update',
          id,
          input: resource.updateInput(form.value),
          scope: operation.scope,
        })
      } else {
        await saveMutation.mutateAsync({
          kind: 'create',
          input: resource.createInput(form.value),
          scope: operation.scope,
        })
      }
    } catch (error) {
      propagateServerStatePageOperationError(error, operation, ownsDialog)
    }
    operation.assertCurrent(ownsDialog)
    await invalidateServerStateResource(operation.scope, resource.key)
    operation.assertCurrent(ownsDialog)
    await refresh()
    operation.apply(() => {
      dialogVisible.value = false
      ElMessage.success(successMessage)
    }, ownsDialog)
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
    try {
      await deleteMutation.mutateAsync({ record, scope: operation.scope })
    } catch (error) {
      propagateServerStatePageOperationError(error, operation, ownsOperation)
    }
    operation.assertCurrent(ownsOperation)
    await invalidateServerStateResource(operation.scope, resource.key)
    operation.assertCurrent(ownsOperation)
    await refresh()
    operation.apply(() => ElMessage.success(resource.messages.deleteSuccess), ownsOperation)
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
