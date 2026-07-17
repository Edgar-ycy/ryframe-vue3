<template>
  <div class="user-management">
    <div class="user-management__left">
      <DepartmentTree
        :nodes="deptTree"
        :loading="deptTreeLoading"
        :selected-id="selectedDeptId"
        @select="handleDeptSelect"
      />
    </div>

    <div class="user-management__right">
      <el-card shadow="never" class="search-card">
        <div class="search-card__header">
          <span class="search-card__title">
            用户列表
            <template v-if="selectedDeptName">
              <el-icon class="search-card__separator"><ArrowRight /></el-icon>
              <el-tag size="small" closable @close="clearDeptFilter">
                {{ selectedDeptName }}
              </el-tag>
            </template>
          </span>
        </div>
        <el-form :model="queryParams" inline>
          <el-form-item label="用户名">
            <el-input
              v-model="queryParams.username"
              placeholder="请输入用户名"
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input
              v-model="queryParams.phone"
              placeholder="请输入手机号"
              clearable
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="queryParams.status"
              placeholder="用户状态"
              clearable
              style="width: 120px"
            >
              <el-option label="正常" value="1" />
              <el-option label="停用" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button
              v-perm="'system:user:list'"
              type="primary"
              icon="Search"
              @click="handleSearch"
            >
              搜索
            </el-button>
            <el-button v-perm="'system:user:list'" icon="Refresh" @click="handleReset">
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="table-card">
        <template #header>
          <div class="card-header">
            <span>用户列表</span>
            <div>
              <el-button
                v-perm="'system:user:export'"
                icon="Download"
                :loading="exportLoading"
                @click="handleExport"
              >
                导出
              </el-button>
              <el-button
                v-perm="'system:user:add'"
                type="primary"
                icon="Plus"
                @click="handleAdd"
              >
                新增
              </el-button>
            </div>
          </div>
        </template>

        <el-table v-loading="loading" :data="tableData" border stripe>
          <el-table-column prop="id" label="ID" width="70" align="center" />
          <el-table-column prop="username" label="用户名" show-overflow-tooltip />
          <el-table-column prop="nickname" label="昵称" show-overflow-tooltip />
          <el-table-column prop="email" label="邮箱" show-overflow-tooltip />
          <el-table-column prop="phone" label="手机号" show-overflow-tooltip />
          <el-table-column prop="dept_name" label="部门" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" align="center">
            <template #default="{ row }">
              <el-switch
                v-if="hasPermission('system:user:edit') && isManageableStatus(row.status)"
                v-model="row.status"
                active-value="1"
                inactive-value="0"
                @change="(value: UserManageableStatus) => handleChangeStatus(row, value)"
              />
              <el-tag v-else :type="userStatusTag(row.status)" size="small">
                {{ userStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" />
          <el-table-column label="操作" min-width="330" fixed="right" align="center">
            <template #default="{ row }">
              <el-button
                v-perm="'system:user:edit'"
                type="primary"
                link
                icon="Edit"
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                v-perm="'system:user:edit'"
                type="success"
                link
                icon="UserFilled"
                @click="handleAssignRoles(row)"
              >
                分配角色
              </el-button>
              <el-button
                v-perm="'system:user:edit'"
                type="warning"
                link
                icon="Key"
                @click="handleResetPassword(row)"
              >
                发起重置
              </el-button>
              <el-button
                v-perm="'system:user:remove'"
                type="danger"
                link
                icon="Delete"
                :loading="deletingId === row.id"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无用户数据" :image-size="100" />
          </template>
        </el-table>

        <el-pagination
          v-if="total > 0"
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.page_size"
          :total="total"
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
      :dept-tree="deptTree"
      :roles="roleList"
      :is-admin="isAdmin()"
      @saved="fetchData"
    />
    <UserRoleDialog
      v-model="roleDialogVisible"
      :user="roleEditingUser"
      :roles="roleList"
      :is-admin="isAdmin()"
      :current-user-id="userStore.userId"
      :current-user-is-super="userStore.isSuper"
    />
    <PasswordResetDialog v-model="passwordDialogVisible" :user-id="passwordResetUserId" />
  </div>
</template>

<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue'
import type { UserManageableStatus } from '@/api/modules/user'
import DepartmentTree from './components/DepartmentTree.vue'
import PasswordResetDialog from './components/PasswordResetDialog.vue'
import UserFormDialog from './components/UserFormDialog.vue'
import UserRoleDialog from './components/UserRoleDialog.vue'
import { useUserManagement } from './composables/useUserManagement'

const {
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
  isAdmin,
  isManageableStatus,
  loading,
  passwordDialogVisible,
  passwordResetUserId,
  queryParams,
  roleList,
  roleDialogVisible,
  roleEditingUser,
  selectedDeptId,
  selectedDeptName,
  tableData,
  total,
  userStatusLabel,
  userStatusTag,
  userDialogVisible,
  userStore,
} = useUserManagement()
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
