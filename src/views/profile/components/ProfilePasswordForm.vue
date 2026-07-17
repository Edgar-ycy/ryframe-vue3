<template>
  <el-card shadow="never">
    <template #header>
      <span>修改密码</span>
    </template>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="旧密码" prop="old_password">
        <el-input
          v-model="form.old_password"
          type="password"
          :maxlength="PASSWORD_POLICY.max_length"
          placeholder="请输入旧密码"
          show-password
        />
      </el-form-item>
      <el-form-item label="新密码" prop="new_password">
        <el-input
          v-model="form.new_password"
          type="password"
          :maxlength="PASSWORD_POLICY.max_length"
          placeholder="至少 8 位，含大小写字母、数字和符号"
          show-password
        />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirm_password">
        <el-input
          v-model="form.confirm_password"
          type="password"
          :maxlength="PASSWORD_POLICY.max_length"
          placeholder="请再次输入新密码"
          show-password
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="submit">
          修改密码
        </el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import type { FormItemRule } from 'element-plus'
import { changePassword } from '@/api/modules/auth'
import { terminateSession } from '@/app/session/sessionCoordinator'
import {
  PASSWORD_POLICY,
  newPasswordValidationMessage,
} from '@/shared/security/passwordPolicy'

const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = ref({ old_password: '', new_password: '', confirm_password: '' })

const validateNewPassword: FormItemRule['validator'] = (_rule, value, callback) => {
  const password = String(value ?? '')
  if (password === form.value.old_password) {
    callback(new Error('新密码不能与旧密码相同'))
    return
  }
  const message = newPasswordValidationMessage(password)
  callback(message ? new Error(message) : undefined)
}

const validateConfirmPassword: FormItemRule['validator'] = (_rule, value, callback) => {
  callback(value === form.value.new_password ? undefined : new Error('两次输入的密码不一致'))
}

const rules: FormRules = {
  old_password: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { validator: validateNewPassword, trigger: 'blur' },
  ],
  confirm_password: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await changePassword({
      old_password: form.value.old_password,
      new_password: form.value.new_password,
    })
    ElMessage.success('密码修改成功，请重新登录')
    form.value = { old_password: '', new_password: '', confirm_password: '' }
    formRef.value?.resetFields()
    await new Promise(resolve => setTimeout(resolve, 1500))
    await terminateSession()
  }
  finally {
    submitting.value = false
  }
}
</script>
