<template>
  <el-dialog v-model="visible" title="设置数据权限" width="560px" @closed="reset">
    <el-form v-loading="loading" label-width="110px">
      <el-form-item label="数据范围" required>
        <el-select v-model="dataScope" style="width:100%">
          <el-option label="全部数据权限" value="1" />
          <el-option label="自定义数据权限" value="2" />
          <el-option label="本部门数据权限" value="3" />
          <el-option label="本部门及以下" value="4" />
          <el-option label="仅本人数据" value="5" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="dataScope === '2'" label="自定义部门" required>
        <el-tree-select
          v-model="deptIds"
          :data="deptTree"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          placeholder="请选择部门"
          multiple
          check-strictly
          show-checkbox
          style="width:100%"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button v-perm="'system:role:edit'" type="primary" :loading="submitting" @click="submit">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  getRole,
  replaceRoleDataScope,
  type RoleDataScope,
  type RoleRecord,
} from '@/api/modules/role'
import type { DeptNode } from '@/api/modules/dept'
import type { Id } from '@/shared/http/types'

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
    if (!response.data) throw new Error('角色详情响应缺少数据')
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
    ElMessage.warning('自定义数据权限至少选择一个部门')
    return
  }

  submitting.value = true
  try {
    await replaceRoleDataScope(props.role.id, {
      data_scope: dataScope.value,
      dept_ids: dataScope.value === '2' ? deptIds.value : [],
    })
    ElMessage.success('数据权限更新成功')
    visible.value = false
    emit('saved')
  }
  finally {
    submitting.value = false
  }
}
</script>
