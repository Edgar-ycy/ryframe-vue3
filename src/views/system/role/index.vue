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
            <el-option label="禁用" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">搜索</el-button>
          <el-button icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span>角色列表</span>
          <div>
            <el-button v-permission="'system:role:create'" type="primary" icon="Plus" @click="handleAdd">新增</el-button>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="name" label="角色名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="code" label="角色编码" width="120" />
        <el-table-column prop="sort" label="排序" width="70" align="center" />
        <el-table-column prop="data_scope" label="数据范围" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.data_scope === '1'" type="success">全部</el-tag>
            <el-tag v-else-if="row.data_scope === '2'" type="warning">自定义</el-tag>
            <el-tag v-else-if="row.data_scope === '3'">本部门</el-tag>
            <el-tag v-else-if="row.data_scope === '4'" type="info">本部门及以下</el-tag>
            <el-tag v-else type="danger">仅本人</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'">{{ row.status === '1' ? '正常' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-permission="'system:role:update'" type="primary" link icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button v-permission="'system:role:delete'" type="danger" link icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.pageSize"
        :total="total" :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper" background
        style="margin-top:16px;justify-content:flex-end"
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
            <el-radio value="2">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="数据范围">
          <el-select v-model="form.data_scope" style="width:100%">
            <el-option label="全部数据权限" value="1" />
            <el-option label="自定义数据权限" value="2" />
            <el-option label="本部门数据权限" value="3" />
            <el-option label="本部门及以下" value="4" />
            <el-option label="仅本人数据" value="5" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.data_scope === '2'" label="选择部门">
          <el-tree-select
            v-model="form.dept_ids"
            :data="deptTree"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="请选择部门"
            multiple check-strictly show-checkbox
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { listRole, getRole, createRole, updateRole, deleteRole } from '@/api/modules/role'
import { listDept } from '@/api/modules/dept'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const deptTree = ref([])

const queryParams = ref({ page: 1, pageSize: 10, name: '', code: '', status: '' })

async function fetchData() {
  loading.value = true
  try {
    const res = await listRole(queryParams.value)
    tableData.value = res.rows || []
    total.value = res.total || 0
  } finally { loading.value = false }
}

async function loadDeptTree() {
  const res = await listDept()
  deptTree.value = (res.rows || [])
}

function handleSearch() { queryParams.value.page = 1; fetchData() }
function handleReset() { queryParams.value.name = ''; queryParams.value.code = ''; queryParams.value.status = ''; handleSearch() }

// ----- 新增/编辑 -----
const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const currentEditId = ref<number | null>(null)

const form = ref({ name: '', code: '', sort: 0, status: '1', data_scope: '1', dept_ids: [] })
const rules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
}

function resetForm() {
  form.value.name = ''; form.value.code = ''; form.value.sort = 0; form.value.status = '1'; form.value.data_scope = '1'; form.value.dept_ids = []
  formRef.value?.clearValidate()
}

function handleAdd() {
  currentEditId.value = null
  dialog.value.title = '新增角色'; dialog.value.isEdit = false
  resetForm()
  dialog.value.visible = true
}

async function handleEdit(row) {
  currentEditId.value = row.id
  dialog.value.title = '编辑角色'; dialog.value.isEdit = true
  resetForm()
  const res = await getRole(row.id)
  const d = res.data || res
  form.value.name = d.name
  form.value.code = d.code
  form.value.sort = d.sort ?? 0
  form.value.status = d.status
  form.value.data_scope = d.data_scope || '1'
  form.value.dept_ids = d.dept_ids || []
  dialog.value.visible = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    if (dialog.value.isEdit) {
      await updateRole(currentEditId.value!, {
        name: form.value.name, sort: form.value.sort, status: form.value.status, data_scope: form.value.data_scope,
      })
      ElMessage.success('更新成功')
    } else {
      await createRole({ name: form.value.name, code: form.value.code, sort: form.value.sort, data_scope: form.value.data_scope } as any)
      ElMessage.success('新增成功')
    }
    dialog.value.visible = false
    fetchData()
  } finally { submitLoading.value = false }
}

// ----- 删除 -----
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除角色"${row.name}"吗？`, '警告', { type: 'warning' })
    await deleteRole(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch { /* cancelled */ }
}

onMounted(() => { fetchData(); loadDeptTree() })
</script>

<style scoped>
.search-card :deep(.el-form-item) { margin-bottom: 0 }
.card-header { display: flex; justify-content: space-between; align-items: center }
</style>
