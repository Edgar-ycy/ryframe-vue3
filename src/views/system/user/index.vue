<template>
  <div class="user-management">
    <div class="user-management__left">
      <DepartmentTree
        :nodes="deptTree ?? []"
        :loading="deptTreeLoading"
        :selected-id="selectedDeptId"
        @select="handleDeptSelect"
      />
    </div>

    <div class="user-management__right">
      <el-card shadow="never" class="search-card">
        <div class="search-card__header">
          <span class="search-card__title">
            {{ t('system.user.list') }}
            <template v-if="selectedDeptName">
              <el-icon class="search-card__separator"><ArrowRight /></el-icon>
              <el-tag size="small" closable @close="clearDeptFilter">
                {{ selectedDeptName }}
              </el-tag>
            </template>
          </span>
        </div>
        <el-form :model="queryParams" inline>
          <el-form-item :label="t('system.user.username')">
            <el-input
              v-model="queryParams.username"
              :placeholder="t('system.user.enterUsername')"
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item :label="t('system.user.phone')">
            <el-input
              v-model="queryParams.phone"
              :placeholder="t('system.user.enterPhone')"
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item :label="t('system.common.status')">
            <el-select
              v-model="queryParams.status"
              :placeholder="t('system.user.statusPlaceholder')"
              clearable
              style="width: 120px"
            >
              <el-option :label="t('system.common.normal')" value="1" />
              <el-option :label="t('system.common.disabled')" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button
              v-perm="'system:user:list'"
              type="primary"
              icon="Search"
              @click="handleSearch"
            >
              {{ t('system.common.search') }}
            </el-button>
            <el-button v-perm="'system:user:list'" icon="Refresh" @click="handleReset">
              {{ t('system.common.reset') }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="table-card">
        <template #header>
          <div class="card-header">
            <span>{{ t('system.user.list') }}</span>
            <div>
              <el-button
                v-if="hasPermission('system:user-import:add')"
                icon="Download"
                :loading="templateLoading"
                @click="handleDownloadTemplate"
              >
                {{ t('system.userImport.downloadTemplate') }}
              </el-button>
              <el-button
                v-if="hasPermission('system:user-import:list')"
                icon="Clock"
                @click="openImportHistory"
              >
                {{ t('system.userImport.history') }}
              </el-button>
              <el-button
                v-if="hasPermission('system:user-import:add')"
                icon="Upload"
                :loading="importLoading"
                @click="openImport"
              >
                {{ t('system.userImport.open') }}
              </el-button>
              <el-button
                v-perm="'system:user:export'"
                icon="Download"
                :loading="exportLoading"
                :disabled="!canExport"
                :title="canExport ? undefined : t('system.common.exportRequiresSuccessfulQuery')"
                @click="handleExport"
              >
                {{ t('system.common.export') }}
              </el-button>
              <el-button
                v-perm="'system:user:add'"
                type="primary"
                icon="Plus"
                @click="handleAdd"
              >
                {{ t('system.common.add') }}
              </el-button>
            </div>
          </div>
        </template>

        <el-table v-loading="loading" :data="tableResponse?.items ?? []" border stripe>
          <el-table-column prop="id" :label="t('system.common.id')" width="70" align="center" />
          <el-table-column prop="username" :label="t('system.user.username')" show-overflow-tooltip />
          <el-table-column prop="nickname" :label="t('system.user.nickname')" show-overflow-tooltip />
          <el-table-column prop="email" :label="t('system.user.email')" show-overflow-tooltip />
          <el-table-column prop="phone" :label="t('system.user.phone')" show-overflow-tooltip />
          <el-table-column prop="dept_name" :label="t('system.user.department')" show-overflow-tooltip />
          <el-table-column prop="status" :label="t('system.common.status')" align="center">
            <template #default="{ row }">
              <el-switch
                v-if="hasPermission('system:user:edit') && isManageableStatus(row.status)"
                v-model="row.status"
                active-value="1"
                inactive-value="0"
                :loading="statusUpdatingId === row.id"
                :disabled="statusUpdatingId !== null"
                @change="(value: UserManageableStatus) => handleChangeStatus(row, value)"
              />
              <el-tag v-else :type="userStatusTag(row.status)" size="small">
                {{ userStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" :label="t('system.common.createdAt')" />
          <el-table-column :label="t('system.common.actions')" min-width="330" fixed="right" align="center">
            <template #default="{ row }">
              <el-button
                v-perm="'system:user:edit'"
                type="primary"
                link
                icon="Edit"
                @click="handleEdit(row)"
              >
                {{ t('system.common.edit') }}
              </el-button>
              <el-button
                v-perm="'system:user:edit'"
                type="success"
                link
                icon="UserFilled"
                @click="handleAssignRoles(row)"
              >
                {{ t('system.user.assignRoles') }}
              </el-button>
              <el-button
                v-perm="'system:user:edit'"
                type="warning"
                link
                icon="Key"
                @click="handleResetPassword(row)"
              >
                {{ t('system.user.initiateReset') }}
              </el-button>
              <el-button
                v-perm="'system:user:remove'"
                type="danger"
                link
                icon="Delete"
                :loading="deletingId === row.id"
                @click="handleDelete(row)"
              >
                {{ t('system.common.delete') }}
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="t('system.user.noData')" :image-size="100" />
          </template>
        </el-table>

        <el-pagination
          v-if="(tableResponse?.total ?? 0) > 0"
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.page_size"
          :total="tableResponse?.total ?? 0"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @change="fetchData"
        />
      </el-card>
    </div>

    <UserFormDialog
      v-model="userDialogVisible"
      :user="editingUser"
      :dept-tree="deptTree ?? []"
      @saved="refreshData"
    />
    <UserRoleDialog
      v-model="roleDialogVisible"
      :user="roleEditingUser"
      :current-user-id="userStore.userId"
      :current-user-is-super="userStore.isSuper"
      @saved="refreshData"
    />
    <PasswordResetDialog v-model="passwordDialogVisible" :user-id="passwordResetUserId" />
    <UserImportDialog v-model="importDialogVisible" :loading="importLoading" @submit="submitImport" />
    <UserImportHistoryDrawer v-model="importHistoryVisible" />
  </div>
</template>

<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { UserManageableStatus } from '@/api/modules/user'
import { installPlatformOperationsMessages } from '@/i18n/catalog/platform-operations'
import DepartmentTree from './components/DepartmentTree.vue'
import PasswordResetDialog from './components/PasswordResetDialog.vue'
import UserFormDialog from './components/UserFormDialog.vue'
import UserRoleDialog from './components/UserRoleDialog.vue'
import UserImportDialog from './components/UserImportDialog.vue'
import UserImportHistoryDrawer from './components/UserImportHistoryDrawer.vue'
import { useUserManagement } from './composables/useUserManagement'
import { useUserImportManagement } from './composables/useUserImportManagement'

installPlatformOperationsMessages()
const { t } = useI18n()
const {
  canExport,
  clearDeptFilter,
  deletingId,
  deptTree,
  deptTreeLoading,
  editingUser,
  exportLoading,
  fetchData,
  handleAdd,
  handleAssignRoles,
  handleChangeStatus,
  handleDelete,
  handleDeptSelect,
  handleEdit,
  handleExport,
  handleReset,
  handleResetPassword,
  handleSearch,
  hasPermission,
  isManageableStatus,
  loading,
  passwordDialogVisible,
  passwordResetUserId,
  queryParams,
  refreshData,
  roleDialogVisible,
  roleEditingUser,
  selectedDeptId,
  selectedDeptName,
  statusUpdatingId,
  tableResponse,
  userStatusLabel,
  userStatusTag,
  userDialogVisible,
  userStore,
} = useUserManagement()

const {
  handleDownloadTemplate,
  importDialogVisible,
  importHistoryVisible,
  importLoading,
  openHistory: openImportHistory,
  openImport,
  submitImport,
  templateLoading,
} = useUserImportManagement(refreshData)
</script>

<style scoped lang="scss">
.user-management {
  display: flex;
  gap: 12px;
  height: calc(100vh - var(--navbar-height) - var(--tags-view-height) - 40px);
  min-height: 600px;

  &__left {
    width: 280px;
    flex-shrink: 0;
  }

  &__right {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
  }
}

.search-card__header {
  margin-bottom: 12px;
}

.search-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.search-card__separator {
  color: var(--color-text-secondary);
}

.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.el-card__body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  :deep(.el-table) {
    flex: 1;
  }
}

@media (width <= 1024px) {
  .user-management {
    flex-direction: column;
    height: auto;

    &__left {
      width: 100%;
      max-height: 320px;
    }

    &__right {
      min-height: 500px;
    }
  }
}

@media (width <= 768px) {
  .user-management {
    gap: 8px;

    &__left {
      max-height: 260px;
    }

    &__right {
      min-height: 400px;
    }
  }

  .search-card :deep(.el-form-item) {
    margin-bottom: 8px;
  }
}
</style>
