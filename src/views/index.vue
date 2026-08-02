<template>
  <main class="workspace">
    <header class="workspace-header">
      <div>
        <p class="workspace-label">{{ t('dashboard.workspace') }}</p>
        <h1>{{ t('dashboard.greeting', { name: displayName }) }}</h1>
        <p class="workspace-subtitle">{{ t('dashboard.subtitle') }}</p>
      </div>
      <el-tag class="session-tag" type="success" effect="plain">{{ t('dashboard.signedIn') }}</el-tag>
    </header>

    <section class="account-summary" :aria-label="t('dashboard.accountOverview')">
      <dl>
        <div>
          <dt>{{ t('dashboard.account') }}</dt>
          <dd>{{ userStore.username || '-' }}</dd>
        </div>
        <div>
          <dt>{{ t('dashboard.currentTenant') }}</dt>
          <dd>{{ tenantLabel }}</dd>
        </div>
        <div>
          <dt>{{ t('dashboard.role') }}</dt>
          <dd>{{ roleLabel }}</dd>
        </div>
        <div>
          <dt>{{ t('dashboard.accessibleFeatures') }}</dt>
          <dd>{{ allLinks.length }}</dd>
        </div>
      </dl>
    </section>

    <section class="quick-section">
      <div class="section-heading">
        <div>
          <h2>{{ t('dashboard.quickAccess') }}</h2>
          <p>{{ t('dashboard.quickAccessHint') }}</p>
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
              <component :is="resolveElementIcon(link.icon)" />
            </el-icon>
          </span>
          <span class="quick-title">{{ translateNavigationTitle(link.title) }}</span>
          <el-icon class="quick-arrow"><ArrowRight /></el-icon>
        </button>
      </div>
      <el-empty v-else :description="t('dashboard.noFeatures')" />
    </section>
  </main>
</template>

<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { usePermission } from '@/hooks/usePermission'
import { translateNavigationTitle } from '@/i18n'
import { resolveElementIcon } from '@/shared/ui/icons'
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
const { t } = useI18n()

const displayName = computed(() => userStore.nickname || userStore.username || t('dashboard.defaultUser'))
const tenantLabel = computed(() => userStore.tenantName || userStore.tenantId || '-')
const roleLabel = computed(() => userStore.roles.length ? userStore.roles.join(', ') : '-')
const canManageTenants = computed(() =>
  userStore.tenantId === 'system'
  && (isAdmin() || hasAllPermissions('tenant:manage', 'tenant:list')),
)

const allLinks = computed<DashboardLink[]>(() => {
  const links = collectDashboardLinks(permissionStore.menus, Number.MAX_SAFE_INTEGER)
  if (canManageTenants.value) {
    links.push({ title: t('account.tenantManagement'), path: '/platform/tenants', icon: 'OfficeBuilding' })
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
  background: var(--bg-color-page);
}

.workspace-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  max-width: 1120px;
  margin: 0 auto;
  padding: 4px 0 24px;
  border-bottom: 1px solid var(--border-color-base);
}

.workspace-header :deep(.session-tag.el-tag--success) {
  color: #166534;
  background-color: #f0fdf4;
  border-color: #86efac;
  transition: none;
}

:global(html.dark) .workspace-header :deep(.session-tag.el-tag--success) {
  color: #bbf7d0;
  background-color: #14532d;
  border-color: #16a34a;
}

.workspace-label {
  margin: 0 0 6px;
  color: var(--color-primary-readable);
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
  border-bottom: 1px solid var(--border-color-base);
}

.account-summary dl {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
}

.account-summary dl > div {
  min-width: 0;
  padding: 0 20px;
  border-left: 1px solid var(--border-color-base);
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
  border: 1px solid var(--border-color-base);
  border-radius: 6px;
  color: inherit;
  text-align: left;
  background: var(--bg-color);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.quick-link:hover,
.quick-link:focus-visible {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  outline: none;
}

.quick-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 6px;
  color: var(--color-primary);
  background: var(--border-color-light);
}

.quick-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-arrow {
  color: var(--color-text-secondary);
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
