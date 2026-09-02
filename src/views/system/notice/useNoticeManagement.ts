import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  createNotice,
  deleteNotice,
  getNotice,
  listNotice,
  updateNotice,
  type NoticeCreateInput,
  type NoticeQuery,
  type NoticeRecord,
  type NoticeUpdateInput,
} from '@/generated/resources/notice/api'
import { publishNoticeToMessageCenter } from '@/api/modules/noticeMessage'
import { requireOperationData } from '@/shared/http/client'
import type { Id, PageResponse } from '@/shared/http/types'
import { renderMarkdown } from '@/shared/markdown/render'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import {
  confirmServerStatePageOperation,
  validateServerStatePageOperation,
} from '@/shared/query/scopedConfirmation'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'
import { createEmptyNoticeForm, createNoticeRules, type NoticeForm } from './noticeFormModel'

interface NoticeDialogState {
  visible: boolean
  title: string
  isEdit: boolean
}

type SaveNoticeCommand =
  { kind: 'create'; data: NoticeCreateInput } | { kind: 'update'; id: Id; data: NoticeUpdateInput }

export function useNoticeManagement() {
  const queryParams = ref<NoticeQuery>({
    page: 1,
    page_size: 10,
    title: '',
    notice_type: '',
    status: '',
  })
  const activeQueryParams = ref<NoticeQuery>({ ...queryParams.value })
  const { t } = useI18n()
  const userStore = useUserStore()
  const pageLifecycle = useServerStatePageLifecycle(resetDialog)
  const authenticated = () =>
    pageLifecycle.pageActive.value && userStore.sessionStatus === 'authenticated'
  const noticesQuery = useServerStateQuery<PageResponse<NoticeRecord>>(
    authenticated,
    'notices',
    () => ({ scope: 'list', filters: { ...activeQueryParams.value } }),
    async (signal) => {
      const response = await listNotice({ ...activeQueryParams.value }, signal)
      return requireOperationData(response)
    },
  )
  const loading = noticesQuery.isFetching
  const tableResponse = noticesQuery.data

  async function fetchData() {
    const nextParams = { ...queryParams.value }
    if (JSON.stringify(nextParams) !== JSON.stringify(activeQueryParams.value)) {
      activeQueryParams.value = nextParams
      return
    }
    await noticesQuery.refetch({ throwOnError: true })
  }

  function handleSearch() {
    queryParams.value.page = 1
    void fetchData()
  }

  function handleReset() {
    queryParams.value.title = ''
    queryParams.value.notice_type = ''
    queryParams.value.status = ''
    handleSearch()
  }

  const dialog = ref<NoticeDialogState>({ visible: false, title: '', isEdit: false })
  const formRef = ref<FormInstance>()
  const currentEditId = ref<Id | null>(null)
  const editingNotice = ref<NoticeRecord | null>(null)
  const form = ref<NoticeForm>(createEmptyNoticeForm())
  const renderedContent = computed(() => renderMarkdown(form.value.content_markdown))
  const rules = computed(() => createNoticeRules(t))

  function resetForm() {
    form.value = createEmptyNoticeForm()
    formRef.value?.clearValidate()
  }

  function resetDialog() {
    resetForm()
    currentEditId.value = null
    editingNotice.value = null
    dialog.value = { visible: false, title: '', isEdit: false }
  }

  function setFormRef(instance: FormInstance | undefined): void {
    formRef.value = instance
  }

  const detailQuery = useServerStateQuery<NoticeRecord>(
    () => authenticated() && editingNotice.value !== null,
    'notices',
    () => ({ scope: 'detail', id: editingNotice.value?.id ?? null }),
    async (signal) => {
      const target = editingNotice.value
      if (!target) throw new Error(t('system.notice.detailMissing'))
      const response = await getNotice(target.id, signal)
      return requireOperationData(response)
    },
  )

  const saveMutation = useServerStateMutation<void, SaveNoticeCommand>('notices', {
    mutationFn: async (command) => {
      if (command.kind === 'create') {
        await createNotice(command.data)
      } else {
        await updateNotice(command.id, command.data)
      }
    },
  })
  const submitLoading = saveMutation.pending

  const publishMutation = useServerStateMutation<void, NoticeRecord>('messages', {
    mutationFn: async (notice) => {
      await publishNoticeToMessageCenter(notice.id)
    },
  })
  const publishingId = computed<Id | null>(() =>
    publishMutation.pending.value ? (publishMutation.variables.value?.id ?? null) : null,
  )

  const deleteMutation = useServerStateMutation<void, NoticeRecord>('notices', {
    mutationFn: async (notice) => {
      await deleteNotice(notice.id)
    },
  })
  const deletingId = computed<Id | null>(() =>
    deleteMutation.pending.value ? (deleteMutation.variables.value?.id ?? null) : null,
  )

  function handleAdd() {
    currentEditId.value = null
    editingNotice.value = null
    dialog.value.title = t('system.notice.addTitle')
    dialog.value.isEdit = false
    resetForm()
    dialog.value.visible = true
  }

  async function handleEdit(row: NoticeRecord) {
    if (saveMutation.pending.value) return
    const operation = beginServerStatePageOperation()
    const ownsPage = pageLifecycle.captureOwnership()
    const ownsEdit = () => ownsPage() && editingNotice.value?.id === row.id
    currentEditId.value = row.id
    editingNotice.value = row
    dialog.value.title = t('system.notice.editTitle')
    dialog.value.isEdit = true
    resetForm()
    await nextTick()
    operation.assertCurrent(ownsEdit)
    const result = await detailQuery.refetch({ throwOnError: true })
    operation.assertCurrent(ownsEdit)
    const detail = result.data
    if (!detail) throw new Error(t('system.notice.detailMissing'))
    form.value = {
      title: detail.title,
      notice_type: detail.notice_type || 'notice',
      content_markdown: detail.content_markdown,
      status: detail.status,
    }
    dialog.value.visible = true
  }

  async function handleSubmit() {
    if (saveMutation.pending.value) return
    const ownsPage = pageLifecycle.captureOwnership()
    const expectedEditId = currentEditId.value
    const expectedIsEdit = dialog.value.isEdit
    const ownsDialog = () =>
      ownsPage() &&
      dialog.value.visible &&
      dialog.value.isEdit === expectedIsEdit &&
      currentEditId.value === expectedEditId
    const operation = await validateServerStatePageOperation(
      () => formRef.value?.validate().catch(() => false) ?? Promise.resolve(false),
      ownsDialog,
    )
    if (!operation) return
    const data = {
      title: form.value.title,
      content_markdown: form.value.content_markdown,
      notice_type: form.value.notice_type,
    }
    if (dialog.value.isEdit) {
      await saveMutation.mutateAsync({
        kind: 'update',
        id: currentEditId.value!,
        data: { ...data, status: form.value.status },
      })
    } else {
      await saveMutation.mutateAsync({ kind: 'create', data })
    }
    operation.assertCurrent(ownsDialog)
    ElMessage.success(
      t(expectedIsEdit ? 'system.common.updateSuccess' : 'system.common.addSuccess'),
    )
    dialog.value.visible = false
    await noticesQuery.refetch({ throwOnError: true })
  }

  async function handlePublishMessage(row: NoticeRecord) {
    if (publishMutation.pending.value) return
    const ownsOperation = pageLifecycle.captureOwnership()
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          t('system.notice.publishMessageConfirm', { title: row.title }),
          t('system.common.prompt'),
          { type: 'warning' },
        ),
      ownsOperation,
    )
    if (!operation) return

    await publishMutation.mutateAsync(row)
    operation.apply(
      () => ElMessage.success(t('system.notice.publishMessageSuccess')),
      ownsOperation,
    )
  }

  async function handleDelete(row: NoticeRecord) {
    if (deleteMutation.pending.value) return
    const ownsOperation = pageLifecycle.captureOwnership()
    const operation = await confirmServerStatePageOperation(
      () =>
        confirmAction(
          t('system.notice.deleteConfirm', { name: row.title }),
          t('system.common.warning'),
          { type: 'warning' },
        ),
      ownsOperation,
    )
    if (!operation) return

    await deleteMutation.mutateAsync(row)
    operation.apply(() => ElMessage.success(t('system.common.deleteSuccess')), ownsOperation)
    await noticesQuery.refetch({ throwOnError: true })
  }

  return {
    deletingId,
    dialog,
    fetchData,
    form,
    handleAdd,
    handleDelete,
    handleEdit,
    handlePublishMessage,
    handleReset,
    handleSearch,
    handleSubmit,
    loading,
    publishingId,
    queryParams,
    renderedContent,
    resetDialog,
    rules,
    setFormRef,
    submitLoading,
    tableResponse,
    t,
  }
}
