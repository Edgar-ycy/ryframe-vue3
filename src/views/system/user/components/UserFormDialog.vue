<template>
  <el-dialog
    v-model="visible"
    :title="isEdit() ? t('system.user.editTitle') : t('system.user.addTitle')"
    width="580px"
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
      <el-form-item :label="t('system.user.username')" prop="username">
        <el-input
          v-model="form.username"
          :disabled="isEdit()"
          :placeholder="t('system.user.enterUsername')"
          maxlength="50"
        />
      </el-form-item>
      <el-form-item :label="t('system.user.nickname')" prop="nickname">
        <el-input
          v-model="form.nickname"
          :placeholder="t('system.user.enterNickname')"
          maxlength="50"
        />
      </el-form-item>
      <el-form-item :label="t('system.user.email')" prop="email">
        <el-input v-model="form.email" :placeholder="t('system.user.enterEmail')" />
      </el-form-item>
      <el-form-item :label="t('system.user.phone')">
        <el-input v-model="form.phone" :placeholder="t('system.user.enterPhone')" />
      </el-form-item>
      <el-form-item :label="t('system.user.department')">
        <el-tree-select
          v-model="form.dept_id"
          :data="deptTree"
          :props="departmentTreeProps"
          :placeholder="t('system.user.selectDepartment')"
          clearable
          check-strictly
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item v-if="!isEdit()" :label="t('system.user.role')">
        <el-select
          v-model="form.role_ids"
          multiple
          filterable
          remote
          :remote-method="remoteRoleSearch"
          :loading="roleOptionsLoading"
          :placeholder="t('system.user.selectRole')"
          style="width: 100%"
          @change="syncSelectedRoleOptions"
        >
          <el-option
            v-for="role in roleOptions"
            :key="role.value"
            :label="role.label"
            :value="role.value"
            :disabled="role.disabled"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ t('system.common.cancel') }}</el-button>
      <el-button
        v-perm="isEdit() ? 'system:user:edit' : 'system:user:add'"
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
  createUser,
  getUser,
  updateUser,
  type UserCreateInput,
  type UserDetail,
  type UserRecord,
  type UserUpdateInput,
} from '@/api/modules/user'
import type { SelectOption } from '@/api/modules/option'
import type { DeptNode } from '@/api/modules/dept'
import type { Id } from '@/shared/http/types'
import { validateServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { useRoleOptions } from '../composables/useRoleOptions'

const { t } = useI18n()

const departmentTreeProps = { value: 'id', label: 'name', children: 'children' } as const

interface UserFormState {
  username: string
  nickname: string
  email: string
  phone: string
  dept_id?: Id
  role_ids: Id[]
}

type SaveUserCommand =
  { kind: 'create'; data: UserCreateInput } | { kind: 'update'; id: Id; data: UserUpdateInput }

const props = defineProps<{
  user: UserRecord | null
  deptTree: DeptNode[]
}>()

const emit = defineEmits<{
  saved: []
}>()

const visible = defineModel<boolean>({ required: true })
function isEdit(): boolean {
  return props.user !== null
}
const userStore = useUserStore()
const selectedRoleOptions = ref<SelectOption[]>([])
const pageLifecycle = useServerStatePageLifecycle(resetPageState)
const {
  loading: roleOptionsLoading,
  options: roleOptions,
  remoteMethod: remoteRoleSearch,
  resetSearch: resetRoleSearch,
} = useRoleOptions(
  () => pageLifecycle.pageActive.value && visible.value && !isEdit(),
  selectedRoleOptions,
)

const formRef = ref<FormInstance>()
const detailQuery = useServerStateQuery<UserDetail>(
  () =>
    pageLifecycle.pageActive.value &&
    userStore.sessionStatus === 'authenticated' &&
    visible.value &&
    props.user !== null,
  'users',
  () => ({ scope: 'detail', id: props.user?.id ?? null }),
  async (signal) => {
    const user = props.user
    if (!user) throw new Error(t('system.user.detailMissing'))
    const response = await getUser(user.id, signal)
    if (!response.data) throw new Error(t('system.user.detailMissing'))
    return response.data
  },
)
const detailLoading = detailQuery.isFetching
const saveMutation = useServerStateMutation<void, SaveUserCommand>('users', {
  mutationFn: async (command) => {
    if (command.kind === 'update') {
      await updateUser(command.id, command.data)
      return
    }
    const response = await createUser(command.data)
    if (!response.data) throw new Error(t('system.user.createResponseMissing'))
  },
})
const submitting = saveMutation.pending

function initialForm(): UserFormState {
  return {
    username: '',
    nickname: '',
    email: '',
    phone: '',
    dept_id: undefined,
    role_ids: [],
  }
}

const form = ref<UserFormState>(initialForm())
const rules = computed<FormRules>(() => ({
  username: [{ required: true, message: t('system.user.enterUsername'), trigger: 'blur' }],
  nickname: [{ required: true, message: t('system.user.enterNickname'), trigger: 'blur' }],
  email: [{ type: 'email', message: t('system.user.invalidEmail'), trigger: 'blur' }],
}))

function resetForm() {
  form.value = initialForm()
  selectedRoleOptions.value = []
  resetRoleSearch()
  formRef.value?.clearValidate()
}

function resetPageState(): void {
  visible.value = false
  resetForm()
}

function syncSelectedRoleOptions(): void {
  const known = new Map(
    [...selectedRoleOptions.value, ...roleOptions.value].map((option) => [option.value, option]),
  )
  selectedRoleOptions.value = form.value.role_ids
    .map((roleId) => known.get(roleId))
    .filter((option): option is SelectOption => option !== undefined)
}

function populateForm(detail: UserDetail): void {
  form.value = {
    username: detail.username,
    nickname: detail.nickname,
    email: detail.email || '',
    phone: detail.phone || '',
    dept_id: detail.dept_id ?? undefined,
    role_ids: [],
  }
}

function handleOpen(): void {
  resetForm()
  if (detailQuery.data.value) populateForm(detailQuery.data.value)
}

watch(
  () => detailQuery.data.value,
  (detail) => {
    if (visible.value && detail) populateForm(detail)
  },
)

async function submit() {
  if (submitting.value) return
  const ownsPage = pageLifecycle.captureOwnership()
  const expectedUserId = props.user?.id ?? null
  const ownsDialog = () =>
    ownsPage() && visible.value && (props.user?.id ?? null) === expectedUserId
  const fields = isEdit() ? ['nickname'] : ['username', 'nickname']
  const operation = await validateServerStatePageOperation(
    () => formRef.value?.validateField(fields).catch(() => false) ?? Promise.resolve(false),
    ownsDialog,
  )
  if (!operation) return
  const editingUser = props.user
  const command: SaveUserCommand = editingUser
    ? {
        kind: 'update',
        id: editingUser.id,
        data: {
          nickname: form.value.nickname,
          email: form.value.email || undefined,
          phone: form.value.phone || undefined,
          dept_id: form.value.dept_id,
        },
      }
    : {
        kind: 'create',
        data: {
          username: form.value.username,
          nickname: form.value.nickname,
          email: form.value.email || undefined,
          phone: form.value.phone || undefined,
          dept_id: form.value.dept_id,
          role_ids: form.value.role_ids,
        },
      }

  await saveMutation.mutateAsync(command)
  operation.apply(() => {
    ElMessage.success(
      t(command.kind === 'update' ? 'system.common.updateSuccess' : 'system.user.createdPending'),
    )
    visible.value = false
    emit('saved')
  }, ownsDialog)
}
</script>
