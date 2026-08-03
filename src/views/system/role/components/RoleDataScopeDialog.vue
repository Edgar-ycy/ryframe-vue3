<template>
  <el-dialog v-model="visible" :title="t('system.role.setDataScopeTitle')" width="560px" @closed="reset">
    <el-form v-loading="loading" label-width="110px">
      <el-form-item :label="t('system.role.dataScope')" required>
        <el-select v-model="dataScope" style="width:100%">
          <el-option :label="t('system.role.allData')" value="1" />
          <el-option :label="t('system.role.customData')" value="2" />
          <el-option :label="t('system.role.currentDepartmentData')" value="3" />
          <el-option :label="t('system.role.currentAndBelowData')" value="4" />
          <el-option :label="t('system.role.selfData')" value="5" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="dataScope === '2'" :label="t('system.role.customDepartment')" required>
        <el-tree-select
          v-model="deptIds"
          :data="deptTree"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          :placeholder="t('system.role.selectDepartment')"
          multiple
          check-strictly
          show-checkbox
          style="width:100%"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ t('system.common.cancel') }}</el-button>
      <el-button v-perm="'system:role:edit'" type="primary" :loading="submitting" @click="submit">
        {{ t('system.common.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  getRole,
  replaceRoleDataScope,
  type RoleDataScope,
  type RoleRecord,
} from '@/api/modules/role'
import type { DeptNode } from '@/api/modules/dept'
import type { Id } from '@/shared/http/types'
import { useTenantMutation } from '@/shared/query/useTenantMutation'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  role: RoleRecord | null
  deptTree: DeptNode[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const dataScope = ref<RoleDataScope>('1')
const deptIds = ref<Id[]>([])
const userStore = useUserStore()
const detailQuery = useTenantQuery<RoleRecord>(
  () => userStore.tenantId,
  () => userStore.sessionStatus === 'authenticated' && visible.value && props.role !== null,
  'roles',
  () => ({ scope: 'detail', id: props.role?.id ?? null }),
  async signal => {
    const role = props.role
    if (!role) throw new Error(t('system.role.detailMissing'))
    const response = await getRole(role.id, signal)
    if (!response.data) throw new Error(t('system.role.detailMissing'))
    return response.data
  },
)
const dataScopeMutation = useTenantMutation<
  void,
  { roleId: Id, dataScope: RoleDataScope, deptIds: Id[] }
>(
  () => userStore.tenantId,
  'roles',
  {
    mutationFn: async variables => {
      await replaceRoleDataScope(variables.roleId, {
        data_scope: variables.dataScope,
        dept_ids: variables.deptIds,
      })
    },
    onSuccess: () => {
      ElMessage.success(t('system.role.dataScopeUpdated'))
    },
  },
)
const loading = computed(() => detailQuery.isFetching.value)
const submitting = dataScopeMutation.pending

function reset(): void {
  dataScope.value = '1'
  deptIds.value = []
}

function populateDataScope(role: RoleRecord): void {
  dataScope.value = role.data_scope
  deptIds.value = role.dept_ids ?? []
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open || !props.role) return
    reset()
    if (detailQuery.data.value) populateDataScope(detailQuery.data.value)
  },
)
watch(
  () => detailQuery.data.value,
  role => {
    if (visible.value && role) populateDataScope(role)
  },
)

async function submit(): Promise<void> {
  if (!props.role || submitting.value) return
  if (dataScope.value === '2' && deptIds.value.length === 0) {
    ElMessage.warning(t('system.role.customDepartmentRequired'))
    return
  }

  await dataScopeMutation.mutateAsync({
    roleId: props.role.id,
    dataScope: dataScope.value,
    deptIds: dataScope.value === '2' ? [...deptIds.value] : [],
  })
  visible.value = false
  emit('saved')
}
</script>
