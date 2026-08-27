<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="480px"
    @closed="formRef?.clearValidate()"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="modelValue" :rules="rules" label-width="90px">
      <el-form-item
        v-for="field in visibleFields"
        :key="field.key"
        :label="field.label"
        :prop="field.key"
      >
        <el-input
          v-if="field.kind === 'text'"
          :disabled="editing && field.disabledOnEdit"
          :model-value="textValue(field)"
          :placeholder="field.placeholder"
          @update:model-value="updateField(field, $event)"
        />
        <el-input-number
          v-else-if="field.kind === 'number'"
          :max="field.max"
          :min="field.min"
          :model-value="numberValue(field)"
          @update:model-value="updateField(field, $event)"
        />
        <el-radio-group
          v-else
          :model-value="optionValue(field)"
          @update:model-value="updateField(field, $event)"
        >
          <el-radio
            v-for="option in field.options"
            :key="String(option.value)"
            :value="option.value"
          >
            {{ option.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">{{ labels.cancel }}</el-button>
      <el-button
        v-perm="editing ? permissions.update : permissions.create"
        type="primary"
        :loading="saving"
        @click="submit"
      >
        {{ labels.confirm }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts" generic="TModel extends object">
import type { FormInstance } from 'element-plus'

import type {
  FlatCrudFormField,
  FlatCrudLabels,
  FlatCrudPermissions,
  FlatCrudScalar,
} from './model'

const props = defineProps<{
  editing: boolean
  fields: readonly FlatCrudFormField<TModel>[]
  labels: Pick<FlatCrudLabels, 'cancel' | 'confirm'>
  modelValue: TModel
  permissions: Pick<FlatCrudPermissions, 'create' | 'update'>
  saving: boolean
  title: string
  visible: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TModel]
  'update:visible': [value: boolean]
  submit: []
}>()

const formRef = ref<FormInstance>()
const visibleFields = computed(() =>
  props.fields.filter((field) => !field.editOnly || props.editing),
)
const rules = computed(() =>
  Object.fromEntries(
    props.fields.flatMap((field) =>
      field.kind === 'text' && field.requiredMessage
        ? [[field.key, [{ required: true, message: field.requiredMessage, trigger: 'blur' }]]]
        : [],
    ),
  ),
)

function fieldValue(field: FlatCrudFormField<TModel>): FlatCrudScalar {
  const value: unknown = Reflect.get(props.modelValue, field.key)
  if (value === null || value === undefined) return value
  if (['string', 'number', 'boolean'].includes(typeof value)) return value as FlatCrudScalar
  throw new Error(`平面资源表单字段 ${field.key} 不是标量值`)
}

function numberValue(field: FlatCrudFormField<TModel>): number | undefined {
  const value = fieldValue(field)
  return typeof value === 'number' ? value : undefined
}

function textValue(field: FlatCrudFormField<TModel>): string | number | null | undefined {
  const value = fieldValue(field)
  if (typeof value === 'boolean') throw new Error(`文本字段 ${field.key} 不能使用布尔值`)
  return value
}

function optionValue(field: FlatCrudFormField<TModel>): string | number | boolean | undefined {
  return fieldValue(field) ?? undefined
}

function updateField(field: FlatCrudFormField<TModel>, value: FlatCrudScalar): void {
  emit('update:modelValue', Object.assign({}, props.modelValue, { [field.key]: value }))
}

async function submit(): Promise<void> {
  if (!(await formRef.value?.validate().catch(() => false))) return
  emit('submit')
}
</script>
