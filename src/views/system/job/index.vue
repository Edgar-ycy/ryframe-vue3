<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="任务名称">
          <el-input v-model="queryParams.name" placeholder="请输入任务名称" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="任务组">
          <el-select v-model="queryParams.group_name" placeholder="任务组" clearable style="width:140px">
            <el-option label="system" value="system" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="状态" clearable style="width:100px">
            <el-option label="正常" value="1" />
            <el-option label="暂停" value="0" />
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
          <span>定时任务</span>
          <div>
            <el-button v-permission="'system:job:add'" type="primary" icon="Plus" @click="handleAdd">新增</el-button>
            <el-button icon="Tickets" @click="$router.push('/system/job/log')">调度日志</el-button>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="任务名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="group_name" label="任务组" />
        <el-table-column prop="cron_expr" label="Cron 表达式" show-overflow-tooltip />
        <el-table-column prop="misfire_policy" label="错过策略" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.misfire_policy === '1'" size="small">立即执行</el-tag>
            <el-tag v-else-if="row.misfire_policy === '2'" type="warning" size="small">执行一次</el-tag>
            <el-tag v-else type="danger" size="small">放弃执行</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="concurrent" label="并发" align="center">
          <template #default="{ row }">
            <el-tag :type="row.concurrent === '1' ? '' : 'info'" size="small">{{ row.concurrent === '1' ? '允许' : '禁止' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{ row.status === '1' ? '正常' : '暂停' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" />
        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-permission="'system:job:edit'" type="primary" link icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="row.status === '1'" type="warning" link icon="VideoPause" @click="handlePause(row)">暂停</el-button>
            <el-button v-else type="success" link icon="VideoPlay" @click="handleResume(row)">恢复</el-button>
            <el-button type="info" link icon="CaretRight" @click="handleRun(row)">执行</el-button>
            <el-button v-permission="'system:job:remove'" type="danger" link icon="Delete" @click="handleDelete(row)">删除</el-button>
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
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="580px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入任务名称" maxlength="64" />
        </el-form-item>
        <el-form-item label="任务组" prop="group_name">
          <el-select v-model="form.group_name" placeholder="请选择任务组" style="width:100%">
            <el-option label="system" value="system" />
          </el-select>
        </el-form-item>
        <el-form-item label="Cron 表达式" prop="cron_expr">
          <el-input v-model="form.cron_expr" placeholder="如 0 0 3 * * *" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
        <el-form-item label="错过策略">
          <el-select v-model="form.misfire_policy" style="width:100%">
            <el-option label="立即执行" value="1" />
            <el-option label="执行一次" value="2" />
            <el-option label="放弃执行" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="dialog.isEdit" label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="1">正常</el-radio>
            <el-radio value="0">暂停</el-radio>
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
import {
  listJob, getJob, createJob, updateJob, deleteJob,
  runJob, pauseJob, resumeJob,
} from '@/api/modules/job'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)

const queryParams = ref({
  page: 1, pageSize: 10, name: '', group_name: '', status: '',
})

async function fetchData() {
  loading.value = true
  try {
    const res = await listJob(queryParams.value)
    tableData.value = res.rows || []
    total.value = res.total || 0
  } finally { loading.value = false }
}

function handleSearch() { queryParams.value.page = 1; fetchData() }
function handleReset() { queryParams.value.name = ''; queryParams.value.group_name = ''; queryParams.value.status = ''; handleSearch() }

// ----- 新增/编辑 -----
const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const currentEditId = ref<number | null>(null)

const form = ref({
  name: '', group_name: 'DEFAULT', cron_expr: '',
  misfire_policy: '1', concurrent: '1', status: '1', remark: '',
})

const rules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  group_name: [{ required: true, message: '请选择任务组', trigger: 'change' }],
  cron_expr: [{ required: true, message: '请输入 Cron 表达式', trigger: 'blur' }],
}

function resetForm() {
  form.value = { name: '', group_name: 'DEFAULT', cron_expr: '', misfire_policy: '1', concurrent: '1', status: '1', remark: '' }
  formRef.value?.clearValidate()
}

function handleAdd() {
  currentEditId.value = null
  dialog.value.title = '新增任务'; dialog.value.isEdit = false
  resetForm(); dialog.value.visible = true
}

async function handleEdit(row) {
  currentEditId.value = row.id
  dialog.value.title = '编辑任务'; dialog.value.isEdit = true
  resetForm()
  const res = await getJob(row.id)
  const d = res.data || res
  form.value.name = d.name || d.job_name; form.value.group_name = d.group_name || d.job_group
  form.value.cron_expr = d.cron_expr || d.cron_expression
  form.value.misfire_policy = d.misfire_policy ?? '1'; form.value.concurrent = d.concurrent ?? '1'
  form.value.status = d.status; form.value.remark = d.remark || ''
  dialog.value.visible = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    const data = {
      name: form.value.name, group_name: form.value.group_name,
      cron_expr: form.value.cron_expr,
      misfire_policy: form.value.misfire_policy, concurrent: form.value.concurrent,
      remark: form.value.remark || undefined,
    }
    if (dialog.value.isEdit) {
      await updateJob(currentEditId.value!, { ...data, status: form.value.status } as any)
      ElMessage.success('更新成功')
    } else {
      await createJob(data as any)
      ElMessage.success('新增成功')
    }
    dialog.value.visible = false; fetchData()
  } finally { submitLoading.value = false }
}

// ----- 操作 -----
async function handleRun(row) {
  try {
    await ElMessageBox.confirm(`确认立即执行任务"${row.name || row.job_name}"吗？`, '提示', { type: 'info' })
    await runJob(row.id)
    ElMessage.success('执行成功')
  } catch { /* cancelled */ }
}

async function handlePause(row) {
  try {
    await ElMessageBox.confirm(`确认暂停任务"${row.name || row.job_name}"吗？`, '提示', { type: 'warning' })
    await pauseJob(row.id)
    ElMessage.success('已暂停')
    fetchData()
  } catch { /* cancelled */ }
}

async function handleResume(row) {
  try {
    await resumeJob(row.id)
    ElMessage.success('已恢复')
    fetchData()
  } catch { /* error handled */ }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除任务"${row.name || row.job_name}"吗？`, '警告', { type: 'warning' })
    await deleteJob(row.id)
    ElMessage.success('删除成功'); fetchData()
  } catch { /* cancelled */ }
}

onMounted(() => fetchData())
</script>


