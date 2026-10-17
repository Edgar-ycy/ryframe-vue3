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
        <el-input
          v-else-if="field.kind === 'textarea'"
          :disabled="editing && field.disabledOnEdit"
          :model-value="textValue(field)"
          :placeholder="field.placeholder"
          :rows="4"
          type="textarea"
          @update:model-value="updateField(field, $event)"
        />
        <el-input
          v-else-if="field.kind === 'json'"
          :disabled="editing && field.disabledOnEdit"
          :model-value="textValue(field)"
          :placeholder="field.placeholder"
          :rows="6"
          class="json-input"
          spellcheck="false"
          type="textarea"
          @update:model-value="updateField(field, $event)"
        />
        <el-input-number
          v-else-if="field.kind === 'number'"
          :disabled="editing && field.disabledOnEdit"
          :max="field.max"
          :min="field.min"
          :model-value="numberValue(field)"
          @update:model-value="updateField(field, $event)"
        />
        <el-switch
          v-else-if="field.kind === 'switch'"
          :disabled="editing && field.disabledOnEdit"
          :model-value="switchValue(field)"
          @update:model-value="updateField(field, $event)"
        />
        <el-date-picker
          v-else-if="field.kind === 'date'"
          :disabled="editing && field.disabledOnEdit"
          :model-value="dateValue(field)"
          :placeholder="field.placeholder"
          type="date"
          value-format="YYYY-MM-DD"
          @update:model-value="updateField(field, $event)"
        />
        <el-date-picker
          v-else-if="field.kind === 'date_time'"
          :disabled="editing && field.disabledOnEdit"
          :model-value="dateValue(field)"
          :placeholder="field.placeholder"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
          @update:model-value="updateField(field, $event)"
        />
        <el-radio-group
          v-else
          :disabled="editing && field.disabledOnEdit"
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
import { computed, ref, watch } from 'vue'
import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import type { ServerStatePageOperation } from '@/shared/query/pageOperationScope'

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
  submit: [operation: ServerStatePageOperation]
}>()

const formRef = ref<FormInstance>()
let submissionGeneration = 0
const visibleFields = computed(() =>
  props.fields.filter((field) => !field.editOnly || props.editing),
)
const rules = computed<FormRules>(() =>
  Object.fromEntries(props.fields.map((field) => [field.key, fieldRules(field)])),
)

function fieldRules(field: FlatCrudFormField<TModel>): FormItemRule[] {
  const rules: FormItemRule[] = []
  const requiredMessage =
    field.kind !== 'switch' && 'requiredMessage' in field ? field.requiredMessage : undefined
  if (requiredMessage) {
    rules.push({
      required: true,
      message: requiredMessage,
      trigger: ['blur', 'change'],
    })
  }
  if (field.kind === 'json') {
    rules.push({
      validator: (_rule, value, callback) => {
        if (value === null || value === undefined || value === '') {
          callback()
          return
        }
        if (typeof value !== 'string') {
          callback(new Error(field.invalidMessage))
          return
        }
        try {
          JSON.parse(value)
          callback()
        } catch {
          callback(new Error(field.invalidMessage))
        }
      },
      trigger: ['blur', 'change'],
    })
  }
  return rules
}

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

function switchValue(field: FlatCrudFormField<TModel>): boolean {
  return fieldValue(field) === true
}

function dateValue(field: FlatCrudFormField<TModel>): string | null | undefined {
  const value = fieldValue(field)
  if (value === null || value === undefined) return value
  if (typeof value !== 'string') throw new Error(`日期字段 ${field.key} 必须使用字符串`)
  return value
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
  if (props.editing && field.disabledOnEdit) return
  emit('update:modelValue', Object.assign({}, props.modelValue, { [field.key]: value }))
}

async function submit(): Promise<void> {
  const operation = beginServerStatePageOperation()
  const generation = submissionGeneration
  if (!(await formRef.value?.validate().catch(() => false))) return
  if (!operation.isCurrent(() => props.visible && generation === submissionGeneration)) return
  emit('submit', operation)
}

watch(
  () => props.visible,
  () => {
    submissionGeneration += 1
  },
  { flush: 'sync' },
)
</script>
