<template>
  <el-dialog v-model="visible" :title="isEdit ? '编辑角色' : '新增角色'" width="500px" @closed="resetForm">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="角色名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入角色名称" maxlength="50" />
      </el-form-item>
      <el-form-item label="角色编码" prop="code">
        <el-input v-model="form.code" :disabled="isEdit" placeholder="请输入角色编码" maxlength="50" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" :max="999" />
      </el-form-item>
      <el-form-item v-if="isEdit" label="状态">
        <el-radio-group v-model="form.status">
          <el-radio value="1">正常</el-radio>
          <el-radio value="0">停用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        v-perm="isEdit ? 'system:role:edit' : 'system:role:add'"
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
  createRole,
  getRole,
  updateRole,
  type RoleRecord,
} from '@/api/modules/role'

interface RoleFormState {
  name: string
  code: string
  sort: number
  status: string
}

const props = defineProps<{
  modelValue: boolean
  role: RoleRecord | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const isEdit = computed(() => props.role !== null)
const formRef = ref<FormInstance>()
const submitting = ref(false)

function initialForm(): RoleFormState {
  return { name: '', code: '', sort: 0, status: '1' }
}

const form = ref<RoleFormState>(initialForm())
const rules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
}

function resetForm(): void {
  form.value = initialForm()
  formRef.value?.clearValidate()
}

async function loadRole(role: RoleRecord): Promise<void> {
  const response = await getRole(role.id)
  if (!response.data) throw new Error('角色详情响应缺少数据')
  form.value = {
    name: response.data.name,
    code: response.data.code,
    sort: response.data.sort,
    status: response.data.status,
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    resetForm()
    if (props.role) {
      void loadRole(props.role).catch(() => {
        visible.value = false
      })
    }
  },
)

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (props.role) {
      await updateRole(props.role.id, {
        name: form.value.name,
        sort: form.value.sort,
        status: form.value.status,
      })
      ElMessage.success('更新成功')
    }
    else {
      await createRole({
        name: form.value.name,
        code: form.value.code,
        sort: form.value.sort,
      })
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
