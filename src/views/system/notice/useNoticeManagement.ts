import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  createNotice,
  deleteNotice,
  getNotice,
  listNotice,
  publishNoticeToMessageCenter,
  updateNotice,
  type NoticeCreateInput,
  type NoticeQuery,
  type NoticeRecord,
  type NoticeUpdateInput,
} from '@/api/modules/notice'
import { requireOperationData } from '@/shared/http/client'
import type { Id, PageResponse } from '@/shared/http/types'
import { renderMarkdown } from '@/shared/markdown/render'
import { NOTICE_POLICY, validateNoticeMarkdown } from '@/shared/markdown/noticePolicy'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'

export interface NoticeForm {
  title: string
  notice_type: string
  content_markdown: string
  status: string
}

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
  const authenticated = () => userStore.sessionStatus === 'authenticated'
  const noticesQuery = useTenantQuery<PageResponse<NoticeRecord>>(
    () => userStore.tenantId,
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
  const form = ref<NoticeForm>({
    title: '',
    notice_type: 'notice',
    content_markdown: '',
    status: '1',
  })
  const renderedContent = computed(() => renderMarkdown(form.value.content_markdown))
  const validateMarkdown: FormItemRule['validator'] = (_rule, value, callback) => {
    const result = validateNoticeMarkdown(typeof value === 'string' ? value : '')
    if (result === 'required') {
      callback(new Error(t('system.notice.enterContent')))
    } else if (result === 'too_long') {
      callback(
        new Error(
          t('system.notice.contentTooLong', {
            max: NOTICE_POLICY.content_markdown.max_utf8_bytes,
          }),
        ),
      )
    } else {
      callback()
    }
  }
  const rules = computed<FormRules>(() => ({
    title: [{ required: true, message: t('system.notice.enterTitle'), trigger: 'blur' }],
    content_markdown: [{ validator: validateMarkdown, trigger: 'blur' }],
  }))

  function resetForm() {
    form.value = { title: '', notice_type: 'notice', content_markdown: '', status: '1' }
    formRef.value?.clearValidate()
  }

  function resetDialog() {
    resetForm()
    currentEditId.value = null
    editingNotice.value = null
  }

  function setFormRef(instance: FormInstance | undefined): void {
    formRef.value = instance
  }

  const detailQuery = useTenantQuery<NoticeRecord>(
    () => userStore.tenantId,
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

  const saveMutation = useTenantMutation<void, SaveNoticeCommand>(
    () => userStore.tenantId,
    'notices',
    {
      mutationFn: async (command) => {
        if (command.kind === 'create') {
          await createNotice(command.data)
        } else {
          await updateNotice(command.id, command.data)
        }
      },
      onSuccess: (_data, command) => {
        ElMessage.success(
          t(command.kind === 'create' ? 'system.common.addSuccess' : 'system.common.updateSuccess'),
        )
      },
    },
  )
  const submitLoading = saveMutation.pending

  const publishMutation = useTenantMutation<void, NoticeRecord>(
    () => userStore.tenantId,
    'messages',
    {
      mutationFn: async (notice) => {
        await publishNoticeToMessageCenter(notice.id)
      },
      onSuccess: () => {
        ElMessage.success(t('system.notice.publishMessageSuccess'))
      },
    },
  )
  const publishingId = computed<Id | null>(() =>
    publishMutation.pending.value ? (publishMutation.variables.value?.id ?? null) : null,
  )

  const deleteMutation = useTenantMutation<void, NoticeRecord>(
    () => userStore.tenantId,
    'notices',
    {
      mutationFn: async (notice) => {
        await deleteNotice(notice.id)
      },
      onSuccess: () => {
        ElMessage.success(t('system.common.deleteSuccess'))
      },
    },
  )
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
    currentEditId.value = row.id
    editingNotice.value = row
    dialog.value.title = t('system.notice.editTitle')
    dialog.value.isEdit = true
    resetForm()
    await nextTick()
    const result = await detailQuery.refetch({ throwOnError: true })
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
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
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
    dialog.value.visible = false
    await noticesQuery.refetch({ throwOnError: true })
  }

  async function handlePublishMessage(row: NoticeRecord) {
    if (publishMutation.pending.value) return
    const confirmed = await confirmAction(
      t('system.notice.publishMessageConfirm', { title: row.title }),
      t('system.common.prompt'),
      { type: 'warning' },
    )
    if (!confirmed) return

    await publishMutation.mutateAsync(row)
  }

  async function handleDelete(row: NoticeRecord) {
    if (deleteMutation.pending.value) return
    const confirmed = await confirmAction(
      t('system.notice.deleteConfirm', { name: row.title }),
      t('system.common.warning'),
      { type: 'warning' },
    )
    if (!confirmed) return

    await deleteMutation.mutateAsync(row)
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
