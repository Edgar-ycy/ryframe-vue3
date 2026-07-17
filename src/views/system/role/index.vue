<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="角色名称">
          <el-input
            v-model="queryParams.name"
            placeholder="请输入角色名称"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="角色编码">
          <el-input
            v-model="queryParams.code"
            placeholder="请输入角色编码"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="角色状态" clearable style="width:120px">
            <el-option label="正常" value="1" />
            <el-option label="停用" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button v-perm="'system:role:list'" type="primary" icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button v-perm="'system:role:list'" icon="Refresh" @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>角色列表</span>
          <div>
            <el-button
              v-perm="'system:role:export'"
              icon="Download"
              :loading="exportLoading"
              @click="handleExport"
            >
              导出
            </el-button>
            <el-button v-perm="'system:role:add'" type="primary" icon="Plus" @click="handleAdd">
              新增
            </el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="角色名称" min-width="130" show-overflow-tooltip />
        <el-table-column prop="code" label="角色编码" />
        <el-table-column prop="sort" label="排序" align="center" />
        <el-table-column prop="data_scope" label="数据范围" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.data_scope === '1'" type="success">全部</el-tag>
            <el-tag v-else-if="row.data_scope === '2'" type="warning">自定义</el-tag>
            <el-tag v-else-if="row.data_scope === '3'">本部门</el-tag>
            <el-tag v-else-if="row.data_scope === '4'" type="info">本部门及以下</el-tag>
            <el-tag v-else type="danger">仅本人</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'">
              {{ row.status === '1' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" />
        <el-table-column label="操作" min-width="280" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="!isProtectedRole(row)"
              v-perm="'system:role:edit'"
              type="primary"
              link
              icon="Edit"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="!isProtectedRole(row)"
              v-perm="'system:role:edit'"
              type="warning"
              link
              icon="Key"
              @click="handleAssignPermissions(row)"
            >
              权限
            </el-button>
            <el-button
              v-if="!isProtectedRole(row)"
              v-perm="'system:role:edit'"
              type="success"
              link
              icon="DataAnalysis"
              @click="handleDataScope(row)"
            >
              数据权限
            </el-button>
            <el-button
              v-if="!isProtectedRole(row)"
              v-perm="'system:role:remove'"
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
          <el-empty description="暂无角色数据" :image-size="100" />
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

    <RoleFormDialog
      v-model="roleDialogVisible"
      :role="editingRole"
      @saved="fetchData"
    />
    <RolePermissionDialog
      v-model="permissionDialogVisible"
      :role="permissionRole"
      :permission-tree="permissionTree"
    />
    <RoleDataScopeDialog
      v-model="dataScopeDialogVisible"
      :role="dataScopeRole"
      :dept-tree="deptTree"
      @saved="fetchData"
    />
  </div>
</template>

<script setup lang="ts">
import RoleDataScopeDialog from './components/RoleDataScopeDialog.vue'
import RoleFormDialog from './components/RoleFormDialog.vue'
import RolePermissionDialog from './components/RolePermissionDialog.vue'
import { useRoleManagement } from './composables/useRoleManagement'

const {
  dataScopeDialogVisible,
  dataScopeRole,
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
  roleDialogVisible,
  tableData,
  total,
} = useRoleManagement()
</script>

<style scoped>
.table-card {
  margin-top: 12px;
}
</style>
