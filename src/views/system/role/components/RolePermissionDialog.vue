<template>
  <el-dialog v-model="visible" :title="t('system.role.assignPermissionTitle')" width="550px" @closed="reset">
    <el-tree
      ref="treeRef"
      v-loading="loading"
      :data="permissionTree"
      :props="{ label: 'name', children: 'children' }"
      node-key="id"
      show-checkbox
      default-expand-all
      @check="handleCheck"
    >
      <template #default="{ data }">
        <div class="permission-node">
          <span>{{ data.name }}</span>
          <el-tag v-if="data.perm_type" :type="data.perm_type === 'api' ? 'info' : 'success'" size="small">
            {{ data.perm_type === 'api' ? t('system.common.api') : t('system.common.menu') }}
          </el-tag>
          <span v-if="data.code" class="permission-node__code">{{ data.code }}</span>
        </div>
      </template>
    </el-tree>
    <template #footer>
      <el-button @click="visible = false">{{ t('system.common.cancel') }}</el-button>
      <el-button v-perm="'system:role:edit'" type="primary" :loading="submitting" @click="submit">
        {{ t('system.common.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import type { TreeInstance } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { replaceRolePermissions, type RoleRecord } from '@/api/modules/role'
import { getRolePermissions, type PermissionTreeNode } from '@/api/modules/permission'
import type { Id } from '@/shared/http/types'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  role: RoleRecord | null
  permissionTree: PermissionTreeNode[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const treeRef = ref<TreeInstance>()
const checkedKeys = ref<Id[]>([])
const userStore = useUserStore()
const assignmentsQuery = useTenantQuery<Id[]>(
  () => userStore.tenantId,
  () => userStore.sessionStatus === 'authenticated' && visible.value && props.role !== null,
  'roles',
  () => ({ scope: 'permissions', id: props.role?.id ?? null }),
  async signal => {
    const role = props.role
    if (!role) return []
    const response = await getRolePermissions(role.id, signal)
    return response.data ?? []
  },
)
const assignmentMutation = useTenantMutation<void, { roleId: Id, permissionIds: Id[] }>(
  () => userStore.tenantId,
  'roles',
  {
    mutationFn: async variables => {
      await replaceRolePermissions(variables.roleId, variables.permissionIds)
    },
    onSuccess: () => {
      ElMessage.success(t('system.role.permissionAssigned'))
    },
  },
)
const loading = computed(() => assignmentsQuery.isFetching.value)
const submitting = assignmentMutation.pending

function reset(): void {
  checkedKeys.value = []
  treeRef.value?.setCheckedKeys([])
}

async function populateAssignments(ids: Id[]): Promise<void> {
  checkedKeys.value = [...ids]
  await nextTick()
  treeRef.value?.setCheckedKeys(checkedKeys.value)
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open || !props.role) return
    reset()
    if (assignmentsQuery.data.value) void populateAssignments(assignmentsQuery.data.value)
  },
)
watch(
  () => assignmentsQuery.data.value,
  ids => {
    if (visible.value && ids) void populateAssignments(ids)
  },
)

function handleCheck(
  _node: PermissionTreeNode,
  state: { checkedKeys: Array<string | number> },
): void {
  checkedKeys.value = state.checkedKeys.map(String)
}

async function submit(): Promise<void> {
  if (!props.role || submitting.value) return
  await assignmentMutation.mutateAsync({
    roleId: props.role.id,
    permissionIds: [...checkedKeys.value],
  })
  visible.value = false
  emit('saved')
}
</script>

<style scoped>
.permission-node {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.permission-node__code {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
