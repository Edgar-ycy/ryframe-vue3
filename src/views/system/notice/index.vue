<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="公告标题">
          <el-input v-model="queryParams.title" placeholder="请输入标题" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="queryParams.notice_type" placeholder="公告类型" clearable style="width:120px">
            <el-option label="通知" value="1" />
            <el-option label="公告" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="状态" clearable style="width:100px">
            <el-option label="正常" value="1" />
            <el-option label="关闭" value="2" />
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
          <span>通知公告</span>
          <el-button v-permission="'system:notice:create'" type="primary" icon="Plus" @click="handleAdd">新增</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.notice_type === '1' ? 'primary' : 'warning'" size="small">{{ row.notice_type === '1' ? '通知' : '公告' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{ row.status === '1' ? '正常' : '关闭' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-permission="'system:notice:update'" type="primary" link icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button v-permission="'system:notice:delete'" type="danger" link icon="Delete" @click="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="600px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="公告标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入公告标题" />
        </el-form-item>
        <el-form-item label="公告类型">
          <el-select v-model="form.notice_type" style="width:100%">
            <el-option label="通知" value="1" />
            <el-option label="公告" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="6" placeholder="请输入公告内容" />
        </el-form-item>
        <el-form-item v-if="dialog.isEdit" label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="1">正常</el-radio>
            <el-radio value="2">关闭</el-radio>
          </el-radio-group>
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
import { listNotice, getNotice, createNotice, updateNotice, deleteNotice } from '@/api/modules/notice'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const queryParams = ref({ page: 1, pageSize: 10, title: '', notice_type: '', status: '' })

async function fetchData() {
  loading.value = true
  try {
    const res = await listNotice(queryParams.value)
    tableData.value = res.rows || []
    total.value = res.total || 0
  } finally { loading.value = false }
}

function handleSearch() { queryParams.value.page = 1; fetchData() }
function handleReset() { queryParams.value.title = ''; queryParams.value.notice_type = ''; queryParams.value.status = ''; handleSearch() }

const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const currentEditId = ref<number | null>(null)
const form = ref({ title: '', notice_type: '1', content: '', status: '1' })
const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
}

function resetForm() { form.value.title = ''; form.value.notice_type = '1'; form.value.content = ''; form.value.status = '1'; formRef.value?.clearValidate() }

function handleAdd() {
  currentEditId.value = null
  dialog.value.title = '新增公告'; dialog.value.isEdit = false
  resetForm(); dialog.value.visible = true
}

async function handleEdit(row) {
  currentEditId.value = row.id
  dialog.value.title = '编辑公告'; dialog.value.isEdit = true
  resetForm()
  const res = await getNotice(row.id)
  const d = res.data || res
  form.value.title = d.title; form.value.notice_type = d.notice_type || '1'
  form.value.content = d.content; form.value.status = d.status
  dialog.value.visible = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    const data = { title: form.value.title, content: form.value.content, notice_type: form.value.notice_type || undefined }
    if (dialog.value.isEdit) {
      await updateNotice(currentEditId.value!, { ...data, status: form.value.status } as any)
      ElMessage.success('更新成功')
    } else {
      await createNotice(data as any)
      ElMessage.success('新增成功')
    }
    dialog.value.visible = false; fetchData()
  } finally { submitLoading.value = false }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除公告"${row.title}"吗？`, '警告', { type: 'warning' })
    await deleteNotice(row.id)
    ElMessage.success('删除成功'); fetchData()
  } catch { /* cancelled */ }
}

onMounted(() => fetchData())
</script>

<style scoped>
.search-card :deep(.el-form-item) { margin-bottom: 0 }
.card-header { display: flex; justify-content: space-between; align-items: center }
</style>
