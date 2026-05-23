<template>
  <div class="page-container">
    <el-row :gutter="16">
      <!-- 基本信息 -->
      <el-col :span="16">
        <el-card shadow="never">
          <template #header><span>基本信息</span></template>
          <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" style="max-width:500px">
            <el-form-item label="用户名">
              <el-input v-model="userStore.username" disabled />
            </el-form-item>
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="form.nickname" placeholder="请输入昵称" maxlength="50" />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" />
            </el-form-item>
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号" />
            </el-form-item>
            <el-form-item label="角色">
              <el-tag v-for="role in userStore.roles" :key="role" style="margin-right:4px">{{ role }}</el-tag>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="submitLoading" @click="handleSubmit">保存</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧：头像 + 修改密码 -->
      <el-col :span="8">
        <el-card shadow="never">
          <template #header><span>头像</span></template>
          <div style="text-align:center;padding:16px 0">
            <el-avatar :size="80" :src="userStore.avatar">
              <el-icon :size="40"><UserFilled /></el-icon>
            </el-avatar>
          </div>
        </el-card>

        <el-card shadow="never" style="margin-top:12px">
          <template #header><span>修改密码</span></template>
          <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="80px">
            <el-form-item label="旧密码" prop="old_password">
              <el-input v-model="pwdForm.old_password" type="password" placeholder="请输入旧密码" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="new_password">
              <el-input v-model="pwdForm.new_password" type="password" placeholder="请输入新密码（至少6位）" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirm_password">
              <el-input v-model="pwdForm.confirm_password" type="password" placeholder="请再次输入新密码" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="pwdLoading" @click="handleChangePwd">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { updateUser } from '@/api/modules/user'

const userStore = useUserStore()

// ----- 基本信息 -----
const form = ref({
  nickname: userStore.nickname || '',
  email: userStore.email || '',
  phone: userStore.phone || '',
})

const rules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }],
}

const formRef = ref<FormInstance>()
const submitLoading = ref(false)

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    await updateUser(userStore.userId as number, {
      nickname: form.value.nickname,
      email: form.value.email || undefined,
      phone: form.value.phone || undefined,
    } as any)
    userStore.nickname = form.value.nickname
    userStore.email = form.value.email
    userStore.phone = form.value.phone
    ElMessage.success('保存成功')
  } finally {
    submitLoading.value = false
  }
}

// ----- 修改密码 -----
const pwdFormRef = ref<FormInstance>()
const pwdLoading = ref(false)
const pwdForm = ref({ old_password: '', new_password: '', confirm_password: '' })

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value !== pwdForm.value.new_password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const pwdRules = {
  old_password: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
  confirm_password: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

async function handleChangePwd() {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return
  pwdLoading.value = true
  try {
    // 调用更新密码接口
    await updateUser(userStore.userId as number, {
      old_password: pwdForm.value.old_password,
      new_password: pwdForm.value.new_password,
    } as any)
    ElMessage.success('密码修改成功，请重新登录')
    pwdForm.value = { old_password: '', new_password: '', confirm_password: '' }
    pwdFormRef.value?.resetFields()
    // 退出登录
    setTimeout(async () => {
      await userStore.logout()
      router.push('/login')
    }, 1500)
  } catch {
    /* 错误已在拦截器处理 */
  } finally {
    pwdLoading.value = false
  }
}
</script>
