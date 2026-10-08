<template>
  <el-table
    ref="tableInstance"
    v-loading="loading"
    :data="[...rows]"
    :row-key="rowKey"
    border
    stripe
    @selection-change="$emit('selectionChange', $event)"
  >
    <el-table-column v-if="selectionEnabled" type="selection" width="48" />
    <el-table-column
      v-for="column in columns"
      :key="column.key"
      :align="column.align"
      :label="column.label"
      :min-width="column.minWidth"
      :width="column.width"
      show-overflow-tooltip
    >
      <template #default="{ row }: { row: TRecord }">
        <el-tag
          v-if="column.display === 'status'"
          :type="cellValue(row, column) === column.positiveValue ? 'success' : 'danger'"
          size="small"
        >
          {{ optionLabel(column.options, cellValue(row, column)) }}
        </el-tag>
        <template v-else-if="column.display === 'datetime'">
          {{ column.format(String(cellValue(row, column) ?? '')) }}
        </template>
        <template v-else>
          {{ cellValue(row, column) }}
        </template>
      </template>
    </el-table-column>
    <el-table-column :label="labels.actions" fixed="right" align="center">
      <template #default="{ row }: { row: TRecord }">
        <el-button
          v-perm="permissions.update"
          type="primary"
          link
          icon="Edit"
          @click="$emit('edit', row)"
        >
          {{ labels.edit }}
        </el-button>
        <el-button
          v-perm="permissions.remove"
          type="danger"
          link
          icon="Delete"
          :loading="deletingKey === rowKey(row)"
          @click="$emit('remove', row)"
        >
          {{ labels.remove }}
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts" generic="TRecord extends object">
import { ref, watch } from 'vue'
import type { TableInstance } from 'element-plus'
import type {
  FlatCrudColumn,
  FlatCrudLabels,
  FlatCrudOption,
  FlatCrudPermissions,
  FlatCrudScalar,
} from './model'

defineProps<{
  columns: readonly FlatCrudColumn<TRecord>[]
  deletingKey: string | null
  labels: Pick<FlatCrudLabels, 'actions' | 'edit' | 'remove'>
  loading: boolean
  permissions: Pick<FlatCrudPermissions, 'update' | 'remove'>
  rowKey: (record: TRecord) => string
  rows: readonly TRecord[]
  selectionEnabled?: boolean
}>()

const emit = defineEmits<{
  edit: [record: TRecord]
  remove: [record: TRecord]
  selectionChange: [records: TRecord[]]
  tableReady: [table: TableInstance | undefined]
}>()

const tableInstance = ref<TableInstance>()
watch(tableInstance, (table) => emit('tableReady', table), { flush: 'post' })

function cellValue(record: TRecord, column: FlatCrudColumn<TRecord>): FlatCrudScalar {
  const value: unknown = Reflect.get(record, column.key)
  if (value === null || value === undefined) return value
  if (['string', 'number', 'boolean'].includes(typeof value)) return value as FlatCrudScalar
  throw new Error(`平面资源列表字段 ${column.key} 不是标量值`)
}

function optionLabel(options: readonly FlatCrudOption[], value: FlatCrudScalar): string {
  return options.find((option) => option.value === value)?.label ?? String(value ?? '')
}
</script>
