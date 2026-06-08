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
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="table_name" label="表名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="table_comment" label="表描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="class_name" label="实体类" min-width="160" show-overflow-tooltip />
        <el-table-column prop="created_at" label="创建时间" />
        <el-table-column prop="updated_at" label="更新时间" />
        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link icon="View" @click="handlePreview(row)">预览</el-button>
            <el-button type="success" link icon="Download" @click="handleGen(row)">生成</el-button>
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
import { listTable, previewCode, generateCode } from '@/api/modules/tools'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)

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

// ----- 预览 -----
const previewVisible = ref(false)
const previewTab = ref('')
const previewFiles = ref<{ name: string; content: string }[]>([])

async function handlePreview(row: any) {
  try {
    const res = await previewCode({ table_name: row.table_name }) as any
    const data = res.data || res
    previewFiles.value = Object.entries(data).map(([name, content]) => ({
      name: name as string,
      content: content as string,
    }))
    previewTab.value = previewFiles.value[0]?.name || ''
    previewVisible.value = true
  } catch { /* error handled */ }
}

// ----- 生成代码 -----
async function handleGen(row: any) {
  try {
    await generateCode({ table_name: row.table_name })
    ElMessage.success('代码生成成功')
  } catch { /* error handled */ }
}

onMounted(() => fetchData())
</script>


