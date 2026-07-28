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
const loading = ref(false)
const submitting = ref(false)

function reset(): void {
  dataScope.value = '1'
  deptIds.value = []
}

async function loadDataScope(role: RoleRecord): Promise<void> {
  loading.value = true
  try {
    const response = await getRole(role.id)
    if (!response.data) throw new Error(t('system.role.detailMissing'))
    dataScope.value = response.data.data_scope
    deptIds.value = response.data.dept_ids ?? []
  }
  finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open || !props.role) return
    reset()
    void loadDataScope(props.role).catch(() => {
      visible.value = false
    })
  },
)

async function submit(): Promise<void> {
  if (!props.role) return
  if (dataScope.value === '2' && deptIds.value.length === 0) {
    ElMessage.warning(t('system.role.customDepartmentRequired'))
    return
  }

  submitting.value = true
  try {
    await replaceRoleDataScope(props.role.id, {
      data_scope: dataScope.value,
      dept_ids: dataScope.value === '2' ? deptIds.value : [],
    })
    ElMessage.success(t('system.role.dataScopeUpdated'))
    visible.value = false
    emit('saved')
  }
  finally {
    submitting.value = false
  }
}
</script>
