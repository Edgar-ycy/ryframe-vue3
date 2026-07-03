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
            <el-button v-perm="'system:perm:sync'" icon="RefreshRight" :loading="syncLoading" @click="handleSync">
              同步接口权限
            </el-button>
            <el-button v-perm="'system:perm:list'" icon="Refresh" @click="fetchData">刷新</el-button>
          </div>
        </div>
      </template>

      <el-alert
        v-if="syncReport"
        class="mb-12"
        :title="syncReportTitle"
        type="success"
        :closable="true"
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
            <el-button v-perm="'system:perm:add'" type="success" link icon="Plus" @click="handleAdd(row.id)">
              新增
            </el-button>
            <el-button v-perm="'system:perm:edit'" type="primary" link icon="Edit" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button v-perm="'system:perm:remove'" type="danger" link icon="Delete" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="520px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="上级权限">
          <el-tree-select
            v-model="form.parent_id"
            :data="parentTree"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="请选择上级权限"
            clearable
            check-strictly
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="权限名称" prop="name">
          <el-input v-model="form.name" maxlength="50" placeholder="请输入权限名称" />
        </el-form-item>
        <el-form-item label="权限编码" prop="code">
          <el-input v-model="form.code" maxlength="100" placeholder="例如 system:user:list" />
        </el-form-item>
        <el-form-item label="权限类型" prop="perm_type">
          <el-radio-group v-model="form.perm_type">
            <el-radio value="api">API</el-radio>
            <el-radio value="menu">菜单</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" maxlength="50" placeholder="可选" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="1">正常</el-radio>
            <el-radio value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button v-if="currentEditId" v-perm="'system:perm:edit'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
        <el-button v-else v-perm="'system:perm:add'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  createPermission,
  deletePermission,
  getPermissionTree,
  syncApiPermissions,
  updatePermission,
  type PermissionForm,
  type PermissionSyncReport,
  type PermissionTreeNode,
} from '@/api/modules/permission'
import { refreshAccessibleRoutes } from '@/router'
import { listToTree } from '@/utils/tree'
import type { TreeNode } from '@/utils/tree'

const loading = ref(false)
const submitLoading = ref(false)
const syncLoading = ref(false)
const tableData = ref<TreeNode[]>([])
const parentTree = ref<TreeNode[]>([])
const currentEditId = ref<number | string | null>(null)
const formRef = ref<FormInstance>()
const syncReport = ref<PermissionSyncReport | null>(null)
const syncReportTitle = computed(() => {
  if (!syncReport.value) return ''
  return syncReport.value.created > 0 ? '权限同步完成' : '权限同步完成，未发现新增项'
})

const dialog = ref({ visible: false, title: '' })
const form = ref<PermissionForm>({
  name: '',
  code: '',
  parent_id: null,
  perm_type: 'api',
  icon: '',
  sort: 0,
  status: '1',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入权限编码', trigger: 'blur' }],
  perm_type: [{ required: true, message: '请选择权限类型', trigger: 'change' }],
}

function normalizeTree(data: PermissionTreeNode[]) {
  if (Array.isArray(data) && data.length > 0 && data[0].children !== undefined) {
    return data as unknown as TreeNode[]
  }
  return listToTree(data)
}

async function fetchData() {
  loading.value = true
  try {
    const res = (await getPermissionTree()) as any
    const list = res.data || res.rows || res || []
    const tree = normalizeTree(list)
    tableData.value = tree
    parentTree.value = [{ id: 0, name: '根权限', children: tree }]
  } finally {
    loading.value = false
  }
}

function resetForm() {
  currentEditId.value = null
  form.value = {
    name: '',
    code: '',
    parent_id: null,
    perm_type: 'api',
    icon: '',
    sort: 0,
    status: '1',
  }
  formRef.value?.clearValidate()
}

function handleAdd(parentId?: number | string) {
  resetForm()
  form.value.parent_id = parentId ?? null
  dialog.value.title = '新增权限'
  dialog.value.visible = true
}

function handleEdit(row: PermissionTreeNode) {
  resetForm()
  currentEditId.value = row.id
  form.value = {
    name: row.name,
    code: row.code,
    parent_id: row.parent_id ?? null,
    perm_type: row.perm_type || 'api',
    icon: row.icon || '',
    sort: row.sort ?? 0,
    status: row.status || '1',
  }
  dialog.value.title = '编辑权限'
  dialog.value.visible = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    const payload = {
      ...form.value,
      parent_id: form.value.parent_id === 0 ? null : form.value.parent_id,
    }
    if (currentEditId.value) {
      await updatePermission(currentEditId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createPermission(payload)
      ElMessage.success('新增成功')
    }
    dialog.value.visible = false
    await fetchData()
    await refreshAccessibleRoutes()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: PermissionTreeNode) {
  await ElMessageBox.confirm(`确认删除权限"${row.name}"吗？`, '警告', { type: 'warning' })
  await deletePermission(row.id)
  ElMessage.success('删除成功')
  await fetchData()
  await refreshAccessibleRoutes()
}

async function handleSync() {
  syncLoading.value = true
  try {
    const res = (await syncApiPermissions()) as any
    syncReport.value = res.data || res
    ElMessage.success(`同步成功，新增 ${syncReport.value?.created ?? 0} 条`)
    await fetchData()
    await refreshAccessibleRoutes()
  } finally {
    syncLoading.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.mb-12 {
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
