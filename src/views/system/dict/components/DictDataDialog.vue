<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? t('system.dict.editDataTitle') : t('system.dict.addDataTitle')"
    width="420px"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item :label="t('system.dict.label')" prop="label">
        <el-input v-model="form.label" maxlength="100" :placeholder="t('system.dict.enterLabel')" />
      </el-form-item>
      <el-form-item :label="t('system.dict.value')" prop="value">
        <el-input v-model="form.value" maxlength="100" :placeholder="t('system.dict.enterValue')" />
      </el-form-item>
      <el-form-item :label="t('system.common.sort')">
        <el-input-number v-model="form.sort" :min="0" :max="999" />
      </el-form-item>
      <el-form-item v-if="isEdit" :label="t('system.common.status')">
        <el-radio-group v-model="form.status">
          <el-radio value="1">{{ t('system.common.normal') }}</el-radio>
          <el-radio value="0">{{ t('system.common.disabled') }}</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ t('system.common.cancel') }}</el-button>
      <el-button
        v-perm="isEdit ? 'system:dict:edit' : 'system:dict:add'"
        type="primary"
        :loading="submitting"
        @click="submit"
      >
        {{ t('system.common.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  createDictData,
  updateDictData,
  type DictDataRecord,
} from '@/api/modules/dict'

const { t } = useI18n()

interface DictDataFormState {
  label: string
  value: string
  sort: number
  status: string
}

const props = defineProps<{
  modelValue: boolean
  dictData: DictDataRecord | null
  typeCode: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const isEdit = computed(() => props.dictData !== null)
const formRef = ref<FormInstance>()
const submitting = ref(false)

function initialForm(): DictDataFormState {
  return { label: '', value: '', sort: 0, status: '1' }
}

const form = ref<DictDataFormState>(initialForm())
const rules = computed<FormRules>(() => ({
  label: [{ required: true, message: t('system.dict.enterLabel'), trigger: 'blur' }],
  value: [{ required: true, message: t('system.dict.enterValue'), trigger: 'blur' }],
}))

function resetForm(): void {
  form.value = initialForm()
  formRef.value?.clearValidate()
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    resetForm()
    if (props.dictData) {
      form.value = {
        label: props.dictData.label,
        value: props.dictData.value,
        sort: props.dictData.sort ?? 0,
        status: props.dictData.status,
      }
    }
  },
)

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (props.dictData) {
      await updateDictData(props.dictData.id, {
        label: form.value.label,
        value: form.value.value,
        sort: form.value.sort,
        status: form.value.status,
      })
      ElMessage.success(t('system.common.updateSuccess'))
    }
    else {
      if (!props.typeCode) throw new Error(t('system.dict.typeRequired'))
      await createDictData({
        type_code: props.typeCode,
        label: form.value.label,
        value: form.value.value,
        sort: form.value.sort,
      })
      ElMessage.success(t('system.common.addSuccess'))
    }
    visible.value = false
    emit('saved')
  }
  finally {
    submitting.value = false
  }
}
</script>
