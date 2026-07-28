<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? t('system.role.editTitle') : t('system.role.addTitle')"
    width="500px"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item :label="t('system.role.name')" prop="name">
        <el-input v-model="form.name" :placeholder="t('system.role.enterName')" maxlength="50" />
      </el-form-item>
      <el-form-item :label="t('system.role.code')" prop="code">
        <el-input v-model="form.code" :disabled="isEdit" :placeholder="t('system.role.enterCode')" maxlength="50" />
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
        v-perm="isEdit ? 'system:role:edit' : 'system:role:add'"
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
  createRole,
  getRole,
  updateRole,
  type RoleRecord,
} from '@/api/modules/role'

const { t } = useI18n()

interface RoleFormState {
  name: string
  code: string
  sort: number
  status: string
}

const props = defineProps<{
  modelValue: boolean
  role: RoleRecord | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const isEdit = computed(() => props.role !== null)
const formRef = ref<FormInstance>()
const submitting = ref(false)

function initialForm(): RoleFormState {
  return { name: '', code: '', sort: 0, status: '1' }
}

const form = ref<RoleFormState>(initialForm())
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('system.role.enterName'), trigger: 'blur' }],
  code: [{ required: true, message: t('system.role.enterCode'), trigger: 'blur' }],
}))

function resetForm(): void {
  form.value = initialForm()
  formRef.value?.clearValidate()
}

async function loadRole(role: RoleRecord): Promise<void> {
  const response = await getRole(role.id)
  if (!response.data) throw new Error(t('system.role.detailMissing'))
  form.value = {
    name: response.data.name,
    code: response.data.code,
    sort: response.data.sort,
    status: response.data.status,
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    resetForm()
    if (props.role) {
      void loadRole(props.role).catch(() => {
        visible.value = false
      })
    }
  },
)

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (props.role) {
      await updateRole(props.role.id, {
        name: form.value.name,
        sort: form.value.sort,
        status: form.value.status,
      })
      ElMessage.success(t('system.common.updateSuccess'))
    }
    else {
      await createRole({
        name: form.value.name,
        code: form.value.code,
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
