<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑字典数据' : '新增字典数据'"
    width="420px"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="字典标签" prop="label">
        <el-input v-model="form.label" maxlength="100" placeholder="请输入字典标签" />
      </el-form-item>
      <el-form-item label="字典键值" prop="value">
        <el-input v-model="form.value" maxlength="100" placeholder="请输入字典键值" />
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
  createDictData,
  updateDictData,
  type DictDataRecord,
} from '@/api/modules/dict'

interface DictDataFormState {
  label: string
  value: string
  sort: number
  status: string
}

const props = defineProps<{
  modelValue: boolean
  dictData: DictDataRecord | null
  typeCode: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const isEdit = computed(() => props.dictData !== null)
const formRef = ref<FormInstance>()
const submitting = ref(false)

function initialForm(): DictDataFormState {
  return { label: '', value: '', sort: 0, status: '1' }
}

const form = ref<DictDataFormState>(initialForm())
const rules: FormRules = {
  label: [{ required: true, message: '请输入字典标签', trigger: 'blur' }],
  value: [{ required: true, message: '请输入字典键值', trigger: 'blur' }],
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
    if (props.dictData) {
      form.value = {
        label: props.dictData.label,
        value: props.dictData.value,
        sort: props.dictData.sort ?? 0,
        status: props.dictData.status,
      }
    }
  },
)

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (props.dictData) {
      await updateDictData(props.dictData.id, {
        label: form.value.label,
        value: form.value.value,
        sort: form.value.sort,
        status: form.value.status,
      })
      ElMessage.success('更新成功')
    }
    else {
      if (!props.typeCode) throw new Error('新增字典数据前必须选择字典类型')
      await createDictData({
        type_code: props.typeCode,
        label: form.value.label,
        value: form.value.value,
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
