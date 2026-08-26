<template>
  <el-dialog
    v-model="visible"
    :title="isEdit() ? t('system.role.editTitle') : t('system.role.addTitle')"
    width="500px"
    @open="handleOpen"
    @closed="resetForm"
  >
    <el-form
      ref="formRef"
      v-loading="detailLoading"
      :model="form"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item :label="t('system.role.name')" prop="name">
        <el-input v-model="form.name" :placeholder="t('system.role.enterName')" maxlength="50" />
      </el-form-item>
      <el-form-item :label="t('system.role.code')" prop="code">
        <el-input
          v-model="form.code"
          :disabled="isEdit()"
          :placeholder="t('system.role.enterCode')"
          maxlength="50"
        />
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
        v-perm="isEdit() ? 'system:role:edit' : 'system:role:add'"
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
  type RoleCreateInput,
  type RoleRecord,
  type RoleUpdateInput,
} from '@/api/modules/role'
import type { Id } from '@/shared/http/types'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()

interface RoleFormState {
  name: string
  code: string
  sort: number
  status: string
}

type SaveRoleCommand =
  { kind: 'create'; data: RoleCreateInput } | { kind: 'update'; id: Id; data: RoleUpdateInput }

const props = defineProps<{
  role: RoleRecord | null
}>()

const emit = defineEmits<{
  saved: []
}>()

const visible = defineModel<boolean>({ required: true })
function isEdit(): boolean {
  return props.role !== null
}
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const detailQuery = useTenantQuery<RoleRecord>(
  () => userStore.tenantId,
  () => userStore.sessionStatus === 'authenticated' && visible.value && props.role !== null,
  'roles',
  () => ({ scope: 'detail', id: props.role?.id ?? null }),
  async (signal) => {
    const role = props.role
    if (!role) throw new Error(t('system.role.detailMissing'))
    const response = await getRole(role.id, signal)
    if (!response.data) throw new Error(t('system.role.detailMissing'))
    return response.data
  },
)
const saveMutation = useTenantMutation<void, SaveRoleCommand>(() => userStore.tenantId, 'roles', {
  mutationFn: async (command) => {
    if (command.kind === 'update') await updateRole(command.id, command.data)
    else await createRole(command.data)
  },
  onSuccess: (_data, command) => {
    ElMessage.success(
      t(command.kind === 'update' ? 'system.common.updateSuccess' : 'system.common.addSuccess'),
    )
  },
})
const detailLoading = detailQuery.isFetching
const submitting = saveMutation.pending

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

function populateForm(role: RoleRecord): void {
  form.value = {
    name: role.name,
    code: role.code,
    sort: role.sort,
    status: role.status,
  }
}

function handleOpen(): void {
  resetForm()
  if (detailQuery.data.value) populateForm(detailQuery.data.value)
}

watch(
  () => detailQuery.data.value,
  (role) => {
    if (visible.value && role) populateForm(role)
  },
)

async function submit(): Promise<void> {
  if (submitting.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const command: SaveRoleCommand = props.role
    ? {
        kind: 'update',
        id: props.role.id,
        data: {
          name: form.value.name,
          sort: form.value.sort,
          status: form.value.status,
        },
      }
    : {
        kind: 'create',
        data: {
          name: form.value.name,
          code: form.value.code,
          sort: form.value.sort,
        },
      }

  await saveMutation.mutateAsync(command)
  visible.value = false
  emit('saved')
}
</script>
