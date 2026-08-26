<template>
  <div class="page-container authorization-diagnostics-page">
    <el-card shadow="never" class="search-card">
      <template #header>
        <div class="card-header">
          <div>
            <span>{{ t('system.authorizationDiagnostic.title') }}</span>
            <p class="card-subtitle">{{ t('system.authorizationDiagnostic.subtitle') }}</p>
          </div>
        </div>
      </template>
      <el-form inline @submit.prevent="recalculate">
        <el-form-item :label="t('system.authorizationDiagnostic.selectUser')">
          <el-select
            v-model="selectedUserId"
            filterable
            remote
            clearable
            reserve-keyword
            :remote-method="searchUsers"
            :loading="usersQuery.isFetching.value"
            :placeholder="t('system.authorizationDiagnostic.selectUserPlaceholder')"
            class="user-selector"
            @visible-change="handleSelectorVisible"
          >
            <el-option
              v-for="option in usersQuery.data.value?.items ?? []"
              :key="option.value"
              :label="option.label"
              :value="option.value"
              :disabled="option.disabled"
            >
              <span>{{ option.label }}</span>
              <small v-if="option.description" class="option-description">{{
                option.description
              }}</small>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            v-perm="'system:authorization-diagnostic:list'"
            type="primary"
            icon="Refresh"
            :loading="diagnosticQuery.isFetching.value"
            :disabled="!selectedUserId"
            @click="recalculate"
          >
            {{ t('system.authorizationDiagnostic.calculate') }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-empty
      v-if="!selectedUserId"
      :description="t('system.authorizationDiagnostic.selectUserPlaceholder')"
    />
    <el-skeleton
      v-else-if="diagnosticQuery.isLoading.value"
      :rows="8"
      animated
      class="diagnostic-loading"
    />

    <template v-else-if="diagnosticQuery.data.value">
      <el-card shadow="never" class="content-card">
        <template #header>
          <div class="card-header">
            <span>{{ t('system.authorizationDiagnostic.account') }}</span>
            <span class="calculated-at">
              {{
                t('system.authorizationDiagnostic.calculatedAt', {
                  time: formatLocalizedDate(diagnosticQuery.data.value.calculated_at),
                })
              }}
            </span>
          </div>
        </template>
        <div class="summary-grid">
          <div class="summary-item">
            <span>{{ t('dashboard.account') }}</span>
            <strong
              >{{ diagnosticQuery.data.value.user.nickname }}（{{
                diagnosticQuery.data.value.user.username
              }}）</strong
            >
          </div>
          <div class="summary-item">
            <span>{{ t('system.authorizationDiagnostic.tenant') }}</span>
            <strong
              >{{ diagnosticQuery.data.value.tenant.name }}（{{
                diagnosticQuery.data.value.tenant.tenant_id
              }}）</strong
            >
          </div>
          <div class="summary-item">
            <span>{{ t('system.authorizationDiagnostic.department') }}</span>
            <strong>{{ diagnosticQuery.data.value.user.dept_name || '—' }}</strong>
          </div>
          <div class="summary-item">
            <span>{{ t('system.authorizationDiagnostic.finalAccess') }}</span>
            <el-tag
              :type="diagnosticQuery.data.value.user.final_access_enabled ? 'success' : 'danger'"
            >
              {{
                diagnosticQuery.data.value.user.final_access_enabled
                  ? t('system.authorizationDiagnostic.accessEnabled')
                  : t('system.authorizationDiagnostic.accessDisabled')
              }}
            </el-tag>
          </div>
        </div>
        <el-alert
          v-if="diagnosticQuery.data.value.warnings.length"
          :title="t('system.authorizationDiagnostic.warnings')"
          type="warning"
          show-icon
          :closable="false"
          class="warnings-alert"
        >
          <ul class="warning-list">
            <li v-for="warning in diagnosticQuery.data.value.warnings" :key="warning">
              {{ warningLabel(warning) }}
            </li>
          </ul>
        </el-alert>
        <el-alert
          v-else
          :title="t('system.authorizationDiagnostic.noWarnings')"
          type="success"
          show-icon
          :closable="false"
          class="warnings-alert"
        />
      </el-card>

      <el-card shadow="never" class="content-card">
        <template #header
          ><span>{{ t('system.authorizationDiagnostic.roles') }}</span></template
        >
        <div class="table-scroll">
          <el-table :data="diagnosticQuery.data.value.roles" border stripe class="roles-table">
            <el-table-column
              prop="name"
              :label="t('system.user.role')"
              min-width="150"
              show-overflow-tooltip
            />
            <el-table-column
              prop="code"
              :label="t('system.authorizationDiagnostic.roleCode')"
              min-width="150"
              show-overflow-tooltip
            />
            <el-table-column :label="t('system.authorizationDiagnostic.roleStatus')" width="110">
              <template #default="{ row }">
                <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">
                  {{ row.status === '1' ? t('system.common.normal') : t('system.common.disabled') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('system.authorizationDiagnostic.participates')" width="110">
              <template #default="{ row }">{{ yesNo(row.participates) }}</template>
            </el-table-column>
            <el-table-column :label="t('system.authorizationDiagnostic.superRole')" width="105">
              <template #default="{ row }">{{ yesNo(row.is_super) }}</template>
            </el-table-column>
            <el-table-column :label="t('system.authorizationDiagnostic.dataScope')" min-width="160">
              <template #default="{ row }">{{ scopeLabel(row.data_scope) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>

      <el-card shadow="never" class="content-card">
        <template #header>
          <div class="card-header">
            <span>{{ t('system.authorizationDiagnostic.permissions') }}</span>
            <el-input
              v-model="permissionSearch"
              clearable
              :placeholder="t('system.authorizationDiagnostic.permissionSearch')"
              class="inline-search"
            />
          </div>
        </template>
        <div class="table-scroll">
          <el-table
            :data="filteredPermissions()"
            border
            stripe
            class="permissions-table"
            :empty-text="t('common.noData')"
          >
            <el-table-column
              prop="name"
              :label="t('system.authorizationDiagnostic.permissions')"
              min-width="180"
              show-overflow-tooltip
            />
            <el-table-column
              prop="code"
              :label="t('system.authorizationDiagnostic.permissionCode')"
              min-width="240"
              show-overflow-tooltip
            />
            <el-table-column
              :label="t('system.authorizationDiagnostic.sourceRoles')"
              min-width="220"
            >
              <template #default="{ row }">{{ row.source_roles.join(', ') || '—' }}</template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>

      <el-card shadow="never" class="content-card">
        <template #header>
          <div class="card-header">
            <span>{{ t('system.authorizationDiagnostic.menus') }}</span>
            <el-input
              v-model="menuSearch"
              clearable
              :placeholder="t('system.authorizationDiagnostic.menuSearch')"
              class="inline-search"
            />
          </div>
        </template>
        <div class="table-scroll">
          <el-table
            :data="filteredMenus()"
            border
            stripe
            class="menus-table"
            :empty-text="t('common.noData')"
          >
            <el-table-column
              prop="name"
              :label="t('system.authorizationDiagnostic.menus')"
              min-width="170"
              show-overflow-tooltip
            />
            <el-table-column
              prop="route_key"
              :label="t('system.authorizationDiagnostic.routeKey')"
              min-width="190"
              show-overflow-tooltip
            />
            <el-table-column
              prop="permission_code"
              :label="t('system.authorizationDiagnostic.permission')"
              min-width="220"
              show-overflow-tooltip
            />
            <el-table-column :label="t('system.authorizationDiagnostic.accessible')" width="100">
              <template #default="{ row }">{{ yesNo(row.accessible) }}</template>
            </el-table-column>
            <el-table-column
              :label="t('system.authorizationDiagnostic.visibleInNavigation')"
              width="120"
            >
              <template #default="{ row }">{{ yesNo(row.visible_in_navigation) }}</template>
            </el-table-column>
            <el-table-column :label="t('system.authorizationDiagnostic.reason')" min-width="180">
              <template #default="{ row }">{{
                row.inaccessible_reason ? reasonLabel(row.inaccessible_reason) : '—'
              }}</template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>

      <div class="diagnostic-grid">
        <el-card shadow="never" class="content-card">
          <template #header
            ><span>{{ t('system.authorizationDiagnostic.scopeResult') }}</span></template
          >
          <el-descriptions :column="1" border>
            <el-descriptions-item :label="t('system.authorizationDiagnostic.dataScope')">
              {{ scopeLabel(diagnosticQuery.data.value.data_scope.scope) }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('system.authorizationDiagnostic.includeSelf')">
              {{ yesNo(diagnosticQuery.data.value.data_scope.include_self) }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('system.authorizationDiagnostic.scopeSources')">
              {{ scopeSources() }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('system.authorizationDiagnostic.departmentPath')">
              {{ departmentNames(diagnosticQuery.data.value.data_scope.department_path) }}
            </el-descriptions-item>
            <el-descriptions-item :label="t('system.authorizationDiagnostic.customDepartments')">
              {{ departmentNames(diagnosticQuery.data.value.data_scope.custom_departments) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="never" class="content-card">
          <template #header
            ><span>{{ t('system.authorizationDiagnostic.versions') }}</span></template
          >
          <el-descriptions :column="1" border>
            <el-descriptions-item :label="t('system.authorizationDiagnostic.cacheStatus')">
              <el-tag :type="cacheStatusTag(diagnosticQuery.data.value.versions.cache_status)">
                {{ cacheStatusLabel(diagnosticQuery.data.value.versions.cache_status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item :label="t('system.authorizationDiagnostic.tenantEpoch')">{{
              diagnosticQuery.data.value.versions.tenant_authorization_epoch
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('system.authorizationDiagnostic.userVersion')">{{
              diagnosticQuery.data.value.versions.user_authorization_version
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('system.authorizationDiagnostic.cachedTenantEpoch')">{{
              diagnosticQuery.data.value.versions.cached_tenant_authorization_epoch ?? '—'
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('system.authorizationDiagnostic.cachedUserVersion')">{{
              diagnosticQuery.data.value.versions.cached_user_authorization_version ?? '—'
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('system.authorizationDiagnostic.websocket')">{{
              availableLabel(
                diagnosticQuery.data.value.dynamic_refresh.websocket_notification_available,
              )
            }}</el-descriptions-item>
            <el-descriptions-item :label="t('system.authorizationDiagnostic.headerFallback')">{{
              availableLabel(
                diagnosticQuery.data.value.dynamic_refresh.response_header_epoch_fallback_available,
              )
            }}</el-descriptions-item>
          </el-descriptions>
          <p class="refresh-note">{{ t('system.authorizationDiagnostic.onlineNotAsserted') }}</p>
        </el-card>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  getAuthorizationDiagnostic,
  type AuthorizationDiagnostic,
} from '@/api/modules/authorizationDiagnostic'
import { listUserOptions } from '@/api/modules/user'
import type { SelectOptionList } from '@/api/modules/option'
import { useKeepAlivePageActive } from '@/hooks/useKeepAlivePageActive'
import { formatLocalizedDate } from '@/i18n'
import { requireOperationData } from '@/shared/http/client'
import { useTenantQuery } from '@/shared/query/useTenantQuery'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()
const userStore = useUserStore()
const pageActive = ref(true)
const selectedUserId = ref('')
const userSearch = ref('')
const permissionSearch = ref('')
const menuSearch = ref('')
let userSearchTimer: number | undefined

onUnmounted(() => {
  if (userSearchTimer !== undefined) window.clearTimeout(userSearchTimer)
})

const usersQuery = useTenantQuery<SelectOptionList>(
  () => userStore.tenantId,
  () => userStore.sessionStatus === 'authenticated' && pageActive.value,
  'user-options',
  () => ({ q: userSearch.value, limit: 50 }),
  async (signal) => {
    const response = await listUserOptions({ q: userSearch.value || undefined, limit: 50 }, signal)
    return response.data ?? { items: [], has_more: false }
  },
  { refetchInterval: false },
)

const diagnosticQuery = useTenantQuery<AuthorizationDiagnostic>(
  () => userStore.tenantId,
  () =>
    userStore.sessionStatus === 'authenticated' &&
    pageActive.value &&
    Boolean(selectedUserId.value),
  'authorization-diagnostic',
  () => ({ userId: selectedUserId.value }),
  async (signal) =>
    requireOperationData(await getAuthorizationDiagnostic(selectedUserId.value, signal)),
  { refetchInterval: false },
)

useKeepAlivePageActive(pageActive, refreshActiveData)

function searchUsers(value: string): void {
  if (userSearchTimer !== undefined) window.clearTimeout(userSearchTimer)
  userSearchTimer = window.setTimeout(() => {
    userSearch.value = value.trim()
    userSearchTimer = undefined
  }, 300)
}

function handleSelectorVisible(open: boolean): void {
  if (open && !usersQuery.data.value) void usersQuery.refetch()
}

function recalculate(): void {
  if (!selectedUserId.value || diagnosticQuery.isFetching.value) return
  void diagnosticQuery.refetch({ throwOnError: true })
}

async function refreshActiveData(): Promise<void> {
  const requests: Promise<unknown>[] = [usersQuery.refetch()]
  if (selectedUserId.value) requests.push(diagnosticQuery.refetch())
  await Promise.all(requests)
}

function yesNo(value: boolean): string {
  return t(value ? 'system.common.yes' : 'system.common.no')
}

function availableLabel(value: boolean): string {
  return t(
    value
      ? 'system.authorizationDiagnostic.available'
      : 'system.authorizationDiagnostic.unavailable',
  )
}

function normalizedSearch(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function filteredPermissions() {
  const diagnostic = diagnosticQuery.data.value
  if (!diagnostic) return []
  const keyword = normalizedSearch(permissionSearch.value)
  if (!keyword) return diagnostic.permissions
  return diagnostic.permissions.filter(
    (permission) =>
      permission.code.toLocaleLowerCase().includes(keyword) ||
      permission.name.toLocaleLowerCase().includes(keyword),
  )
}

function filteredMenus() {
  const diagnostic = diagnosticQuery.data.value
  if (!diagnostic) return []
  const keyword = normalizedSearch(menuSearch.value)
  if (!keyword) return diagnostic.menus
  return diagnostic.menus.filter(
    (menu) =>
      menu.name.toLocaleLowerCase().includes(keyword) ||
      menu.route_key?.toLocaleLowerCase().includes(keyword) ||
      menu.permission_code?.toLocaleLowerCase().includes(keyword),
  )
}

const SCOPE_KEYS: Record<string, string> = {
  all: 'scopeAll',
  custom: 'scopeCustom',
  department: 'scopeDepartment',
  department_and_children: 'scopeDepartmentChildren',
  self_only: 'scopeSelf',
}

function scopeLabel(scope: string): string {
  return t(`system.authorizationDiagnostic.${SCOPE_KEYS[scope] ?? 'scopeSelf'}`)
}

const WARNING_KEYS: Record<string, string> = {
  user_disabled: 'warningUserDisabled',
  tenant_disabled: 'warningTenantDisabled',
  tenant_expired: 'warningTenantExpired',
  no_enabled_roles: 'warningNoEnabledRoles',
  authorization_cache_stale: 'warningCacheStale',
  authorization_cache_missing: 'warningCacheMissing',
  authorization_cache_unavailable: 'warningCacheUnavailable',
  invalid_menu_permission_reference: 'warningInvalidMenuPermission',
}

function warningLabel(warning: string): string {
  const key = WARNING_KEYS[warning]
  return key ? t(`system.authorizationDiagnostic.${key}`) : warning
}

const REASON_KEYS: Record<string, string> = {
  tenant_unavailable: 'reasonTenantUnavailable',
  user_disabled: 'reasonUserDisabled',
  menu_disabled: 'reasonMenuDisabled',
  no_accessible_child: 'reasonNoAccessibleChild',
  permission_missing: 'reasonPermissionMissing',
  invalid_permission_reference: 'reasonInvalidPermission',
  permission_disabled: 'reasonPermissionDisabled',
  permission_not_granted: 'reasonPermissionNotGranted',
}

function reasonLabel(reason: string): string {
  const key = REASON_KEYS[reason]
  return key ? t(`system.authorizationDiagnostic.${key}`) : reason
}

function departmentNames(
  departments: AuthorizationDiagnostic['data_scope']['department_path'],
): string {
  return departments.map((department) => department.name).join(' / ') || '—'
}

function scopeSources(): string {
  const sources = diagnosticQuery.data.value?.data_scope.sources ?? []
  return (
    sources.map((source) => `${source.role_code}：${scopeLabel(source.scope)}`).join('；') || '—'
  )
}

function cacheStatusLabel(status: string): string {
  const key =
    {
      current: 'cacheCurrent',
      stale: 'cacheStale',
      missing: 'cacheMissing',
      unavailable: 'cacheUnavailable',
    }[status] ?? 'cacheUnavailable'
  return t(`system.authorizationDiagnostic.${key}`)
}

function cacheStatusTag(status: string): 'danger' | 'info' | 'success' | 'warning' {
  if (status === 'current') return 'success'
  if (status === 'stale') return 'warning'
  if (status === 'missing') return 'info'
  return 'danger'
}
</script>

<style scoped lang="scss" src="./index.scss"></style>
