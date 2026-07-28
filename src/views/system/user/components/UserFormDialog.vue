<template>
  <el-dialog v-model="visible" :title="isEdit ? t('system.user.editTitle') : t('system.user.addTitle')" width="580px" @closed="resetForm">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item :label="t('system.user.username')" prop="username">
        <el-input v-model="form.username" :disabled="isEdit" :placeholder="t('system.user.enterUsername')" maxlength="50" />
      </el-form-item>
      <el-form-item :label="t('system.user.nickname')" prop="nickname">
        <el-input v-model="form.nickname" :placeholder="t('system.user.enterNickname')" maxlength="50" />
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
          :props="{ label: 'name', value: 'id', children: 'children' }"
          :placeholder="t('system.user.selectDepartment')"
          clearable
          check-strictly
          style="width:100%"
        />
      </el-form-item>
      <el-form-item v-if="!isEdit" :label="t('system.user.role')">
        <el-select v-model="form.role_ids" multiple :placeholder="t('system.user.selectRole')" style="width:100%">
          <el-option
            v-for="role in assignableRoles"
            :key="role.id"
            :label="role.name"
            :value="role.id"
            :disabled="role.status !== '1'"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ t('system.common.cancel') }}</el-button>
      <el-button
        v-perm="isEdit ? 'system:user:edit' : 'system:user:add'"
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
import { createUser, getUser, updateUser, type UserRecord } from '@/api/modules/user'
import type { RoleRecord } from '@/api/modules/role'
import type { DeptNode } from '@/api/modules/dept'
import type { Id } from '@/shared/http/types'

const { t } = useI18n()

interface UserFormState {
  username: string
  nickname: string
  email: string
  phone: string
  dept_id?: Id
  role_ids: Id[]
}

const props = defineProps<{
  modelValue: boolean
  user: UserRecord | null
  deptTree: DeptNode[]
  roles: RoleRecord[]
  isAdmin: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const isEdit = computed(() => props.user !== null)
const assignableRoles = computed(() =>
  props.isAdmin
    ? props.roles
    : props.roles.filter(role => role.is_super !== 1 && role.code !== 'admin'),
)

const formRef = ref<FormInstance>()
const submitting = ref(false)

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
  formRef.value?.clearValidate()
}

async function loadUser(user: UserRecord) {
  const response = await getUser(user.id)
  if (!response.data) throw new Error(t('system.user.detailMissing'))

  const detail = response.data
  form.value = {
    username: detail.username,
    nickname: detail.nickname,
    email: detail.email || '',
    phone: detail.phone || '',
    dept_id: detail.dept_id ?? undefined,
    role_ids: [],
  }
}

watch(
  () => props.modelValue,
  async open => {
    if (!open) return
    resetForm()
    if (props.user) await loadUser(props.user)
  },
)

function hasForbiddenRoleSelection() {
  if (props.isAdmin) return false
  const adminRole = props.roles.find(role => role.is_super === 1 || role.code === 'admin')
  return adminRole ? form.value.role_ids.includes(adminRole.id) : false
}

async function submit() {
  const fields = isEdit.value ? ['nickname'] : ['username', 'nickname']
  const valid = await formRef.value?.validateField(fields).catch(() => false)
  if (valid === false) return
  if (hasForbiddenRoleSelection()) {
    ElMessage.warning(t('system.user.superRoleForbidden'))
    return
  }

  submitting.value = true
  try {
    const editingUser = props.user
    if (editingUser) {
      await updateUser(editingUser.id, {
        nickname: form.value.nickname,
        email: form.value.email || undefined,
        phone: form.value.phone || undefined,
        dept_id: form.value.dept_id,
      })
      ElMessage.success(t('system.common.updateSuccess'))
    } else {
      const response = await createUser({
        username: form.value.username,
        nickname: form.value.nickname,
        email: form.value.email || undefined,
        phone: form.value.phone || undefined,
        dept_id: form.value.dept_id,
        role_ids: form.value.role_ids,
      })
      if (!response.data) throw new Error(t('system.user.createResponseMissing'))
      ElMessage.success(t('system.user.createdPending'))
    }

    visible.value = false
    emit('saved')
  } finally {
    submitting.value = false
  }
}
</script>
