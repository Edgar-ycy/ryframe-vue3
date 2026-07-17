<template>
  <el-dialog v-model="visible" title="发起密码重置" width="420px" @closed="reset">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="原因" prop="reason">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="4"
          maxlength="512"
          show-word-limit
          placeholder="请输入发起密码重置的原因"
        />
      </el-form-item>
    </el-form>
    <el-alert
      v-if="resetLink"
      type="success"
      title="重置链接已生成"
      :closable="false"
      show-icon
      class="reset-link-alert"
    />
    <el-input v-if="resetLink" :model-value="resetLink" readonly class="reset-link-input">
      <template #append>
        <el-button v-perm="'system:user:edit'" icon="DocumentCopy" @click="copyResetLink">复制</el-button>
      </template>
    </el-input>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button v-perm="'system:user:edit'" type="primary" :loading="submitting" @click="submit">发起</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { requestPasswordReset, type PasswordResetRequestResult } from '@/api/modules/user'
import type { Id } from '@/shared/http/types'

const props = defineProps<{
  modelValue: boolean
  userId: Id | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const formRef = ref<FormInstance>()
const form = ref({ reason: '' })
const submitting = ref(false)
const result = ref<PasswordResetRequestResult | null>(null)
const resetLink = computed(() => {
  const url = result.value?.reset_url
  return url ? new URL(url, window.location.origin).toString() : ''
})
const rules: FormRules = {
  reason: [{ required: true, message: '请输入重置原因', trigger: 'blur' }],
}

function reset() {
  form.value.reason = ''
  result.value = null
  formRef.value?.clearValidate()
}

watch(
  () => props.modelValue,
  open => {
    if (open) reset()
  },
)

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || !props.userId) return

  submitting.value = true
  try {
    const response = await requestPasswordReset(props.userId, {
      reason: form.value.reason.trim(),
    })
    if (!response.data) throw new Error('密码重置响应缺少数据')
    result.value = response.data
    ElMessage.success('密码重置请求已发起')
  } finally {
    submitting.value = false
  }
}

async function copyResetLink() {
  if (!resetLink.value) return
  await navigator.clipboard.writeText(resetLink.value)
  ElMessage.success('重置链接已复制')
}
</script>

<style scoped>
.reset-link-alert {
  margin-top: 8px;
}

.reset-link-input {
  margin-top: 10px;
}
</style>
