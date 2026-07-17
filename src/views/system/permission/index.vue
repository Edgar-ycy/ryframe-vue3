<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>权限列表</span>
          <div class="toolbar">
            <el-button v-perm="'system:perm:add'" type="primary" icon="Plus" @click="handleAdd()">
              新增
            </el-button>
            <el-button
              v-perm="'system:perm:sync'"
              icon="RefreshRight"
              :loading="syncLoading"
              @click="handleSync"
            >
              同步接口权限
            </el-button>
            <el-button v-perm="'system:perm:list'" icon="Refresh" @click="fetchData">
              刷新
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
            <span>扫描 {{ syncReport.scanned }} 条</span>
            <span>已有 {{ syncReport.existing }} 条</span>
            <span>新增 {{ syncReport.created }} 条</span>
          </div>
          <div v-if="syncReport.missing.length" class="sync-missing">
            <div class="sync-missing__label">缺失权限码</div>
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
        <el-table-column prop="name" label="权限名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="code" label="权限编码" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag>{{ row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="perm_type" label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.perm_type === 'api' ? 'info' : 'success'" size="small">
              {{ row.perm_type === 'api' ? 'API' : '菜单' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">
              {{ row.status === '1' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-perm="'system:perm:add'"
              type="success"
              link
              icon="Plus"
              @click="handleAdd(row.id)"
            >
              新增
            </el-button>
            <el-button
              v-perm="'system:perm:edit'"
              type="primary"
              link
              icon="Edit"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-perm="'system:perm:remove'"
              type="danger"
              link
              icon="Delete"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无权限数据" :image-size="100" />
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
import PermissionFormDialog from './components/PermissionFormDialog.vue'
import { usePermissionManagement } from './composables/usePermissionManagement'

const {
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
