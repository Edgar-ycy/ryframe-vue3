<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="参数名称">
          <el-input v-model="queryParams.name" placeholder="请输入参数名称" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="参数键名">
          <el-input v-model="queryParams.key" placeholder="请输入参数键名" clearable @keyup.enter="handleSearch" />
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
          <span>参数列表</span>
          <el-button v-permission="'system:config:add'" type="primary" icon="Plus" @click="handleAdd">新增</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="参数名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="key" label="参数键名" min-width="140" show-overflow-tooltip />
        <el-table-column prop="value" label="参数键值" min-width="120" show-overflow-tooltip />
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column prop="created_at" label="创建时间" />
        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-permission="'system:config:edit'" type="primary" link icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button v-permission="'system:config:remove'" type="danger" link icon="Delete" @click="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="参数名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入参数名称" />
        </el-form-item>
        <el-form-item label="参数键名" prop="key">
          <el-input v-model="form.key" :disabled="dialog.isEdit" placeholder="请输入参数键名" />
        </el-form-item>
        <el-form-item label="参数键值" prop="value">
          <el-input v-model="form.value" type="textarea" :rows="3" placeholder="请输入参数键值" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
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
import { listConfig, getConfig, createConfig, updateConfig, deleteConfig } from '@/api/modules/config'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const queryParams = ref({ page: 1, pageSize: 10, name: '', key: '' })

async function fetchData() {
  loading.value = true
  try {
    const res = await listConfig(queryParams.value)
    tableData.value = res.rows || []
    total.value = res.total || 0
  } finally { loading.value = false }
}

function handleSearch() { queryParams.value.page = 1; fetchData() }
function handleReset() { queryParams.value.name = ''; queryParams.value.key = ''; handleSearch() }

const dialog = ref({ visible: false, title: '', isEdit: false })
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const currentEditId = ref<number | null>(null)
const form = ref({ name: '', key: '', value: '', remark: '' })
const rules = {
  name: [{ required: true, message: '请输入参数名称', trigger: 'blur' }],
  key: [{ required: true, message: '请输入参数键名', trigger: 'blur' }],
  value: [{ required: true, message: '请输入参数键值', trigger: 'blur' }],
}

function resetForm() { form.value.name = ''; form.value.key = ''; form.value.value = ''; form.value.remark = ''; formRef.value?.clearValidate() }

function handleAdd() {
  currentEditId.value = null
  dialog.value.title = '新增参数'; dialog.value.isEdit = false
  resetForm(); dialog.value.visible = true
}

async function handleEdit(row) {
  currentEditId.value = row.id
  dialog.value.title = '编辑参数'; dialog.value.isEdit = true
  resetForm()
  const res = await getConfig(row.id)
  const d = res.data || res
  form.value.name = d.name; form.value.key = d.key
  form.value.value = d.value; form.value.remark = d.remark || ''
  dialog.value.visible = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    if (dialog.value.isEdit) {
      // 确保 value 是字符串类型（textarea 绑定的值始终是 string，此处防御）
      const payload = {
        name: form.value.name,
        value: String(form.value.value),
        remark: form.value.remark || undefined,
      }
      const res = await updateConfig(currentEditId.value!, payload as any) as any
      // 后端返回的数据与 payload 不一致时警告
      const updated = res?.data || res
      if (updated && updated.value !== payload.value) {
        console.warn('[Config] PUT 成功但返回 value 与请求不一致:', { sent: payload.value, returned: updated.value })
      }
      ElMessage.success('更新成功')
    } else {
      await createConfig({ name: form.value.name, key: form.value.key, value: String(form.value.value), remark: form.value.remark || undefined } as any)
      ElMessage.success('新增成功')
    }
    dialog.value.visible = false
    await fetchData()
  } catch (e: any) {
    console.error('[Config] 提交失败:', e)
  } finally { submitLoading.value = false }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除参数"${row.name}"吗？`, '警告', { type: 'warning' })
    await deleteConfig(row.id)
    ElMessage.success('删除成功'); fetchData()
  } catch { /* cancelled */ }
}

onMounted(() => fetchData())
</script>


