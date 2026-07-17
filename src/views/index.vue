<template>
  <main class="workspace">
    <header class="workspace-header">
      <div>
        <p class="workspace-label">工作台</p>
        <h1>你好，{{ displayName }}</h1>
        <p class="workspace-subtitle">当前登录信息与可访问功能均来自本次会话。</p>
      </div>
      <el-tag type="success" effect="plain">已登录</el-tag>
    </header>

    <section class="account-summary" aria-label="账号概览">
      <dl>
        <div>
          <dt>账号</dt>
          <dd>{{ userStore.username || '-' }}</dd>
        </div>
        <div>
          <dt>当前租户</dt>
          <dd>{{ tenantLabel }}</dd>
        </div>
        <div>
          <dt>角色</dt>
          <dd>{{ roleLabel }}</dd>
        </div>
        <div>
          <dt>可访问功能</dt>
          <dd>{{ allLinks.length }}</dd>
        </div>
      </dl>
    </section>

    <section class="quick-section">
      <div class="section-heading">
        <div>
          <h2>快捷入口</h2>
          <p>入口根据当前角色和权限自动更新。</p>
        </div>
      </div>

      <div v-if="quickLinks.length" class="quick-grid">
        <button
          v-for="link in quickLinks"
          :key="link.path"
          type="button"
          class="quick-link"
          @click="openLink(link.path)"
        >
          <span class="quick-icon">
            <el-icon :size="22">
              <component :is="link.icon || 'Grid'" />
            </el-icon>
          </span>
          <span class="quick-title">{{ link.title }}</span>
          <el-icon class="quick-arrow"><ArrowRight /></el-icon>
        </button>
      </div>
      <el-empty v-else description="当前账号没有可访问的业务功能" />
    </section>
  </main>
</template>

<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue'
import { usePermission } from '@/hooks/usePermission'
import { usePermissionStore } from '@/stores/permission'
import { useUserStore } from '@/stores/user'
import {
  collectDashboardLinks,
  type DashboardLink,
} from './dashboardLinks'

const router = useRouter()
const permissionStore = usePermissionStore()
const userStore = useUserStore()
const { hasAllPermissions, isAdmin } = usePermission()

const displayName = computed(() => userStore.nickname || userStore.username || '用户')
const tenantLabel = computed(() => userStore.tenantName || userStore.tenantId || '-')
const roleLabel = computed(() => userStore.roles.length ? userStore.roles.join('、') : '-')
const canManageTenants = computed(() =>
  userStore.tenantId === 'system'
  && (isAdmin() || hasAllPermissions('tenant:manage', 'tenant:list')),
)

const allLinks = computed<DashboardLink[]>(() => {
  const links = collectDashboardLinks(permissionStore.menus, Number.MAX_SAFE_INTEGER)
  if (canManageTenants.value) {
    links.push({ title: '租户管理', path: '/platform/tenants', icon: 'OfficeBuilding' })
  }
  return links
})
const quickLinks = computed(() => allLinks.value.slice(0, 8))

function openLink(path: string): void {
  void router.push(path)
}
</script>

<style scoped>
.workspace {
  min-height: 100%;
  padding: 28px;
  color: var(--color-text-primary);
  background: #f6f8fa;
}

.workspace-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  max-width: 1120px;
  margin: 0 auto;
  padding: 4px 0 24px;
  border-bottom: 1px solid #dce2e8;
}

.workspace-label {
  margin: 0 0 6px;
  color: #31736f;
  font-size: 13px;
  font-weight: 700;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 8px;
  font-size: 28px;
  line-height: 1.25;
}

.workspace-subtitle,
.section-heading p {
  margin-bottom: 0;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.account-summary {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 0;
  border-bottom: 1px solid #dce2e8;
}

.account-summary dl {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
}

.account-summary dl > div {
  min-width: 0;
  padding: 0 20px;
  border-left: 1px solid #dce2e8;
}

.account-summary dl > div:first-child {
  padding-left: 0;
  border-left: 0;
}

.account-summary dt {
  margin-bottom: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.account-summary dd {
  overflow: hidden;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-section {
  max-width: 1120px;
  margin: 0 auto;
  padding-top: 28px;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  margin-bottom: 16px;
}

h2 {
  margin-bottom: 5px;
  font-size: 18px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.quick-link {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 18px;
  gap: 10px;
  align-items: center;
  min-width: 0;
  padding: 14px;
  border: 1px solid #d7dee5;
  border-radius: 6px;
  color: inherit;
  text-align: left;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.quick-link:hover,
.quick-link:focus-visible {
  border-color: #4c8f8a;
  box-shadow: 0 4px 14px rgb(38 81 78 / 10%);
  outline: none;
}

.quick-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 6px;
  color: #2f6f6b;
  background: #e8f3f2;
}

.quick-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-arrow {
  color: #8a97a5;
}

@media (width <= 900px) {
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 640px) {
  .workspace {
    padding: 20px 16px;
  }

  .account-summary dl {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 0;
  }

  .account-summary dl > div:nth-child(3) {
    padding-left: 0;
    border-left: 0;
  }

  .quick-grid {
    grid-template-columns: 1fr;
  }
}
</style>
