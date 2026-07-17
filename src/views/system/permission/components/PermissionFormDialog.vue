<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑权限' : '新增权限'"
    width="520px"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="上级权限">
        <el-tree-select
          v-model="form.parent_id"
          :data="parentTree"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          placeholder="请选择上级权限"
          clearable
          check-strictly
          style="width:100%"
        />
      </el-form-item>
      <el-form-item label="权限名称" prop="name">
        <el-input v-model="form.name" maxlength="50" placeholder="请输入权限名称" />
      </el-form-item>
      <el-form-item label="权限编码" prop="code">
        <el-input v-model="form.code" maxlength="100" placeholder="例如 system:user:list" />
      </el-form-item>
      <el-form-item label="权限类型" prop="perm_type">
        <el-radio-group v-model="form.perm_type">
          <el-radio value="api">API</el-radio>
          <el-radio value="menu">菜单</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="图标">
        <el-input v-model="form.icon" maxlength="50" placeholder="可选" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="form.status">
          <el-radio value="1">正常</el-radio>
          <el-radio value="0">停用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        v-perm="isEdit ? 'system:perm:edit' : 'system:perm:add'"
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
import {
  createPermission,
  updatePermission,
  type PermissionForm,
  type PermissionTreeNode,
} from '@/api/modules/permission'
import type { Id } from '@/shared/http/types'

const props = defineProps<{
  modelValue: boolean
  permission: PermissionTreeNode | null
  parentId?: Id
  parentTree: PermissionTreeNode[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const isEdit = computed(() => props.permission !== null)
const formRef = ref<FormInstance>()
const submitting = ref(false)

function initialForm(): PermissionForm {
  return {
    name: '',
    code: '',
    parent_id: null,
    perm_type: 'api',
    icon: '',
    sort: 0,
    status: '1',
  }
}

const form = ref<PermissionForm>(initialForm())
const rules: FormRules = {
  name: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入权限编码', trigger: 'blur' }],
  perm_type: [{ required: true, message: '请选择权限类型', trigger: 'change' }],
}

function resetForm(): void {
  form.value = initialForm()
  formRef.value?.clearValidate()
}

function populateForm(): void {
  resetForm()
  const permission = props.permission
  if (permission) {
    form.value = {
      name: permission.name,
      code: permission.code,
      parent_id: permission.parent_id ?? null,
      perm_type: permission.perm_type,
      icon: permission.icon ?? '',
      sort: permission.sort,
      status: permission.status,
    }
    return
  }
  form.value.parent_id = props.parentId ?? null
}

watch(
  () => props.modelValue,
  open => {
    if (open) populateForm()
  },
)

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  const payload: PermissionForm = {
    ...form.value,
    parent_id: form.value.parent_id === '0' ? null : form.value.parent_id,
  }

  submitting.value = true
  try {
    if (props.permission) {
      await updatePermission(props.permission.id, payload)
      ElMessage.success('更新成功')
    }
    else {
      await createPermission(payload)
      ElMessage.success('新增成功')
    }
    visible.value = false
    emit('saved')
  }
  finally {
    submitting.value = false
  }
}
</script>
