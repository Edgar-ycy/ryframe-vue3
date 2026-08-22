<template>
  <el-form :model="modelValue" inline>
    <el-form-item v-for="field in fields" :key="field.key" :label="field.label">
      <el-input
        v-if="field.kind === 'text'"
        :model-value="fieldValue(field)"
        :placeholder="field.placeholder"
        clearable
        @update:model-value="updateField(field, $event)"
        @keyup.enter="$emit('search')"
      />
      <el-select
        v-else
        :model-value="fieldValue(field)"
        :placeholder="field.placeholder"
        clearable
        @update:model-value="updateField(field, $event)"
      >
        <el-option
          v-for="option in field.options"
          :key="String(option.value)"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </el-form-item>
    <el-form-item>
      <el-button v-perm="permissions.list" type="primary" icon="Search" @click="$emit('search')">
        {{ labels.search }}
      </el-button>
      <el-button v-perm="permissions.list" icon="Refresh" @click="$emit('reset')">
        {{ labels.reset }}
      </el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts" generic="TModel extends object">
import type {
  FlatCrudLabels,
  FlatCrudPermissions,
  FlatCrudQueryField,
  FlatCrudScalar,
} from './model'

const props = defineProps<{
  fields: readonly FlatCrudQueryField<TModel>[]
  labels: Pick<FlatCrudLabels, 'search' | 'reset'>
  modelValue: TModel
  permissions: Pick<FlatCrudPermissions, 'list'>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TModel]
  reset: []
  search: []
}>()

function fieldValue(field: FlatCrudQueryField<TModel>): FlatCrudScalar {
  const value: unknown = Reflect.get(props.modelValue, field.key)
  if (value === null || value === undefined) return value
  if (['string', 'number', 'boolean'].includes(typeof value)) return value as FlatCrudScalar
  throw new Error(`平面资源查询字段 ${field.key} 不是标量值`)
}

function updateField(field: FlatCrudQueryField<TModel>, value: FlatCrudScalar): void {
  emit('update:modelValue', Object.assign({}, props.modelValue, { [field.key]: value }))
}
</script>
