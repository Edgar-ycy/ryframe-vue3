<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>权限列表</span>
          <div>
            <el-button icon="Refresh" @click="fetchData">刷新</el-button>
          </div>
        </div>
      </template>

      <el-alert
        title="权限数据由 sys_permission 表驱动，用于 API 接口的细粒度权限校验。权限码通过角色→权限分配关联到用户。"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom:12px"
      />

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
        <el-table-column prop="code" label="权限编码" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag>{{ row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="perm_type" label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.perm_type === 'api' ? '' : 'success'" size="small">
              {{ row.perm_type === 'api' ? 'API' : '菜单' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="接口路径" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <code v-if="row.path" style="font-size:12px">{{ row.path }}</code>
            <span v-else style="color:#c0c4cc">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="http_method" label="HTTP方法" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="row.http_method"
              :type="httpMethodTag(row.http_method)"
              size="small"
              effect="dark"
            >
              {{ row.http_method }}
            </el-tag>
            <span v-else style="color:#c0c4cc">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="70" align="center" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">
              {{ row.status === '1' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { getPermissionTree, type PermissionTreeNode } from '@/api/modules/permission'
import { listToTree } from '@/utils/tree'
import type { TreeNode } from '@/utils/tree'

const loading = ref(false)
const tableData = ref<TreeNode[]>([])

async function fetchData() {
  loading.value = true
  try {
    const res = await getPermissionTree() as any
    const flatList = res.data || res.rows || res || []
    // Permission tree is already nested from backend, but listToTree handles flat data
    const tree = Array.isArray(flatList) && flatList.length > 0 && flatList[0].children !== undefined
      ? flatList  // already a tree
      : listToTree(flatList)
    tableData.value = tree
  } finally {
    loading.value = false
  }
}

function httpMethodTag(method: string): string {
  const map: Record<string, string> = {
    GET: 'success',
    POST: '',
    PUT: 'warning',
    DELETE: 'danger',
    PATCH: 'info',
  }
  return map[method.toUpperCase()] || 'info'
}

onMounted(() => fetchData())
</script>

<style scoped>
code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  color: #e6a23c;
}
</style>
