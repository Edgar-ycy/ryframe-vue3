<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ t('system.permission.list') }}</span>
          <div class="toolbar">
            <el-button v-perm="'system:perm:add'" type="primary" icon="Plus" @click="handleAdd()">
              {{ t('system.common.add') }}
            </el-button>
            <el-button
              v-perm="'system:perm:sync'"
              icon="RefreshRight"
              :loading="syncLoading"
              @click="handleSync"
            >
              {{ t('system.permission.syncApi') }}
            </el-button>
            <el-button v-perm="'system:perm:list'" icon="Refresh" @click="fetchData">
              {{ t('system.common.refresh') }}
            </el-button>
          </div>
        </div>
      </template>

      <el-alert
        v-if="syncReport"
        class="sync-alert"
        :title="syncReportTitle"
        type="success"
        closable
        show-icon
        @close="syncReport = null"
      >
        <template #default>
          <div class="sync-report">
            <span>{{ t('system.permission.scanned', { count: syncReport.scanned }) }}</span>
            <span>{{ t('system.permission.existing', { count: syncReport.existing }) }}</span>
            <span>{{ t('system.permission.created', { count: syncReport.created }) }}</span>
          </div>
          <div v-if="syncReport.missing.length" class="sync-missing">
            <div class="sync-missing__label">{{ t('system.permission.missingCodes') }}</div>
            <el-tag
              v-for="code in syncReport.missing"
              :key="code"
              size="small"
              type="warning"
              class="sync-missing__tag"
            >
              {{ code }}
            </el-tag>
          </div>
        </template>
      </el-alert>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        default-expand-all
      >
        <el-table-column prop="name" :label="t('system.permission.name')" min-width="160" show-overflow-tooltip />
        <el-table-column prop="code" :label="t('system.permission.code')" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag>{{ row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="perm_type" :label="t('system.common.type')" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.perm_type === 'api' ? 'info' : 'success'" size="small">
              {{ row.perm_type === 'api' ? t('system.common.api') : t('system.common.menu') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sort" :label="t('system.common.sort')" width="80" align="center" />
        <el-table-column prop="status" :label="t('system.common.status')" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">
              {{ row.status === '1' ? t('system.common.normal') : t('system.common.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('system.common.actions')" width="210" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-perm="'system:perm:add'"
              type="success"
              link
              icon="Plus"
              @click="handleAdd(row.id)"
            >
              {{ t('system.common.add') }}
            </el-button>
            <el-button
              v-perm="'system:perm:edit'"
              type="primary"
              link
              icon="Edit"
              @click="handleEdit(row)"
            >
              {{ t('system.common.edit') }}
            </el-button>
            <el-button
              v-perm="'system:perm:remove'"
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
          <el-empty :description="t('system.permission.noData')" :image-size="100" />
        </template>
      </el-table>
    </el-card>

    <PermissionFormDialog
      v-model="dialogVisible"
      :permission="editingPermission"
      :parent-id="parentPermissionId"
      :parent-tree="parentTree"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PermissionFormDialog from './components/PermissionFormDialog.vue'
import { usePermissionManagement } from './composables/usePermissionManagement'

const { t } = useI18n()

const {
  deletingId,
  dialogVisible,
  editingPermission,
  fetchData,
  handleAdd,
  handleDelete,
  handleEdit,
  handleSaved,
  handleSync,
  loading,
  parentPermissionId,
  parentTree,
  syncLoading,
  syncReport,
  syncReportTitle,
  tableData,
} = usePermissionManagement()
</script>

<style scoped>
.sync-alert {
  margin-bottom: 12px;
}

.toolbar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.sync-report {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.sync-missing {
  margin-top: 12px;
}

.sync-missing__label {
  margin-bottom: 8px;
  font-weight: 600;
}

.sync-missing__tag {
  margin: 0 8px 8px 0;
}
</style>
