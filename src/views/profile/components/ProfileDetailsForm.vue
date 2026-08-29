<template>
  <el-card shadow="never">
    <template #header>
      <span>{{ t('profile.basicInformation') }}</span>
    </template>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px" class="profile-form">
      <el-form-item :label="t('profile.username')">
        <el-input :model-value="username" disabled />
      </el-form-item>
      <el-form-item :label="t('profile.nickname')" prop="nickname">
        <el-input
          v-model="form.nickname"
          maxlength="64"
          :placeholder="t('profile.enterNickname')"
        />
      </el-form-item>
      <el-form-item :label="t('profile.email')" prop="email">
        <el-input v-model="form.email" :placeholder="t('profile.enterEmail')" />
      </el-form-item>
      <el-form-item :label="t('profile.phone')" prop="phone">
        <el-input v-model="form.phone" maxlength="11" :placeholder="t('profile.enterPhone')" />
      </el-form-item>
      <el-form-item :label="t('profile.department')">
        <el-input :model-value="profile.dept_name || '-'" disabled />
      </el-form-item>
      <el-form-item :label="t('profile.roles')">
        <div v-if="profile.roles?.length" class="role-tags">
          <el-tag v-for="role in profile.roles" :key="role" size="small" type="success">
            {{ role }}
          </el-tag>
        </div>
        <span v-else>-</span>
      </el-form-item>
      <el-form-item :label="t('profile.createdAt')">
        <el-input :model-value="formatCreatedAt(profile.created_at)" disabled />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="submit">{{
          t('common.save')
        }}</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { type ProfileInfo, type ProfileUpdateParams } from '@/api/modules/auth'
import { useServerStateScope } from '@/shared/query/client'
import { createProfileDetailsSubmission } from '../profileDetailsSubmission'
import { useProfileDetailsMutation } from '../useProfileMutations'
import { formatLocalizedDate } from '@/i18n'

const props = defineProps<{
  profile: ProfileInfo
  username: string
}>()

const emit = defineEmits<{
  saved: [profile: ProfileUpdateParams]
}>()

const formRef = ref<FormInstance>()
const form = ref({ nickname: '', email: '', phone: '' })
const { t } = useI18n()
const { saveProfile, submitting } = useProfileDetailsMutation()
const serverStateScope = useServerStateScope()
const rules = computed<FormRules>(() => ({
  nickname: [{ required: true, message: t('profile.enterNicknameValidation'), trigger: 'blur' }],
  email: [{ type: 'email', message: t('profile.emailValidation'), trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: t('profile.phoneValidation'), trigger: 'blur' }],
}))

watch(
  () => props.profile,
  (profile) => {
    form.value = {
      nickname: profile.nickname,
      email: profile.email ?? '',
      phone: profile.phone ?? '',
    }
    formRef.value?.clearValidate()
  },
  { immediate: true },
)

const submission = createProfileDetailsSubmission({
  validate: async () => (await formRef.value?.validate().catch(() => false)) === true,
  payload: (): ProfileUpdateParams => ({
    nickname: form.value.nickname,
    email: form.value.email || undefined,
    phone: form.value.phone || undefined,
  }),
  save: saveProfile,
  saved: (profile) => {
    ElMessage.success(t('profile.saveSuccess'))
    emit('saved', profile)
  },
})

function invalidateDetailsForm(): void {
  submission.invalidate()
  form.value = { nickname: '', email: '', phone: '' }
  formRef.value?.clearValidate()
}

watch(serverStateScope, invalidateDetailsForm, { flush: 'sync' })
onDeactivated(invalidateDetailsForm)
onBeforeUnmount(invalidateDetailsForm)

async function submit(): Promise<void> {
  if (!submitting.value) await submission.submit()
}

function formatCreatedAt(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return formatLocalizedDate(value)
  } catch {
    return value
  }
}
</script>

<style scoped>
.profile-form {
  max-width: 500px;
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
</style>
