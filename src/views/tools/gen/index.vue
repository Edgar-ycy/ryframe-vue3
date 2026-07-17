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
            <el-button v-perm="'tools:gen:add'" type="success" link icon="FolderAdd" @click="handleGen(row)">生成</el-button>
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

    <el-dialog
      v-model="generateVisible"
      title="生成代码"
      width="min(520px, calc(100vw - 32px))"
      :close-on-click-modal="!generating"
      :close-on-press-escape="!generating"
      :show-close="!generating"
      @closed="resetGenerateForm"
    >
      <el-form
        ref="generateFormRef"
        :model="generateForm"
        :rules="generateRules"
        label-width="110px"
        @submit.prevent
      >
        <el-form-item label="数据表">
          <el-input :model-value="selectedTable?.table_name || ''" disabled />
        </el-form-item>
        <el-form-item label="服务端输出目录" prop="output_dir">
          <el-input
            v-model="generateForm.output_dir"
            prefix-icon="FolderOpened"
            placeholder="请输入绝对路径"
            clearable
            autofocus
            @keyup.enter="submitGeneration"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="generating" @click="generateVisible = false">取消</el-button>
        <el-button
          v-perm="'tools:gen:add'"
          type="primary"
          icon="MagicStick"
          :loading="generating"
          @click="submitGeneration"
        >
          生成
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { generateCode, listTable, previewCode, type TableInfo } from '@/api/modules/tools'
import { buildGenerateRequest, isAbsoluteOutputPath } from './generationForm'

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
const generateVisible = ref(false)
const generateFormRef = ref<FormInstance>()
const generating = ref(false)
const selectedTable = ref<TableInfo | null>(null)
const generateForm = reactive({ output_dir: '' })
const generateRules: FormRules = {
  output_dir: [
    { required: true, whitespace: true, message: '请输入服务端输出目录', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (isAbsoluteOutputPath(String(value || ''))) {
          callback()
        } else {
          callback(new Error('请输入后端服务所在机器的绝对路径'))
        }
      },
      trigger: ['blur', 'change'],
    },
  ],
}

function handleGen(row: TableInfo) {
  selectedTable.value = row
  generateForm.output_dir = ''
  generateVisible.value = true
  nextTick(() => generateFormRef.value?.clearValidate())
}

function resetGenerateForm() {
  selectedTable.value = null
  generateForm.output_dir = ''
  generateFormRef.value?.clearValidate()
}

async function submitGeneration() {
  const valid = await generateFormRef.value?.validate().catch(() => false)
  if (!valid || !selectedTable.value) return

  generating.value = true
  try {
    const request = buildGenerateRequest(selectedTable.value.table_name, generateForm.output_dir)
    const res = await generateCode(request)
    if (!res.data) throw new Error('代码生成响应缺少数据')
    const { written, skipped } = res.data
    const message = skipped.length > 0
      ? `已写入 ${written.length} 个文件，跳过 ${skipped.length} 个已存在文件`
      : `已写入 ${written.length} 个文件`
    generateVisible.value = false
    ElMessage.success(message)
  } catch {
    // 请求错误由 HTTP 层统一展示。
  } finally {
    generating.value = false
  }
}

onMounted(() => fetchData())
</script>
