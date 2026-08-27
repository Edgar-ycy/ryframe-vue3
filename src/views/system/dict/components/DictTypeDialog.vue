<template>
  <el-dialog
    v-model="visible"
    :title="isEdit() ? t('system.dict.editTypeTitle') : t('system.dict.addTypeTitle')"
    width="420px"
    @open="populateForm"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item :label="t('system.dict.name')" prop="name">
        <el-input v-model="form.name" maxlength="100" :placeholder="t('system.dict.enterName')" />
      </el-form-item>
      <el-form-item :label="t('system.dict.code')" prop="code">
        <el-input
          v-model="form.code"
          :disabled="isEdit()"
          maxlength="100"
          :placeholder="t('system.dict.enterCode')"
        />
      </el-form-item>
      <el-form-item v-if="isEdit()" :label="t('system.common.status')">
        <el-radio-group v-model="form.status">
          <el-radio value="1">{{ t('system.common.normal') }}</el-radio>
          <el-radio value="0">{{ t('system.common.disabled') }}</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ t('system.common.cancel') }}</el-button>
      <el-button
        v-perm="isEdit() ? 'system:dict:edit' : 'system:dict:add'"
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
  type DictTypeCreateInput,
  type DictTypeRecord,
  type DictTypeUpdateInput,
} from '@/api/modules/dict'
import type { Id } from '@/shared/http/types'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'

const { t } = useI18n()

interface DictTypeFormState {
  name: string
  code: string
  status: string
}

type SaveDictTypeCommand =
  | { kind: 'create'; data: DictTypeCreateInput }
  | { kind: 'update'; id: Id; data: DictTypeUpdateInput }

const props = defineProps<{
  dictType: DictTypeRecord | null
}>()

const emit = defineEmits<{
  saved: []
}>()

const visible = defineModel<boolean>({ required: true })
function isEdit(): boolean {
  return props.dictType !== null
}
const formRef = ref<FormInstance>()
const saveMutation = useServerStateMutation<void, SaveDictTypeCommand>('dict-types', {
  mutationFn: async (command) => {
    if (command.kind === 'update') await updateDictType(command.id, command.data)
    else await createDictType(command.data)
  },
  onSuccess: (_data, command) => {
    ElMessage.success(
      t(command.kind === 'update' ? 'system.common.updateSuccess' : 'system.common.addSuccess'),
    )
  },
})
const submitting = saveMutation.pending

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

function populateForm(): void {
  resetForm()
  if (!props.dictType) return
  form.value = {
    name: props.dictType.name,
    code: props.dictType.code,
    status: props.dictType.status,
  }
}

async function submit(): Promise<void> {
  if (submitting.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const command: SaveDictTypeCommand = props.dictType
    ? {
        kind: 'update',
        id: props.dictType.id,
        data: { name: form.value.name, status: form.value.status },
      }
    : {
        kind: 'create',
        data: { name: form.value.name, code: form.value.code },
      }
  await saveMutation.mutateAsync(command)
  visible.value = false
  emit('saved')
}
</script>
