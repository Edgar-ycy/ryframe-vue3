<template>
  <div class="login-container">
    <div class="login-card">
      <h2 class="login-title">RyFrame 管理后台</h2>
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        size="large"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名"
            prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            style="width: 100%"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { getUserMenus } from '@/api/modules/menu'
import type { RouteRecordRaw } from 'vue-router'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const permissionStore = usePermissionStore()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)

interface LoginForm {
  username: string
  password: string
}

const loginForm = ref<LoginForm>({
  username: 'admin',
  password: 'admin123',
})

const loginRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const handleLogin = async () => {
  const valid = await loginFormRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    // 1. 登录（自动获取用户信息 + 权限码）
    await userStore.login(loginForm.value.username, loginForm.value.password)
    // 2. 获取菜单并生成动态路由（优先数据库菜单，失败降级为权限过滤）
    let accessRoutes: RouteRecordRaw[]
    try {
      const menuRes = await getUserMenus() as any
      const menuTree = menuRes.rows || menuRes.data || menuRes || []
      if (menuTree.length > 0) {
        accessRoutes = permissionStore.generateRoutes(menuTree)
      } else {
        throw new Error('菜单树为空，降级')
      }
    } catch {
      console.warn('[Login] 后端菜单 API 不可用，使用静态路由+权限过滤降级方案')
      accessRoutes = permissionStore.generateRoutesFallback(userStore.permissions)
    }
    accessRoutes.forEach(r => router.addRoute(r as RouteRecordRaw))

    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    await router.push(redirect)
  } catch (error) {
    // 错误信息已在拦截器中处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.15);
}

.login-title {
  text-align: center;
  margin-bottom: 30px;
  font-size: 24px;
  color: var(--color-text-primary);
}
</style>
