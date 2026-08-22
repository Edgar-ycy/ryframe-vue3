/**
 * 此文件由资源清单生成，修改应回到 catalog/resources/post.toml。
 * 生成内容保持为普通 TypeScript，便于类型检查和单步调试。
 */
import {
  defineFlatCrudResource,
  type FlatCrudColumn,
  type FlatCrudFormField,
  type FlatCrudLabels,
  type FlatCrudPermissions,
  type FlatCrudQueryField,
} from '@/components/business/flat-crud'
import {
  createPost,
  deletePost,
  getPost,
  listPost,
  updatePost,
  type PostCreateInput,
  type PostQuery,
  type PostRecord,
  type PostUpdateInput,
} from '@/api/modules/post'
import { emptyPageResponse } from '@/shared/http/types'

export interface PostForm {
  code: string
  name: string
  sort: number
  status: string
}

export interface PostPresentation {
  columns: readonly FlatCrudColumn<PostRecord>[]
  formFields: readonly FlatCrudFormField<PostForm>[]
  labels: FlatCrudLabels
  permissions: FlatCrudPermissions
  queryFields: readonly FlatCrudQueryField<PostQuery>[]
  resource: ReturnType<typeof postResource>
}

type Translate = (key: string, params?: Record<string, string>) => string

export function createPostPresentation(
  translate: Translate,
  formatDate: (value: string) => string,
): PostPresentation {
  const activeOptions = [
    { label: translate('system.common.normal'), value: '1' },
    { label: translate('system.common.disabled'), value: '0' },
  ] as const

  const permissions = {
    list: 'system:post:list',
    create: 'system:post:add',
    update: 'system:post:edit',
    remove: 'system:post:remove',
  } as const

  const labels = {
    title: translate('system.post.list'),
    add: translate('system.common.add'),
    edit: translate('system.common.edit'),
    remove: translate('system.common.delete'),
    actions: translate('system.common.actions'),
    search: translate('system.common.search'),
    reset: translate('system.common.reset'),
    confirm: translate('system.common.confirm'),
    cancel: translate('system.common.cancel'),
  }

  const queryFields = [
    {
      key: 'name',
      kind: 'text',
      label: translate('system.post.name'),
      placeholder: translate('system.post.enterName'),
    },
    {
      key: 'code',
      kind: 'text',
      label: translate('system.post.code'),
      placeholder: translate('system.post.enterCode'),
    },
    {
      key: 'status',
      kind: 'select',
      label: translate('system.common.status'),
      options: activeOptions,
      placeholder: translate('system.post.statusPlaceholder'),
    },
  ] as const satisfies readonly FlatCrudQueryField<PostQuery>[]

  const columns = [
    { key: 'id', label: translate('system.common.id'), align: 'center', width: 90 },
    { key: 'name', label: translate('system.post.name'), minWidth: 130 },
    { key: 'code', label: translate('system.post.code'), minWidth: 120 },
    { key: 'sort', label: translate('system.common.sort'), align: 'center', width: 90 },
    {
      key: 'status',
      label: translate('system.common.status'),
      align: 'center',
      width: 100,
      display: 'status',
      options: activeOptions,
      positiveValue: '1',
    },
    {
      key: 'created_at',
      label: translate('system.common.createdAt'),
      minWidth: 170,
      display: 'datetime',
      format: formatDate,
    },
  ] as const satisfies readonly FlatCrudColumn<PostRecord>[]

  const formFields = [
    {
      key: 'name',
      kind: 'text',
      label: translate('system.post.name'),
      placeholder: translate('system.post.enterName'),
      requiredMessage: translate('system.post.enterName'),
    },
    {
      key: 'code',
      kind: 'text',
      label: translate('system.post.code'),
      placeholder: translate('system.post.enterCode'),
      requiredMessage: translate('system.post.enterCode'),
      disabledOnEdit: true,
    },
    {
      key: 'sort',
      kind: 'number',
      label: translate('system.common.sort'),
      min: 0,
      max: 999,
    },
    {
      key: 'status',
      kind: 'radio',
      label: translate('system.common.status'),
      options: activeOptions,
      editOnly: true,
    },
  ] as const satisfies readonly FlatCrudFormField<PostForm>[]

  return {
    columns,
    formFields,
    labels,
    permissions,
    queryFields,
    resource: postResource(translate),
  }
}

function postResource(translate: Translate) {
  return defineFlatCrudResource<
    PostRecord,
    PostQuery,
    PostForm,
    PostCreateInput,
    PostUpdateInput
  >({
    key: 'posts',
    initialQuery: (): PostQuery => ({
      page: 1,
      page_size: 10,
      name: '',
      code: '',
      status: '',
    }),
    emptyForm: (): PostForm => ({ name: '', code: '', sort: 0, status: '1' }),
    editForm: record => ({
      name: record.name,
      code: record.code,
      sort: record.sort ?? 0,
      status: record.status,
    }),
    createInput: form => ({ name: form.name, code: form.code, sort: form.sort }),
    updateInput: form => ({ name: form.name, sort: form.sort, status: form.status }),
    recordId: record => record.id,
    messages: {
      addSuccess: translate('system.common.addSuccess'),
      addTitle: translate('system.post.addTitle'),
      deleteConfirm: record => translate('system.post.deleteConfirm', { name: record.name }),
      deleteSuccess: translate('system.common.deleteSuccess'),
      detailMissing: translate('system.post.detailMissing'),
      editTitle: translate('system.post.editTitle'),
      updateSuccess: translate('system.common.updateSuccess'),
      warningTitle: translate('system.common.warning'),
    },
    adapter: {
      async list(query, signal) {
        const response = await listPost({ ...query }, signal)
        return response.data ?? emptyPageResponse<PostRecord>(query)
      },
      async detail(id, signal) {
        const response = await getPost(id, signal)
        if (!response.data) throw new Error(translate('system.post.detailMissing'))
        return response.data
      },
      async create(input: PostCreateInput) {
        await createPost(input)
      },
      async update(id, input: PostUpdateInput) {
        await updatePost(id, input)
      },
      async remove(id) {
        await deletePost(id)
      },
    },
  })
}
