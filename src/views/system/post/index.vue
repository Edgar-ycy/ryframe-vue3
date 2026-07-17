<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="岗位名称">
          <el-input v-model="queryParams.name" placeholder="请输入岗位名称" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="岗位编码">
          <el-input v-model="queryParams.code" placeholder="请输入岗位编码" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="岗位状态" clearable style="width:120px">
            <el-option label="正常" value="1" />
            <el-option label="停用" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button v-perm="'system:post:list'" type="primary" icon="Search" @click="handleSearch">搜索</el-button>
          <el-button v-perm="'system:post:list'" icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span>岗位列表</span>
          <div>
            <el-button v-perm="'system:post:export'" icon="Download" :loading="exportLoading" @click="handleExport">导出</el-button>
            <el-button v-perm="'system:post:add'" type="primary" icon="Plus" @click="handleAdd">新增</el-button>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="岗位名称" min-width="130" show-overflow-tooltip />
        <el-table-column prop="code" label="岗位编码" />
        <el-table-column prop="sort" label="排序" align="center" />
        <el-table-column prop="status" label="状态" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{ row.status === '1' ? '正常' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" />
        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'system:post:edit'" type="primary" link icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button v-perm="'system:post:remove'" type="danger" link icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.page_size"
        :total="total" :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper" background
        @change="fetchData"
      />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="480px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="岗位名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入岗位名称" />
        </el-form-item>
        <el-form-item label="岗位编码" prop="code">
          <el-input v-model="form.code" :disabled="dialog.isEdit" placeholder="请输入岗位编码" />
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
        <el-button v-if="dialog.isEdit" v-perm="'system:post:edit'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
        <el-button v-else v-perm="'system:post:add'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  listPost,
  getPost,
  createPost,
  updatePost,
  deletePost,
  exportPost,
  type PostRecord,
} from '@/api/modules/post'
import { useDownload } from '@/hooks/useDownload'
import type { Id } from '@/shared/http/types'

const loading = ref(false)
const tableData = ref<PostRecord[]>([])
const total = ref(0)
const queryParams = ref({ page: 1, page_size: 10, name: '', code: '', status: '' })
const { downloading: exportLoading, downloadBlob } = useDownload()

function handleExport() {
  return downloadBlob(() => exportPost(queryParams.value), { filename: '岗位数据.xlsx' })
}

async function fetchData() {
  loading.value = true
  try {
    const res = await listPost(queryParams.value)
    tableData.value = res.rows || []
    total.value = res.total || 0
  } finally { loading.value = false }
}

function handleSearch() { queryParams.value.page = 1; fetchData() }
function handleReset() { queryParams.value.name = ''; queryParams.value.code = ''; queryParams.value.status = ''; handleSearch() }

const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const currentEditId = ref<Id | null>(null)
const form = ref({ name: '', code: '', sort: 0, status: '1' })
const rules = {
  name: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入岗位编码', trigger: 'blur' }],
}

function resetForm() { form.value.name = ''; form.value.code = ''; form.value.sort = 0; form.value.status = '1'; formRef.value?.clearValidate() }

function handleAdd() {
  currentEditId.value = null
  dialog.value.title = '新增岗位'; dialog.value.isEdit = false
  resetForm(); dialog.value.visible = true
}

async function handleEdit(row: PostRecord) {
  currentEditId.value = row.id
  dialog.value.title = '编辑岗位'; dialog.value.isEdit = true
  resetForm()
  const res = await getPost(row.id)
  if (!res.data) throw new Error('岗位详情响应缺少数据')
  const d = res.data
  form.value.name = d.name; form.value.code = d.code
  form.value.sort = d.sort ?? 0; form.value.status = d.status
  dialog.value.visible = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    if (dialog.value.isEdit) {
      await updatePost(currentEditId.value!, {
        name: form.value.name,
        sort: form.value.sort,
        status: form.value.status,
      })
      ElMessage.success('更新成功')
    } else {
      await createPost({ name: form.value.name, code: form.value.code, sort: form.value.sort })
      ElMessage.success('新增成功')
    }
    dialog.value.visible = false; fetchData()
  } finally { submitLoading.value = false }
}

async function handleDelete(row: PostRecord) {
  try {
    await ElMessageBox.confirm(`确认删除岗位"${row.name}"吗？`, '警告', { type: 'warning' })
    await deletePost(row.id)
    ElMessage.success('删除成功'); fetchData()
  } catch { /* cancelled */ }
}

onMounted(() => fetchData())
</script>
