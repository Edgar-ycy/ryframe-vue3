<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item :label="t('system.role.name')">
          <el-input
            v-model="queryParams.name"
            :placeholder="t('system.role.enterName')"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item :label="t('system.role.code')">
          <el-input
            v-model="queryParams.code"
            :placeholder="t('system.role.enterCode')"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item :label="t('system.common.status')">
          <el-select
            v-model="queryParams.status"
            :placeholder="t('system.role.statusPlaceholder')"
            clearable
            style="width: 120px"
          >
            <el-option :label="t('system.common.normal')" value="1" />
            <el-option :label="t('system.common.disabled')" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button v-perm="'system:role:list'" type="primary" icon="Search" @click="handleSearch">
            {{ t('system.common.search') }}
          </el-button>
          <el-button v-perm="'system:role:list'" icon="Refresh" @click="handleReset">
            {{ t('system.common.reset') }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="content-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('system.role.list') }}</span>
          <div>
            <el-button
              v-perm="'system:role:export'"
              icon="Download"
              :loading="exportLoading"
              :disabled="!canExport"
              :title="canExport ? undefined : t('system.common.exportRequiresSuccessfulQuery')"
              @click="handleExport"
            >
              {{ t('system.common.export') }}
            </el-button>
            <el-button v-perm="'system:role:add'" type="primary" icon="Plus" @click="handleAdd">
              {{ t('system.common.add') }}
            </el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableResponse?.items ?? []" border stripe>
        <el-table-column prop="id" :label="t('system.common.id')" width="70" align="center" />
        <el-table-column
          prop="name"
          :label="t('system.role.name')"
          min-width="130"
          show-overflow-tooltip
        />
        <el-table-column prop="code" :label="t('system.role.code')" />
        <el-table-column prop="sort" :label="t('system.common.sort')" align="center" />
        <el-table-column prop="data_scope" :label="t('system.role.dataScope')" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.data_scope === '1'" type="success">{{ t('system.role.all') }}</el-tag>
            <el-tag v-else-if="row.data_scope === '2'" type="warning">{{
              t('system.role.custom')
            }}</el-tag>
            <el-tag v-else-if="row.data_scope === '3'">{{
              t('system.role.currentDepartment')
            }}</el-tag>
            <el-tag v-else-if="row.data_scope === '4'" type="info">{{
              t('system.role.currentAndBelow')
            }}</el-tag>
            <el-tag v-else type="danger">{{ t('system.role.selfOnly') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="t('system.common.status')" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'">
              {{ row.status === '1' ? t('system.common.normal') : t('system.common.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('system.common.createdAt')" min-width="160">
          <template #default="{ row }">{{ formatLocalizedDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column
          :label="t('system.common.actions')"
          min-width="280"
          fixed="right"
          align="center"
        >
          <template #default="{ row }">
            <el-button
              v-if="!isProtectedRole(row)"
              v-perm="'system:role:edit'"
              type="primary"
              link
              icon="Edit"
              @click="handleEdit(row)"
            >
              {{ t('system.common.edit') }}
            </el-button>
            <el-button
              v-if="!isProtectedRole(row)"
              v-perm="'system:role:edit'"
              type="warning"
              link
              icon="Key"
              @click="handleAssignPermissions(row)"
            >
              {{ t('system.role.permission') }}
            </el-button>
            <el-button
              v-if="!isProtectedRole(row)"
              v-perm="'system:role:edit'"
              type="success"
              link
              icon="DataAnalysis"
              @click="handleDataScope(row)"
            >
              {{ t('system.role.dataPermission') }}
            </el-button>
            <el-button
              v-if="!isProtectedRole(row)"
              v-perm="'system:role:remove'"
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
          <el-empty :description="t('system.role.noData')" :image-size="100" />
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

    <RoleFormDialog v-model="roleDialogVisible" :role="editingRole" @saved="refreshData" />
    <RolePermissionDialog
      v-model="permissionDialogVisible"
      :role="permissionRole"
      :permission-tree="permissionTree ?? []"
      @saved="refreshData"
    />
    <RoleDataScopeDialog
      v-model="dataScopeDialogVisible"
      :role="dataScopeRole"
      :dept-tree="deptTree ?? []"
      @saved="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { formatLocalizedDate } from '@/i18n'
import RoleDataScopeDialog from './components/RoleDataScopeDialog.vue'
import RoleFormDialog from './components/RoleFormDialog.vue'
import RolePermissionDialog from './components/RolePermissionDialog.vue'
import { useRoleManagement } from './composables/useRoleManagement'

const { t } = useI18n()

const {
  canExport,
  dataScopeDialogVisible,
  dataScopeRole,
  deletingId,
  deptTree,
  editingRole,
  exportLoading,
  fetchData,
  handleAdd,
  handleAssignPermissions,
  handleDataScope,
  handleDelete,
  handleEdit,
  handleExport,
  handleReset,
  handleSearch,
  isProtectedRole,
  loading,
  permissionDialogVisible,
  permissionRole,
  permissionTree,
  queryParams,
  refreshData,
  roleDialogVisible,
  tableResponse,
} = useRoleManagement()
</script>
