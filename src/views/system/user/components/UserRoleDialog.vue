<template>
  <el-dialog
    v-model="visible"
    :title="t('system.user.roleDialogTitle')"
    width="520px"
    @open="handleOpen"
    @closed="reset"
  >
    <el-form v-loading="loading" label-width="80px">
      <el-form-item :label="t('system.user.userLabel')">
        <el-input :model-value="user?.nickname ?? ''" disabled />
      </el-form-item>
      <el-form-item :label="t('system.user.role')">
        <el-select
          v-model="selectedRoleIds"
          multiple
          filterable
          remote
          :remote-method="remoteRoleSearch"
          :loading="roleOptionsLoading"
          :placeholder="t('system.user.selectRole')"
          :disabled="selfAssignmentLocked()"
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
        v-perm="'system:user:edit'"
        type="primary"
        :loading="submitting"
        :disabled="loading || selfAssignmentLocked()"
        @click="submit"
      >
        {{ t('system.common.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { getUser, replaceUserRoles, type UserDetail, type UserRecord } from '@/api/modules/user'
import type { SelectOption } from '@/api/modules/option'
import type { Id } from '@/shared/http/types'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'
import { useRoleOptions } from '../composables/useRoleOptions'

const { t } = useI18n()

const props = defineProps<{
  user: UserRecord | null
  currentUserId: Id | ''
  currentUserIsSuper: boolean
}>()

const emit = defineEmits<{
  saved: []
}>()

const visible = defineModel<boolean>({ required: true })
const userStore = useUserStore()
const selectedRoleIds = ref<Id[]>([])
const selectedRoleOptions = ref<SelectOption[]>([])
function selfAssignmentLocked(): boolean {
  return props.user?.id === props.currentUserId && !props.currentUserIsSuper
}
const {
  loading: roleOptionsLoading,
  options: roleOptions,
  remoteMethod: remoteRoleSearch,
  resetSearch: resetRoleSearch,
} = useRoleOptions(() => visible.value, selectedRoleOptions)
const detailQuery = useServerStateQuery<UserDetail>(
  () => userStore.sessionStatus === 'authenticated' && visible.value && props.user !== null,
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
const assignmentMutation = useServerStateMutation<void, { userId: Id; roleIds: Id[] }>('users', {
  mutationFn: async (variables) => {
    await replaceUserRoles(variables.userId, variables.roleIds)
  },
  onSuccess: () => {
    ElMessage.success(t('system.user.roleAssigned'))
  },
})
const loading = detailQuery.isFetching
const submitting = assignmentMutation.pending

function reset(): void {
  selectedRoleIds.value = []
  selectedRoleOptions.value = []
  resetRoleSearch()
}

function syncSelectedRoleOptions(): void {
  const known = new Map(
    [...selectedRoleOptions.value, ...roleOptions.value].map((option) => [option.value, option]),
  )
  selectedRoleOptions.value = selectedRoleIds.value
    .map((roleId) => known.get(roleId))
    .filter((option): option is SelectOption => option !== undefined)
}

function handleOpen(): void {
  if (!props.user) return
  reset()
  if (detailQuery.data.value) populateRoles(detailQuery.data.value)
}

function populateRoles(detail: UserDetail): void {
  selectedRoleOptions.value = detail.roles.map((role) => ({
    value: role.id,
    label: role.name,
    description: role.code,
    disabled: false,
  }))
  selectedRoleIds.value = detail.roles.map((role) => role.id)
}

watch(
  () => detailQuery.data.value,
  (detail) => {
    if (visible.value && detail) populateRoles(detail)
  },
)

async function submit(): Promise<void> {
  if (!props.user || selfAssignmentLocked() || submitting.value) return
  await assignmentMutation.mutateAsync({
    userId: props.user.id,
    roleIds: [...selectedRoleIds.value],
  })
  visible.value = false
  emit('saved')
}
</script>
