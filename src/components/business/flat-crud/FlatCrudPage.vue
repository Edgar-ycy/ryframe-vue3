<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <FlatCrudQueryForm
        :fields="queryFields"
        :labels="labels"
        :model-value="query"
        :permissions="permissions"
        @reset="$emit('reset')"
        @search="$emit('search')"
        @update:model-value="$emit('update:query', $event)"
      />
    </el-card>

    <el-card shadow="never" class="content-card">
      <template #header>
        <div class="card-header">
          <span>{{ labels.title }}</span>
          <div class="flat-crud-actions">
            <slot name="actions" />
            <el-button v-perm="permissions.create" type="primary" icon="Plus" @click="$emit('add')">
              {{ labels.add }}
            </el-button>
          </div>
        </div>
      </template>
      <FlatCrudTable
        :columns="columns"
        :deleting-key="deletingKey"
        :labels="labels"
        :loading="loading"
        :permissions="permissions"
        :row-key="rowKey"
        :rows="rows"
        @edit="$emit('edit', $event)"
        @remove="$emit('remove', $event)"
      />
      <el-pagination
        v-pagination-a11y="t('common.pageSize')"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @update:current-page="$emit('update:page', $event)"
        @update:page-size="$emit('update:pageSize', $event)"
        @change="$emit('pageChange')"
      />
    </el-card>

    <FlatCrudFormDialog
      :editing="editing"
      :fields="formFields"
      :labels="labels"
      :model-value="form"
      :permissions="permissions"
      :saving="saving"
      :title="dialogTitle"
      :visible="dialogVisible"
      @submit="$emit('submit')"
      @update:model-value="$emit('update:form', $event)"
      @update:visible="$emit('update:dialogVisible', $event)"
    />
  </div>
</template>

<script
  setup
  lang="ts"
  generic="TRecord extends object, TQuery extends object, TForm extends object"
>
import { useI18n } from 'vue-i18n'
import FlatCrudFormDialog from './FlatCrudFormDialog.vue'
import FlatCrudQueryForm from './FlatCrudQueryForm.vue'
import FlatCrudTable from './FlatCrudTable.vue'
import { paginationA11yDirective as vPaginationA11y } from '@/shared/accessibility/pagination'
import type {
  FlatCrudColumn,
  FlatCrudFormField,
  FlatCrudLabels,
  FlatCrudPermissions,
  FlatCrudQueryField,
} from './model'

const { t } = useI18n()

defineProps<{
  columns: readonly FlatCrudColumn<TRecord>[]
  deletingKey: string | null
  dialogTitle: string
  dialogVisible: boolean
  editing: boolean
  form: TForm
  formFields: readonly FlatCrudFormField<TForm>[]
  labels: FlatCrudLabels
  loading: boolean
  page: number
  pageSize: number
  permissions: FlatCrudPermissions
  query: TQuery
  queryFields: readonly FlatCrudQueryField<TQuery>[]
  rowKey: (record: TRecord) => string
  rows: readonly TRecord[]
  saving: boolean
  total: number
}>()

defineEmits<{
  'update:dialogVisible': [value: boolean]
  'update:form': [value: TForm]
  'update:page': [value: number]
  'update:pageSize': [value: number]
  'update:query': [value: TQuery]
  add: []
  edit: [record: TRecord]
  pageChange: []
  remove: [record: TRecord]
  reset: []
  search: []
  submit: []
}>()
</script>

<style scoped>
.flat-crud-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
</style>
