<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="角色名称">
          <el-input v-model="queryParams.name" placeholder="请输入角色名称" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="角色编码">
          <el-input v-model="queryParams.code" placeholder="请输入角色编码" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="角色状态" clearable style="width:120px">
            <el-option label="正常" value="1" />
            <el-option label="停用" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button v-perm="'system:role:list'" type="primary" icon="Search" @click="handleSearch">搜索</el-button>
          <el-button v-perm="'system:role:list'" icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span>角色列表</span>
          <div>
            <el-button v-perm="'system:role:export'" icon="Download" :loading="exportLoading" @click="handleExport">导出</el-button>
            <el-button v-perm="'system:role:add'" type="primary" icon="Plus" @click="handleAdd">新增</el-button>
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
            <el-tag :type="row.status === '1' ? 'success' : 'danger'">{{ row.status === '1' ? '正常' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" />
        <el-table-column label="操作" min-width="280" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="!isProtectedRole(row)" v-perm="'system:role:edit'" type="primary" link icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="!isProtectedRole(row)" v-perm="'system:role:edit'" type="warning" link icon="Key" @click="handleAssignPerms(row)">权限</el-button>
            <el-button v-if="!isProtectedRole(row)" v-perm="'system:role:edit'" type="success" link icon="DataAnalysis" @click="handleDataScope(row)">数据权限</el-button>
            <el-button v-if="!isProtectedRole(row)" v-perm="'system:role:remove'" type="danger" link icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.pageSize"
        :total="total" :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper" background
        @change="fetchData"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入角色名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="form.code" :disabled="dialog.isEdit" placeholder="请输入角色编码" maxlength="50" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item v-if="dialog.isEdit" label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="1">正常</el-radio>
            <el-radio value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button v-if="dialog.isEdit" v-perm="'system:role:edit'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
        <el-button v-else v-perm="'system:role:add'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分配权限弹窗 -->
    <el-dialog v-model="permDialog.visible" title="分配权限" width="550px" @close="permDialog.checkedKeys = []">
      <el-tree
        ref="permTreeRef"
        :data="permTree"
        :props="{ label: 'name', children: 'children' }"
        node-key="id"
        show-checkbox
        default-expand-all
        :default-checked-keys="permDialog.checkedKeys"
        @check="(_: any, { checkedKeys }: any) => permDialog.checkedKeys = checkedKeys"
      >
        <template #default="{ data }">
          <div class="perm-tree-node">
            <span>{{ data.name }}</span>
            <el-tag v-if="data.perm_type" :type="data.perm_type === 'api' ? 'info' : 'success'" size="small" style="margin-left:8px">
              {{ data.perm_type === 'api' ? 'API' : '菜单' }}
            </el-tag>
            <span v-if="data.code" style="color:#909399;font-size:12px;margin-left:8px">{{ data.code }}</span>
          </div>
        </template>
      </el-tree>
      <template #footer>
        <el-button @click="permDialog.visible = false">取消</el-button>
        <el-button v-perm="'system:role:edit'" type="primary" :loading="permDialog.loading" @click="handlePermSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 数据权限弹窗 -->
    <el-dialog v-model="dataScopeDialog.visible" title="设置数据权限" width="560px" @close="resetDataScopeDialog">
      <el-form label-width="110px">
        <el-form-item label="数据范围" required>
          <el-select v-model="dataScopeDialog.dataScope" style="width:100%">
            <el-option label="全部数据权限" value="1" />
            <el-option label="自定义数据权限" value="2" />
            <el-option label="本部门数据权限" value="3" />
            <el-option label="本部门及以下" value="4" />
            <el-option label="仅本人数据" value="5" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="dataScopeDialog.dataScope === '2'" label="自定义部门" required>
          <el-tree-select
            v-model="dataScopeDialog.deptIds"
            :data="deptTree"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="请选择部门"
            multiple check-strictly show-checkbox
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dataScopeDialog.visible = false">取消</el-button>
        <el-button v-perm="'system:role:edit'" type="primary" :loading="dataScopeDialog.loading" @click="handleDataScopeSubmit">确定</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import { listRole, getRole, createRole, updateRole, deleteRole, assignPerm, assignDept, updateRoleDataScope, exportRole } from '@/api/modules/role'
import { getDeptTree } from '@/api/modules/dept'
import { getPermissionTree, getRolePermissions } from '@/api/modules/permission'
import { usePermission } from '@/hooks/usePermission'
import { useDownload } from '@/hooks/useDownload'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const deptTree = ref<any[]>([])

const queryParams = ref({ page: 1, pageSize: 10, name: '', code: '', status: '' })
const { isAdmin } = usePermission()
const { downloading: exportLoading, downloadBlob } = useDownload()

function handleExport() {
  return downloadBlob(() => exportRole(queryParams.value), { filename: '角色数据.xlsx' })
}

function isProtectedRole(row: any) {
  return (row?.is_super === 1 || row?.code === 'admin') && !isAdmin()
}

function guardProtectedRole(row: any) {
  if (!isProtectedRole(row)) return true
  ElMessage.warning('禁止操作超级管理员角色')
  return false
}

async function fetchData() {
  loading.value = true
  try {
    const res = await listRole(queryParams.value)
    tableData.value = res.rows || []
    total.value = res.total || 0
  } finally { loading.value = false }
}

async function loadDeptTree() {
  const res = await getDeptTree()
  deptTree.value = ((res as any).data || (res as any).rows || [])
}

function handleSearch() { queryParams.value.page = 1; fetchData() }
function handleReset() { queryParams.value.name = ''; queryParams.value.code = ''; queryParams.value.status = ''; handleSearch() }

// ----- 新增/编辑 -----
const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const currentEditId = ref<number | null>(null)

const form = ref({ name: '', code: '', sort: 0, status: '1' })
const rules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
}

function resetForm() {
  form.value.name = ''; form.value.code = ''; form.value.sort = 0; form.value.status = '1'
  formRef.value?.clearValidate()
}

function handleAdd() {
  currentEditId.value = null
  dialog.value.title = '新增角色'; dialog.value.isEdit = false
  resetForm()
  dialog.value.visible = true
}

async function handleEdit(row:any) {
  if (!guardProtectedRole(row)) return
  currentEditId.value = row.id
  dialog.value.title = '编辑角色'; dialog.value.isEdit = true
  resetForm()
  const res = await getRole(row.id)
  const d = res.data || res
  form.value.name = d.name
  form.value.code = d.code
  form.value.sort = d.sort ?? 0
  form.value.status = d.status
  dialog.value.visible = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    if (dialog.value.isEdit) {
      await updateRole(currentEditId.value!, {
        name: form.value.name, sort: form.value.sort, status: form.value.status,
      })
      ElMessage.success('更新成功')
    } else {
      await createRole({ name: form.value.name, code: form.value.code, sort: form.value.sort } as any)
      ElMessage.success('新增成功')
    }
    dialog.value.visible = false
    await fetchData()
  } finally { submitLoading.value = false }
}

