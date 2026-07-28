<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? t('system.dict.editTypeTitle') : t('system.dict.addTypeTitle')"
    width="420px"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item :label="t('system.dict.name')" prop="name">
        <el-input v-model="form.name" maxlength="100" :placeholder="t('system.dict.enterName')" />
      </el-form-item>
      <el-form-item :label="t('system.dict.code')" prop="code">
        <el-input
          v-model="form.code"
          :disabled="isEdit"
          maxlength="100"
          :placeholder="t('system.dict.enterCode')"
        />
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
  createDictType,
  updateDictType,
  type DictTypeRecord,
} from '@/api/modules/dict'

const { t } = useI18n()

interface DictTypeFormState {
  name: string
  code: string
  status: string
}

const props = defineProps<{
  modelValue: boolean
  dictType: DictTypeRecord | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const isEdit = computed(() => props.dictType !== null)
const formRef = ref<FormInstance>()
const submitting = ref(false)

function initialForm(): DictTypeFormState {
  return { name: '', code: '', status: '1' }
}

const form = ref<DictTypeFormState>(initialForm())
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('system.dict.enterName'), trigger: 'blur' }],
  code: [{ required: true, message: t('system.dict.enterCode'), trigger: 'blur' }],
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
    if (props.dictType) {
      form.value = {
        name: props.dictType.name,
        code: props.dictType.code,
        status: props.dictType.status,
      }
    }
  },
)

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (props.dictType) {
      await updateDictType(props.dictType.id, {
        name: form.value.name,
        status: form.value.status,
      })
      ElMessage.success(t('system.common.updateSuccess'))
    }
    else {
      await createDictType({
        name: form.value.name,
        code: form.value.code,
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
