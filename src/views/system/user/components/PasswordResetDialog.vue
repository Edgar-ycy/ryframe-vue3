<template>
  <el-dialog
    v-model="visible"
    :title="t('system.user.passwordResetTitle')"
    width="420px"
    @open="reset"
    @closed="reset"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item :label="t('system.user.reason')" prop="reason">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="4"
          maxlength="512"
          show-word-limit
          :placeholder="t('system.user.enterResetReason')"
        />
      </el-form-item>
    </el-form>
    <el-alert
      v-if="resetLink"
      type="success"
      :title="t('system.user.resetLinkGenerated')"
      :closable="false"
      show-icon
      class="reset-link-alert"
    />
    <el-input v-if="resetLink" :model-value="resetLink" readonly class="reset-link-input">
      <template #append>
        <el-button v-perm="'system:user:edit'" icon="DocumentCopy" @click="copyResetLink">{{
          t('system.user.copy')
        }}</el-button>
      </template>
    </el-input>
    <template #footer>
      <el-button @click="visible = false">{{ t('system.common.cancel') }}</el-button>
      <el-button v-perm="'system:user:edit'" type="primary" :loading="submitting" @click="submit">{{
        t('system.user.initiate')
      }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  requestPasswordReset,
  type PasswordResetRequestInput,
  type PasswordResetRequestResult,
} from '@/api/modules/user'
import type { Id } from '@/shared/http/types'
import { beginServerStatePageOperation } from '@/shared/query/pageOperationScope'
import { validateServerStatePageOperation } from '@/shared/query/scopedConfirmation'
import { useServerStateMutation } from '@/shared/query/useServerStateMutation'
import { useServerStatePageLifecycle } from '@/shared/query/useServerStatePageLifecycle'

const { t } = useI18n()

const props = defineProps<{
  userId: Id | null
}>()

const visible = defineModel<boolean>({ required: true })
const formRef = ref<FormInstance>()
const form = ref({ reason: '' })
const resetLink = ref('')
const pageLifecycle = useServerStatePageLifecycle(resetPageState)
const resetMutation = useServerStateMutation<
  PasswordResetRequestResult,
  { userId: Id; data: PasswordResetRequestInput }
>('users', {
  mutationFn: async (variables) => {
    const response = await requestPasswordReset(variables.userId, variables.data)
    if (!response.data) throw new Error(t('system.user.resetResponseMissing'))
    return response.data
  },
})
const submitting = resetMutation.pending
const rules = computed<FormRules>(() => ({
  reason: [{ required: true, message: t('system.user.resetReasonRequired'), trigger: 'blur' }],
}))

function reset() {
  form.value.reason = ''
  resetLink.value = ''
  formRef.value?.clearValidate()
}

function resetPageState(): void {
  visible.value = false
  reset()
}

async function submit() {
  if (submitting.value) return
  const ownsPage = pageLifecycle.captureOwnership()
  const expectedUserId = props.userId
  const ownsDialog = () => ownsPage() && visible.value && props.userId === expectedUserId
  const operation = await validateServerStatePageOperation(
    () => formRef.value?.validate().catch(() => false) ?? Promise.resolve(false),
    ownsDialog,
  )
  if (!operation || !props.userId) return

  const result = await resetMutation.mutateAsync({
    userId: props.userId,
    data: {
      reason: form.value.reason.trim(),
    },
  })
  operation.apply(() => {
    resetLink.value = new URL(result.reset_url, window.location.origin).toString()
    ElMessage.success(t('system.user.resetRequested'))
  }, ownsDialog)
}

async function copyResetLink() {
  if (!resetLink.value) return
  const operation = beginServerStatePageOperation()
  const ownsPage = pageLifecycle.captureOwnership()
  const expectedLink = resetLink.value
  const ownsDialog = () => ownsPage() && visible.value && resetLink.value === expectedLink
  await navigator.clipboard.writeText(expectedLink)
  operation.apply(() => ElMessage.success(t('system.user.resetLinkCopied')), ownsDialog)
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
