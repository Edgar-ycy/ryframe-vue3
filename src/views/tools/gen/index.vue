<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item label="表名称">
          <el-input v-model="queryParams.table_name" placeholder="请输入表名称" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="表描述">
          <el-input v-model="queryParams.table_comment" placeholder="请输入表描述" clearable @keyup.enter="handleSearch" />
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
          <span>代码生成</span>
          <div>
            <el-button type="danger" :disabled="!selectNames.length" icon="Delete" @click="handleBatchDelete">批量删除</el-button>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column prop="table_name" label="表名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="table_comment" label="表描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="class_name" label="实体类" min-width="140" show-overflow-tooltip />
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column prop="updated_at" label="更新时间" width="170" />
        <el-table-column label="操作" width="280" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link icon="View" @click="handlePreview(row)">预览</el-button>
            <el-button type="primary" link icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link icon="Delete" @click="handleDelete(row)">删除</el-button>
            <el-dropdown @command="(cmd: string) => handleGen(row, cmd)" style="margin-left:4px">
              <el-button type="success" link icon="Download">生成代码</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="zip">下载 ZIP</el-dropdown-item>
                  <el-dropdown-item command="custom">自定义路径</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" title="代码预览" width="800px" top="5vh">
      <el-tabs v-model="previewTab" type="card">
        <el-tab-pane v-for="file in previewFiles" :key="file.name" :label="file.name" :name="file.name">
          <el-input
            :model-value="file.content"
            type="textarea"
            :rows="20"
            readonly
            style="font-family:monospace;font-size:12px"
          />
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { listTable, previewCode, downloadCode, deleteTable } from '@/api/modules/tools'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const selectNames = ref<string[]>([])

const queryParams = ref({
  page: 1, pageSize: 10, table_name: '', table_comment: '',
})

async function fetchData() {
  loading.value = true
  try {
    const res = await listTable(queryParams.value)
    tableData.value = res.rows || []
    total.value = res.total || 0
  } finally { loading.value = false }
}

function handleSearch() { queryParams.value.page = 1; fetchData() }
function handleReset() { queryParams.value.table_name = ''; queryParams.value.table_comment = ''; handleSearch() }

function handleSelectionChange(rows: any[]) {
  selectNames.value = rows.map(r => r.table_name)
}

// ----- 预览 -----
const previewVisible = ref(false)
const previewTab = ref('')
const previewFiles = ref<{ name: string; content: string }[]>([])

async function handlePreview(row: any) {
  try {
    const res = await previewCode(row.table_name)
    const data = res.data || res
    // 后端返回 { 'entity.java': '...', 'mapper.java': '...', ... }
    previewFiles.value = Object.entries(data).map(([name, content]) => ({
      name: name as string,
      content: content as string,
    }))
    previewTab.value = previewFiles.value[0]?.name || ''
    previewVisible.value = true
  } catch { /* error handled */ }
}

// ----- 生成代码 -----
function handleGen(row: any, _type: string) {
  // 调用下载接口
  downloadCode(row.table_name).then(res => {
    const blob = new Blob([res as any], { type: 'application/zip' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${row.table_name}.zip`
    a.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  }).catch(() => { /* error handled */ })
}

// ----- 编辑（进入详情配置页）-----
function handleEdit(row: any) {
  ElMessage.info(`编辑功能待实现: ${row.table_name}`)
}

// ----- 删除 -----
async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除表"${row.table_name}"的生成配置吗？`, '警告', { type: 'warning' })
    await deleteTable(row.table_name)
    ElMessage.success('删除成功'); fetchData()
  } catch { /* cancelled */ }
}

async function handleBatchDelete() {
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectNames.value.length} 个表吗？`, '警告', { type: 'warning' })
    for (const name of selectNames.value) {
      await deleteTable(name)
    }
    ElMessage.success('删除成功'); fetchData()
  } catch { /* cancelled */ }
}

onMounted(() => fetchData())
</script>

<style scoped>
.search-card :deep(.el-form-item) { margin-bottom: 0 }
.card-header { display: flex; justify-content: space-between; align-items: center }
</style>
