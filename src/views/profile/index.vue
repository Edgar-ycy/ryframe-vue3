<template>
  <div class="page-container">
    <el-row :gutter="16">
      <!-- 左侧：基本信息 -->
      <el-col :span="16">
        <el-card shadow="never">
          <template #header><span>基本信息</span></template>
          <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" style="max-width:500px">
            <el-form-item label="用户名">
              <el-input :model-value="userStore.username" disabled />
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
            <el-form-item label="性别">
              <el-radio-group v-model="form.sex">
                <el-radio value="0">男</el-radio>
                <el-radio value="1">女</el-radio>
                <el-radio value="2">未知</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="部门">
              <el-input :model-value="profileInfo.dept_name || '-'" disabled />
            </el-form-item>
            <el-form-item label="角色">
              <div v-if="profileInfo.roles && profileInfo.roles.length" class="role-tags">
                <el-tag v-for="role in profileInfo.roles" :key="role">{{ role }}</el-tag>
              </div>
              <span v-else>-</span>
            </el-form-item>
            <el-form-item label="创建时间">
              <el-input :model-value="profileInfo.created_at || '-'" disabled />
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
            <el-upload
              class="avatar-uploader"
              :show-file-list="false"
              :before-upload="beforeAvatarUpload"
              :http-request="handleAvatarUpload"
              accept="image/png,image/jpeg,image/gif,image/webp"
            >
              <el-avatar :size="80" :src="avatarPreview" class="avatar-preview">
                <el-icon :size="40"><UserFilled /></el-icon>
              </el-avatar>
              <div class="avatar-mask">
                <el-icon :size="20"><Camera /></el-icon>
                <span style="font-size:12px">更换头像</span>
              </div>
            </el-upload>
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
import { updateProfile, changePassword, getProfile, updateAvatar, type ProfileInfo } from '@/api/modules/auth'

const userStore = useUserStore()
const router = useRouter()

// ----- 个人信息（从 API 获取完整数据） -----
const profileLoading = ref(true)
const profileInfo = ref<ProfileInfo>({
  user_id: 0,
  username: '',
  nickname: '',
  email: '',
  phone: '',
  avatar: '',
  dept_name: '',
  roles: [],
})

// 头像预览地址（初始用 store，上传后即时更新）
const avatarPreview = computed(() => profileInfo.value.avatar || userStore.avatar)

// ----- 基本信息表单 -----
const form = ref({
  nickname: '',
  email: '',
  phone: '',
  sex: '',
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
    await updateProfile({
      nickname: form.value.nickname,
      email: form.value.email || undefined,
      phone: form.value.phone || undefined,
      sex: form.value.sex || undefined,
    })
    userStore.nickname = form.value.nickname
    userStore.email = form.value.email
    userStore.phone = form.value.phone
    profileInfo.value.nickname = form.value.nickname
    profileInfo.value.email = form.value.email
    profileInfo.value.phone = form.value.phone
    ElMessage.success('保存成功')
  } finally {
    submitLoading.value = false
  }
}

// ----- 头像上传 -----
const avatarUploading = ref(false)

function beforeAvatarUpload(file: File) {
  const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    ElMessage.error('头像仅支持 PNG / JPEG / GIF / WebP 格式')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('头像文件大小不能超过 2MB')
    return false
  }
  return true
}

async function handleAvatarUpload(options: { file: File }) {
  avatarUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', options.file)
    const res = await updateAvatar(formData) as any
    const data = res.data || res
    const avatarUrl = data.avatar_url || ''
    if (avatarUrl) {
      // 同步 userStore（Navbar 等位置的头像显示）
      userStore.avatar = avatarUrl
      // 重新拉取个人信息，确保 profileInfo 与后端一致
      await loadProfile()
      ElMessage.success('头像更新成功')
    }
  } catch {
    ElMessage.error('头像上传失败')
  } finally {
    avatarUploading.value = false
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
    await changePassword({
      old_password: pwdForm.value.old_password,
      new_password: pwdForm.value.new_password,
    })
    ElMessage.success('密码修改成功，请重新登录')
    pwdForm.value = { old_password: '', new_password: '', confirm_password: '' }
    pwdFormRef.value?.resetFields()
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

// ----- 初始化加载个人信息 -----
async function loadProfile() {
  profileLoading.value = true
  try {
    const res = await getProfile() as any
    const d = res.data || res
    if (d) {
      profileInfo.value = {
        user_id: d.user_id ?? d.id ?? 0,
        username: d.username ?? '',
        nickname: d.nickname ?? '',
        email: d.email ?? '',
        phone: d.phone ?? '',
        avatar: d.avatar ?? '',
        dept_name: d.dept_name ?? d.dept?.dept_name ?? '',
        roles: d.roles ?? [],
        permissions: d.permissions ?? [],
        created_at: d.created_at ?? '',
      } as ProfileInfo
      // 同步表单初始值
      form.value.nickname = d.nickname ?? ''
      form.value.email = d.email ?? ''
      form.value.phone = d.phone ?? ''
      form.value.sex = d.sex ?? ''
    }
  } catch {
    // 降级：使用 userStore 的数据
    form.value.nickname = userStore.nickname || ''
    form.value.email = userStore.email || ''
    form.value.phone = userStore.phone || ''
  } finally {
    profileLoading.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.avatar-uploader {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.avatar-preview {
  transition: opacity 0.3s;
}

.avatar-mask {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.avatar-uploader:hover .avatar-mask {
  opacity: 1;
}
</style>
