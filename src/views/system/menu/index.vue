<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ t('system.menu.list') }}</span>
          <el-button v-perm="'system:menu:add'" type="primary" icon="Plus" @click="handleAdd()">
            {{ t('system.common.add') }}
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
        <el-table-column prop="name" :label="t('system.menu.name')" min-width="150" show-overflow-tooltip />
        <el-table-column :label="t('system.common.type')" align="center">
          <template #default="{ row }">
            <el-tag :type="menuTypeTag(row.menu_type)" size="small">
              {{ menuTypeLabel(row.menu_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('system.menu.icon')" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.icon" :size="18">
              <component :is="resolveElementIcon(row.icon)" />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column :label="t('system.menu.linkedPermission')" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ permissionLabel(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="sort" :label="t('system.common.sort')" align="center" />
        <el-table-column prop="visible" :label="t('system.menu.visible')" align="center">
          <template #default="{ row }">
            <el-tag :type="row.visible ? 'success' : 'info'" size="small">
              {{ row.visible ? t('system.common.yes') : t('system.common.no') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="t('system.common.status')" align="center">
          <template #default="{ row }">
            <el-switch
              v-if="hasPermission('system:menu:edit')"
              v-model="row.status"
              active-value="1"
              inactive-value="0"
              :loading="statusUpdatingId === row.id"
              :disabled="statusUpdatingId !== null"
              @change="(value: string) => handleChangeStatus(row, value)"
            />
            <el-tag v-else :type="row.status === '1' ? 'success' : 'danger'" size="small">
              {{ row.status === '1' ? t('system.common.normal') : t('system.common.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('system.common.actions')" min-width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-perm="'system:menu:add'"
              type="success"
              link
              icon="Plus"
              @click="handleAdd(row.id)"
            >
              {{ t('system.common.add') }}
            </el-button>
            <el-button
              v-perm="'system:menu:edit'"
              type="primary"
              link
              icon="Edit"
              @click="handleEdit(row)"
            >
              {{ t('system.common.edit') }}
            </el-button>
            <el-button
              v-perm="'system:menu:remove'"
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
          <el-empty :description="t('system.menu.noData')" :image-size="100" />
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
import { useI18n } from 'vue-i18n'
import MenuFormDialog from './components/MenuFormDialog.vue'
import { useMenuManagement } from './composables/useMenuManagement'
import { resolveElementIcon } from '@/shared/ui/icons'

const { t } = useI18n()

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
  statusUpdatingId,
  tableData,
} = useMenuManagement()
</script>
