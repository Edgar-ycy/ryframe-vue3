<template>
  <el-card shadow="never">
    <template #header>
      <span>基本信息</span>
    </template>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" class="profile-form">
      <el-form-item label="用户名">
        <el-input :model-value="username" disabled />
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="form.nickname" maxlength="64" placeholder="请输入昵称" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" placeholder="请输入邮箱" />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" maxlength="11" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item label="部门">
        <el-input :model-value="profile.dept_name || '-'" disabled />
      </el-form-item>
      <el-form-item label="角色">
        <div v-if="profile.roles?.length" class="role-tags">
          <el-tag v-for="role in profile.roles" :key="role" size="small" type="success">
            {{ role }}
          </el-tag>
        </div>
        <span v-else>-</span>
      </el-form-item>
      <el-form-item label="创建时间">
        <el-input :model-value="profile.created_at || '-'" disabled />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import {
  updateProfile,
  type ProfileInfo,
  type ProfileUpdateParams,
} from '@/api/modules/auth'

const props = defineProps<{
  profile: ProfileInfo
  username: string
}>()

const emit = defineEmits<{
  saved: [profile: ProfileUpdateParams]
}>()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = ref({ nickname: '', email: '', phone: '' })
const rules: FormRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }],
}

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

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload: ProfileUpdateParams = {
    nickname: form.value.nickname,
    email: form.value.email || undefined,
    phone: form.value.phone || undefined,
  }
  submitting.value = true
  try {
    await updateProfile(payload)
    ElMessage.success('保存成功')
    emit('saved', payload)
  }
  finally {
    submitting.value = false
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
