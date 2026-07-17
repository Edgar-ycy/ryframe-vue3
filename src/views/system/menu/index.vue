<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>菜单列表</span>
          <el-button v-perm="'system:menu:add'" type="primary" icon="Plus" @click="handleAdd()">
            新增
          </el-button>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        row-key="id"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
        <el-table-column prop="name" label="菜单名称" min-width="150" show-overflow-tooltip />
        <el-table-column label="类型" align="center">
          <template #default="{ row }">
            <el-tag :type="menuTypeTag(row.menu_type)" size="small">
              {{ menuTypeLabel(row.menu_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="图标" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.icon" :size="18">
              <component :is="row.icon" />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column label="关联权限" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ permissionLabel(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" align="center" />
        <el-table-column prop="visible" label="可见" align="center">
          <template #default="{ row }">
            <el-tag :type="row.visible ? 'success' : 'info'" size="small">
              {{ row.visible ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" align="center">
          <template #default="{ row }">
            <el-switch
              v-if="hasPermission('system:menu:edit')"
              v-model="row.status"
              active-value="1"
              inactive-value="0"
              @change="(value: string) => handleChangeStatus(row, value)"
            />
            <el-tag v-else :type="row.status === '1' ? 'success' : 'danger'" size="small">
              {{ row.status === '1' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-perm="'system:menu:add'"
              type="success"
              link
              icon="Plus"
              @click="handleAdd(row.id)"
            >
              新增
            </el-button>
            <el-button
              v-perm="'system:menu:edit'"
              type="primary"
              link
              icon="Edit"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-perm="'system:menu:remove'"
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
          <el-empty description="暂无菜单数据" :image-size="100" />
        </template>
      </el-table>
    </el-card>

    <MenuFormDialog
      v-model="dialogVisible"
      :menu="editingMenu"
      :parent-id="parentMenuId"
      :menu-tree="tableData"
      :permission-options="permissionOptions"
      @saved="fetchData"
    />
  </div>
</template>

<script setup lang="ts">
import MenuFormDialog from './components/MenuFormDialog.vue'
import { useMenuManagement } from './composables/useMenuManagement'

const {
  deletingId,
  dialogVisible,
  editingMenu,
  fetchData,
  handleAdd,
  handleChangeStatus,
  handleDelete,
  handleEdit,
  hasPermission,
  loading,
  menuTypeLabel,
  menuTypeTag,
  parentMenuId,
  permissionLabel,
  permissionOptions,
  tableData,
} = useMenuManagement()
</script>
