<template>
  <el-dialog
    v-model="visible"
    :title="t('system.role.assignPermissionTitle')"
    width="min(620px, calc(100vw - 32px))"
    @open="handleOpen"
    @closed="reset"
  >
    <div class="permission-tree-options">
      <el-checkbox v-model="expandedAll" @change="handleExpandedChange">
        {{ t('system.role.expandCollapse') }}
      </el-checkbox>
      <el-checkbox
        :model-value="allSelected"
        :indeterminate="partiallySelected"
        @change="handleSelectAllChange"
      >
        {{ t('system.role.selectAllNone') }}
      </el-checkbox>
      <el-checkbox v-model="cascadeEnabled">
        {{ t('system.role.parentChildCascade') }}
      </el-checkbox>
    </div>

    <el-tree
      ref="treeRef"
      v-loading="loading"
      :data="permissionTree"
      :props="{ label: 'name', children: 'children' }"
      :check-strictly="!cascadeEnabled"
      node-key="id"
      show-checkbox
      @check="handleCheck"
    >
      <template #default="{ data }">
        <div class="permission-node">
          <span>{{ data.name }}</span>
          <el-tag
            v-if="data.perm_type"
            :type="data.perm_type === 'api' ? 'info' : 'success'"
            size="small"
          >
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
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import type { CheckboxValueType, TreeInstance } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { replaceRolePermissions, type RoleRecord } from '@/api/modules/role'
import { getRolePermissions, type PermissionTreeNode } from '@/api/modules/permission'
import type { Id } from '@/shared/http/types'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStateQuery } from '@/shared/query/useServerStateQuery'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()

const props = defineProps<{
  role: RoleRecord | null
  permissionTree: PermissionTreeNode[]
}>()

const emit = defineEmits<{
  saved: []
}>()

const visible = defineModel<boolean>({ required: true })
const treeRef = ref<TreeInstance>()
const checkedKeys = ref<Id[]>([])
const expandedAll = ref(false)
const cascadeEnabled = ref(true)
const userStore = useUserStore()
const assignmentsQuery = useServerStateQuery<Id[]>(
  () => userStore.sessionStatus === 'authenticated' && visible.value && props.role !== null,
  'roles',
  () => ({ scope: 'permissions', id: props.role?.id ?? null }),
  async (signal) => {
    const role = props.role
    if (!role) return []
    const response = await getRolePermissions(role.id, signal)
    return response.data ?? []
  },
)
const assignmentMutation = useServerStateMutation<void, { roleId: Id; permissionIds: Id[] }>(
  'roles',
  {
    mutationFn: async (variables) => {
      await replaceRolePermissions(variables.roleId, variables.permissionIds)
    },
    onSuccess: () => {
      ElMessage.success(t('system.role.permissionAssigned'))
    },
  },
)
const loading = assignmentsQuery.isFetching
const submitting = assignmentMutation.pending
const allNodeIds = computed(() => flattenNodeIds(props.permissionTree))
const allSelected = computed(
  () =>
    allNodeIds.value.length > 0 && allNodeIds.value.every((id) => checkedKeys.value.includes(id)),
)
const partiallySelected = computed(() => checkedKeys.value.length > 0 && !allSelected.value)

function reset(): void {
  checkedKeys.value = []
  expandedAll.value = false
  cascadeEnabled.value = true
  treeRef.value?.setCheckedKeys([])
  void nextTick(() => setAllExpanded(false))
}

async function populateAssignments(ids: Id[]): Promise<void> {
  // 既有角色可能在关闭联动时保存了任意节点组合。加载时临时使用严格模式，
  // 防止 Element Plus 按当前默认联动设置补齐父节点或子节点。
  const restoreCascade = cascadeEnabled.value
  cascadeEnabled.value = false
  await nextTick()
  treeRef.value?.setCheckedKeys(ids, false)
  checkedKeys.value = currentCheckedKeys()
  cascadeEnabled.value = restoreCascade
  await nextTick()
  setAllExpanded(false)
}

function handleOpen(): void {
  if (!props.role) return
  reset()
  if (assignmentsQuery.data.value) void populateAssignments(assignmentsQuery.data.value)
}

watch(
  () => assignmentsQuery.data.value,
  (ids) => {
    if (visible.value && ids) void populateAssignments(ids)
  },
)

function handleCheck(): void {
  checkedKeys.value = currentCheckedKeys()
}

function handleExpandedChange(value: CheckboxValueType): void {
  expandedAll.value = Boolean(value)
  setAllExpanded(expandedAll.value)
}

function handleSelectAllChange(value: CheckboxValueType): void {
  treeRef.value?.setCheckedKeys(value ? allNodeIds.value : [], false)
  checkedKeys.value = currentCheckedKeys()
}

function currentCheckedKeys(): Id[] {
  return (treeRef.value?.getCheckedKeys(false) ?? []).map(String)
}

function setAllExpanded(expanded: boolean): void {
  for (const id of allNodeIds.value) {
    const node = treeRef.value?.getNode(id)
    if (node) node.expanded = expanded
  }
}

function flattenNodeIds(nodes: PermissionTreeNode[]): Id[] {
  return nodes.flatMap((node) => [String(node.id), ...flattenNodeIds(node.children ?? [])])
}

async function submit(): Promise<void> {
  if (!props.role || submitting.value) return
  await assignmentMutation.mutateAsync({
    roleId: props.role.id,
    permissionIds: currentCheckedKeys(),
  })
  visible.value = false
  emit('saved')
}
</script>

<style scoped>
.permission-tree-options {
  display: flex;
  gap: 18px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

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