// ----- 删除 -----
async function handleDelete(row:any) {
  if (!guardProtectedRole(row)) return
  try {
    await ElMessageBox.confirm(`确认删除角色"${row.name}"吗？`, '警告', { type: 'warning' })
    await deleteRole(row.id)
    ElMessage.success('删除成功')
    await fetchData()
  } catch { /* cancelled */ }
}

// ----- 分配权限 -----
const permDialog = ref({ visible: false, loading: false, checkedKeys: [] as (number | string)[], roleId: 0 })
const permTreeRef = ref<any>()
const permTree = ref<any[]>([])

async function loadPermTree() {
  try {
    const res = await getPermissionTree() as any
    permTree.value = res.data || res.rows || res || []
  } catch { permTree.value = [] }
}

async function handleAssignPerms(row: any) {
  if (!guardProtectedRole(row)) return
  permDialog.value.roleId = row.id
  // 获取当前角色已分配的权限ID
  try {
    const res = await getRolePermissions(row.id) as any
    const ids = res.data || res || []
    permDialog.value.checkedKeys = Array.isArray(ids) ? ids : []
  } catch {
    permDialog.value.checkedKeys = []
  }
  permDialog.value.visible = true
  // 显式设置勾选状态（避免依赖 default-checked-keys 的首次渲染行为）
  await nextTick()
  permTreeRef.value?.setCheckedKeys(permDialog.value.checkedKeys)
}

async function handlePermSubmit() {
  permDialog.value.loading = true
  try {
    await assignPerm(permDialog.value.roleId, permDialog.value.checkedKeys)
    ElMessage.success('权限分配成功')
    permDialog.value.visible = false
  } finally { permDialog.value.loading = false }
}

// ----- 数据权限 -----
const dataScopeDialog = ref({
  visible: false,
  loading: false,
  roleId: '' as number | string,
  dataScope: '1',
  deptIds: [] as (number | string)[],
})

function resetDataScopeDialog() {
  dataScopeDialog.value.roleId = ''
  dataScopeDialog.value.dataScope = '1'
  dataScopeDialog.value.deptIds = []
}

async function handleDataScope(row: any) {
  if (!guardProtectedRole(row)) return
  const res = await getRole(row.id) as any
  const role = res.data || res
  dataScopeDialog.value.roleId = row.id
  dataScopeDialog.value.dataScope = role.data_scope || '1'
  dataScopeDialog.value.deptIds = role.dept_ids || []
  dataScopeDialog.value.visible = true
}

async function handleDataScopeSubmit() {
  if (dataScopeDialog.value.dataScope === '2' && dataScopeDialog.value.deptIds.length === 0) {
    ElMessage.warning('自定义数据权限至少选择一个部门')
    return
  }
  dataScopeDialog.value.loading = true
  try {
    await updateRoleDataScope(dataScopeDialog.value.roleId, dataScopeDialog.value.dataScope)
    await assignDept(
      dataScopeDialog.value.roleId,
      dataScopeDialog.value.dataScope === '2' ? dataScopeDialog.value.deptIds : [],
    )
    ElMessage.success('数据权限更新成功')
    dataScopeDialog.value.visible = false
    await fetchData()
  } finally {
    dataScopeDialog.value.loading = false
  }
}

onMounted(() => { fetchData(); loadDeptTree(); loadPermTree() })
</script>
