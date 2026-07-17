<template>
  <el-dialog v-model="visible" :title="isEdit ? '编辑用户' : '新增用户'" width="580px" @closed="resetForm">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" :disabled="isEdit" placeholder="请输入用户名" maxlength="50" />
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="form.nickname" placeholder="请输入昵称" maxlength="50" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" placeholder="请输入邮箱" />
      </el-form-item>
      <el-form-item label="手机号">
        <el-input v-model="form.phone" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item label="部门">
        <el-tree-select
          v-model="form.dept_id"
          :data="deptTree"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          placeholder="选择部门"
          clearable
          check-strictly
          style="width:100%"
        />
      </el-form-item>
      <el-form-item v-if="!isEdit" label="角色">
        <el-select v-model="form.role_ids" multiple placeholder="请选择角色" style="width:100%">
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
      <el-button @click="visible = false">取消</el-button>
      <el-button
        v-perm="isEdit ? 'system:user:edit' : 'system:user:add'"
        type="primary"
        :loading="submitting"
        @click="submit"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { createUser, getUser, updateUser, type UserRecord } from '@/api/modules/user'
import type { RoleRecord } from '@/api/modules/role'
import type { DeptNode } from '@/api/modules/dept'
import type { Id } from '@/shared/http/types'

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
const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }],
}

function resetForm() {
  form.value = initialForm()
  formRef.value?.clearValidate()
}

async function loadUser(user: UserRecord) {
  const response = await getUser(user.id)
  if (!response.data) throw new Error('用户详情响应缺少数据')

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
    ElMessage.warning('禁止分配超级管理员角色')
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
      ElMessage.success('更新成功')
    } else {
      const response = await createUser({
        username: form.value.username,
        nickname: form.value.nickname,
        email: form.value.email || undefined,
        phone: form.value.phone || undefined,
        dept_id: form.value.dept_id,
        role_ids: form.value.role_ids,
      })
      if (!response.data) throw new Error('创建用户响应缺少数据')
      ElMessage.success('用户已创建，状态为待激活')
    }

    visible.value = false
    emit('saved')
  } finally {
    submitting.value = false
  }
}
</script>
