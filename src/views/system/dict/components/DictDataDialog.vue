<template>
  <el-dialog
    v-model="visible"
    :title="isEdit() ? t('system.dict.editDataTitle') : t('system.dict.addDataTitle')"
    width="420px"
    @open="populateForm"
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
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  createDictData,
  updateDictData,
  type DictDataCreateInput,
  type DictDataRecord,
  type DictDataUpdateInput,
} from '@/api/modules/dict'
import type { Id } from '@/shared/http/types'
import { validateServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'

const { t } = useI18n()

interface DictDataFormState {
  label: string
  value: string
  sort: number
  status: string
}

type SaveDictDataCommand =
  | { kind: 'create'; data: DictDataCreateInput }
  | { kind: 'update'; id: Id; data: DictDataUpdateInput }

const props = defineProps<{
  dictData: DictDataRecord | null
  typeCode: string | null
}>()

const emit = defineEmits<{
  saved: []
}>()

const visible = defineModel<boolean>({ required: true })
function isEdit(): boolean {
  return props.dictData !== null
}
const formRef = ref<FormInstance>()
const pageLifecycle = useServerStatePageLifecycle(resetPageState)
const saveMutation = useServerStateMutation<void, SaveDictDataCommand>('dict-data', {
  mutationFn: async (command) => {
    if (command.kind === 'update') await updateDictData(command.id, command.data)
    else await createDictData(command.data)
  },
})
const submitting = saveMutation.pending

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

function resetPageState(): void {
  visible.value = false
  resetForm()
}

function populateForm(): void {
  resetForm()
  if (!props.dictData) return
  form.value = {
    label: props.dictData.label,
    value: props.dictData.value,
    sort: props.dictData.sort ?? 0,
    status: props.dictData.status,
  }
}

async function submit(): Promise<void> {
  if (submitting.value) return
  const ownsPage = pageLifecycle.captureOwnership()
  const expectedDataId = props.dictData?.id ?? null
  const expectedTypeCode = props.typeCode
  const ownsDialog = () =>
    ownsPage() &&
    visible.value &&
    (props.dictData?.id ?? null) === expectedDataId &&
    props.typeCode === expectedTypeCode
  const operation = await validateServerStatePageOperation(
    () => formRef.value?.validate().catch(() => false) ?? Promise.resolve(false),
    ownsDialog,
  )
  if (!operation) return
  if (!props.dictData && !props.typeCode) throw new Error(t('system.dict.typeRequired'))

  const command: SaveDictDataCommand = props.dictData
    ? {
        kind: 'update',
        id: props.dictData.id,
        data: {
          label: form.value.label,
          value: form.value.value,
          sort: form.value.sort,
          status: form.value.status,
        },
      }
    : {
        kind: 'create',
        data: {
          type_code: props.typeCode!,
          label: form.value.label,
          value: form.value.value,
          sort: form.value.sort,
        },
      }
  await saveMutation.mutateAsync(command)
  operation.apply(() => {
    ElMessage.success(
      t(command.kind === 'update' ? 'system.common.updateSuccess' : 'system.common.addSuccess'),
    )
    visible.value = false
    emit('saved')
  }, ownsDialog)
}
</script>
