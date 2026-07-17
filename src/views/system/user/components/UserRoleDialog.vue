<template>
  <el-dialog v-model="visible" title="分配用户角色" width="520px" @closed="reset">
    <el-form v-loading="loading" label-width="80px">
      <el-form-item label="用户">
        <el-input :model-value="user?.nickname ?? ''" disabled />
      </el-form-item>
      <el-form-item label="角色">
        <el-select
          v-model="selectedRoleIds"
          multiple
          placeholder="请选择角色"
          :disabled="selfAssignmentLocked"
          style="width: 100%"
        >
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
        v-perm="'system:user:edit'"
        type="primary"
        :loading="submitting"
        :disabled="loading || selfAssignmentLocked"
        @click="submit"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  getUser,
  replaceUserRoles,
  type UserRecord,
} from '@/api/modules/user'
import type { RoleRecord } from '@/api/modules/role'
import type { Id } from '@/shared/http/types'

const props = defineProps<{
  modelValue: boolean
  user: UserRecord | null
  roles: RoleRecord[]
  isAdmin: boolean
  currentUserId: Id | ''
  currentUserIsSuper: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const selectedRoleIds = ref<Id[]>([])
const loading = ref(false)
const submitting = ref(false)
const selfAssignmentLocked = computed(
  () => props.user?.id === props.currentUserId && !props.currentUserIsSuper,
)
const assignableRoles = computed(() =>
  props.isAdmin
    ? props.roles
    : props.roles.filter(role => role.is_super !== 1 && role.code !== 'admin'),
)

function reset(): void {
  selectedRoleIds.value = []
}

watch(
  () => props.modelValue,
  async open => {
    if (!open || !props.user) return
    loading.value = true
    try {
      const response = await getUser(props.user.id)
      if (!response.data) throw new Error('用户详情响应缺少数据')
      selectedRoleIds.value = response.data.roles.map(role => role.id)
    }
    finally {
      loading.value = false
    }
  },
)

async function submit(): Promise<void> {
  if (!props.user || selfAssignmentLocked.value) return
  submitting.value = true
  try {
    await replaceUserRoles(props.user.id, selectedRoleIds.value)
    ElMessage.success('角色分配成功')
    visible.value = false
    emit('saved')
  }
  finally {
    submitting.value = false
  }
}
</script>
