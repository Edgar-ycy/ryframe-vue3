<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑字典类型' : '新增字典类型'"
    width="420px"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="字典名称" prop="name">
        <el-input v-model="form.name" maxlength="100" placeholder="请输入字典名称" />
      </el-form-item>
      <el-form-item label="字典编码" prop="code">
        <el-input
          v-model="form.code"
          :disabled="isEdit"
          maxlength="100"
          placeholder="请输入字典编码"
        />
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
        v-perm="isEdit ? 'system:dict:edit' : 'system:dict:add'"
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
  createDictType,
  updateDictType,
  type DictTypeRecord,
} from '@/api/modules/dict'

interface DictTypeFormState {
  name: string
  code: string
  status: string
}

const props = defineProps<{
  modelValue: boolean
  dictType: DictTypeRecord | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const isEdit = computed(() => props.dictType !== null)
const formRef = ref<FormInstance>()
const submitting = ref(false)

function initialForm(): DictTypeFormState {
  return { name: '', code: '', status: '1' }
}

const form = ref<DictTypeFormState>(initialForm())
const rules: FormRules = {
  name: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入字典编码', trigger: 'blur' }],
}

function resetForm(): void {
  form.value = initialForm()
  formRef.value?.clearValidate()
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    resetForm()
    if (props.dictType) {
      form.value = {
        name: props.dictType.name,
        code: props.dictType.code,
        status: props.dictType.status,
      }
    }
  },
)

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (props.dictType) {
      await updateDictType(props.dictType.id, {
        name: form.value.name,
        status: form.value.status,
      })
      ElMessage.success('更新成功')
    }
    else {
      await createDictType({
        name: form.value.name,
        code: form.value.code,
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
