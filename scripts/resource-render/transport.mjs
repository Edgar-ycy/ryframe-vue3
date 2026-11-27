import { hasDateColumn, header, htmlHeader } from './format.ts'

// 输入直接使用已校验的 ResourceIr JSON；生成器版本由调用方显式绑定。
export function renderTransport(resource, generatorVersion) {
  if (typeof generatorVersion !== 'string' || generatorVersion.length === 0) {
    throw new TypeError('必须显式提供生成器版本')
  }
  const slash = header(resource, generatorVersion)
  return new Map([
    ['api.ts', renderApi(resource, slash)],
    ['page.vue', renderPage(resource, htmlHeader(resource, generatorVersion))],
    ['registration.ts', renderRegistration(resource, slash)],
    [
      'index.ts',
      `${slash}export * from './api'\nexport * from './fields'\nexport { default as ${resource.pascal_name}Page } from './page.vue'\n`,
    ],
  ])
}

function renderApi(resource, header) {
  const pascal = resource.pascal_name
  const domain = resource.module === 'business' ? 'system' : resource.module
  const { create, read, list, update, delete: remove } = resource.api.operations
  const detail = resource.relations.length
    ? `export type ${pascal}Detail = ApiSchema<'${pascal}DetailVo'>\n`
    : ''
  return `${header}import {
  ${remove},
  ${list},
  ${read},
  ${create},
  ${update},
} from '@/api/generated/operations/${domain}'
import type { ApiSchema, OperationJsonBody, OperationQuery } from '@/api/contract'
import type { Id } from '@/shared/http/types'

export type ${pascal}Record = ApiSchema<'${pascal}Vo'>
${detail}export type ${pascal}Query = OperationQuery<'${list}'>
export type ${pascal}CreateInput = OperationJsonBody<'${create}'>
export type ${pascal}UpdateInput = OperationJsonBody<'${update}'>

export function list${pascal}(params: ${pascal}Query, signal?: AbortSignal) {
  return ${list}({ params, signal })
}

export function get${pascal}(id: Id, signal?: AbortSignal) {
  return ${read}({ path: { id }, signal })
}

export function create${pascal}(data: ${pascal}CreateInput) {
  return ${create}({ data })
}

export function update${pascal}(id: Id, data: ${pascal}UpdateInput) {
  return ${update}({ path: { id }, data })
}

export function delete${pascal}(id: Id) {
  return ${remove}({ path: { id } })
}
`
}

function renderRegistration(resource, header) {
  const extension = resource.frontend_extensions.page
  const page = typeof extension === 'string' ? extension : './page.vue'
  const capability = resource.access.capability
  const capabilities = capability == null ? [] : [capability]
  const systemTenant = resource.access.system_tenant_only
    ? '      requiresSystemTenant: true,\n'
    : ''
  const permissions = resource.access.permissions
  const businessWrites =
    resource.storage === 'tenant_data'
      ? `  businessWritePermissions: ${JSON.stringify([permissions.create, permissions.update, permissions.delete])},\n`
      : ''
  return `${header}import { definePageManifest } from '@/features/pages'

export const pageManifest = definePageManifest({
${businessWrites}  pages: [
    {
      routeKey: ${JSON.stringify(resource.route.key)},
      permissionCode: ${JSON.stringify(resource.access.permissions.list)},
      path: ${JSON.stringify(resource.route.path)},
      requiredCapabilities: ${JSON.stringify(capabilities)},
${systemTenant}      page: () => import(${JSON.stringify(page)}),
    },
  ],
})
`
}

function renderPage(resource, header) {
  const pascal = resource.pascal_name
  const hasDate = hasDateColumn(resource)
  const dateImport = hasDate ? "import { formatLocalizedDate } from '@/i18n'\n" : ''
  const dateArgument = hasDate ? ', formatLocalizedDate' : ''
  return `${header}<template>
  <FlatCrudPage
    v-model:dialog-visible="dialogVisible"
    v-model:form="form"
    v-model:page="page"
    v-model:page-size="pageSize"
    :columns="presentation.columns"
    :deleting-key="deletingKey"
    :dialog-title="dialogTitle"
    :editing="editing"
    :form-fields="presentation.formFields"
    :labels="presentation.labels"
    :loading="listQuery.isFetching.value"
    :permissions="presentation.permissions"
    :query="query"
    :query-fields="presentation.queryFields"
    :row-key="presentation.resource.recordId"
    :rows="listQuery.data.value?.items ?? []"
    :saving="saving"
    :total="listQuery.data.value?.total ?? 0"
    @add="add"
    @edit="edit"
    @page-change="changePage"
    @remove="remove"
    @reset="reset"
    @search="search"
    @submit="submit"
    @update:query="setQuery"
  >
    <template v-if="slots.actions" #actions="{ selectedExportIds, captureSelectionOwnership }">
      <slot
        name="actions"
        :selected-export-ids="selectedExportIds"
        :capture-selection-ownership="captureSelectionOwnership"
        :can-export="canExport"
        :last-successful-query="lastSuccessfulQuery ?? null"
      />
    </template>
  </FlatCrudPage>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { FlatCrudPage, useFlatCrudResource } from '@/components/business/flat-crud'
${dateImport}import type { ${pascal}Query } from './api'
import { create${pascal}Presentation } from './fields'

const slots = defineSlots<{
  actions?(props: { selectedExportIds: string[]; captureSelectionOwnership: () => () => boolean; canExport: boolean; lastSuccessfulQuery: ${pascal}Query | null }): unknown
}>()

const { locale } = useI18n()
const translate = (zhCN: string, en: string) => locale.value.startsWith('zh') ? zhCN : en
const presentation = computed(() => create${pascal}Presentation(translate${dateArgument}))
const {
  add,
  canExport,
  changePage,
  deletingKey,
  dialogTitle,
  dialogVisible,
  edit,
  editing,
  form,
  lastSuccessfulQuery,
  listQuery,
  page,
  pageSize,
  query,
  remove,
  reset,
  search,
  setQuery,
  submit,
  saving,
} = useFlatCrudResource(presentation.value.resource, presentation.value.permissions.list)
</script>
`
}
