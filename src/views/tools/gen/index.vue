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
          <el-button v-perm="'tools:gen:list'" type="primary" icon="Search" @click="handleSearch">搜索</el-button>
          <el-button v-perm="'tools:gen:list'" icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span>代码生成</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="table_name" label="表名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="comment" label="表描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="字段数" width="100" align="center">
          <template #default="{ row }">{{ row.columns.length }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'tools:gen:list'" type="primary" link icon="View" @click="handlePreview(row)">预览</el-button>
            <el-button v-perm="'tools:gen:add'" type="success" link icon="Download" @click="handleGen(row)">生成</el-button>
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
import { generateCode, listTable, previewCode, type TableInfo } from '@/api/modules/tools'

const loading = ref(false)
const tableData = ref<TableInfo[]>([])
const total = ref(0)

const queryParams = ref({
  page: 1, page_size: 10, table_name: '', table_comment: '',
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

// ----- 预览 -----
const previewVisible = ref(false)
const previewTab = ref('')
const previewFiles = ref<{ name: string; content: string }[]>([])

async function handlePreview(row: TableInfo) {
  try {
    const res = await previewCode({ tables: [row.table_name] })
    previewFiles.value = (res.data || []).map(file => ({
      name: file.path,
      content: file.content,
    }))
    previewTab.value = previewFiles.value[0]?.name || ''
    previewVisible.value = true
  } catch { /* error handled */ }
}

// ----- 生成代码 -----
async function handleGen(row: TableInfo) {
  try {
    const res = await generateCode({ tables: [row.table_name] })
    if (!res.data) throw new Error('代码生成响应缺少数据')
    const { written, skipped } = res.data
    const message = skipped.length > 0
      ? `已写入 ${written.length} 个文件，跳过 ${skipped.length} 个已存在文件`
      : `已写入 ${written.length} 个文件`
    ElMessage.success(message)
  } catch { /* error handled */ }
}

onMounted(() => fetchData())
</script>
