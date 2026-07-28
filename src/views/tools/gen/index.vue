<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item :label="t('tools.generator.tableName')">
          <el-input v-model="queryParams.table_name" :placeholder="t('tools.generator.tableNamePlaceholder')" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item :label="t('tools.generator.tableDescription')">
          <el-input v-model="queryParams.table_comment" :placeholder="t('tools.generator.tableDescriptionPlaceholder')" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button v-perm="'tools:gen:list'" type="primary" icon="Search" @click="handleSearch">{{ t('tools.generator.search') }}</el-button>
          <el-button v-perm="'tools:gen:list'" icon="Refresh" @click="handleReset">{{ t('tools.generator.reset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span>{{ t('tools.generator.title') }}</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border stripe>
        <el-table-column prop="table_name" :label="t('tools.generator.tableName')" min-width="160" show-overflow-tooltip />
        <el-table-column prop="comment" :label="t('tools.generator.tableDescription')" min-width="200" show-overflow-tooltip />
        <el-table-column :label="t('tools.generator.columnCount')" width="100" align="center">
          <template #default="{ row }">{{ row.columns.length }}</template>
        </el-table-column>
        <el-table-column :label="t('tools.generator.operation')" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'tools:gen:list'" type="primary" link icon="View" @click="handlePreview(row)">{{ t('tools.generator.preview') }}</el-button>
            <el-button v-perm="'tools:gen:add'" type="success" link icon="FolderAdd" @click="handleGen(row)">{{ t('tools.generator.generate') }}</el-button>
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
    <el-dialog v-model="previewVisible" :title="t('tools.generator.previewTitle')" width="800px" top="5vh">
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
        <el-button @click="previewVisible = false">{{ t('tools.generator.close') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="generateVisible"
      :title="t('tools.generator.generateTitle')"
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
        <el-form-item :label="t('tools.generator.dataTable')">
          <el-input :model-value="selectedTable?.table_name || ''" disabled />
        </el-form-item>
        <el-form-item :label="t('tools.generator.serverOutputDirectory')" prop="output_dir">
          <el-input
            v-model="generateForm.output_dir"
            prefix-icon="FolderOpened"
            :placeholder="t('tools.generator.outputDirectoryPlaceholder')"
            clearable
            autofocus
            @keyup.enter="submitGeneration"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="generating" @click="generateVisible = false">{{ t('tools.generator.cancel') }}</el-button>
        <el-button
          v-perm="'tools:gen:add'"
          type="primary"
          icon="MagicStick"
          :loading="generating"
          @click="submitGeneration"
        >
          {{ t('tools.generator.generate') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { generateCode, listTable, previewCode, type TableInfo } from '@/api/modules/tools'
import { buildGenerateRequest, isAbsoluteOutputPath } from './generationForm'

const { t } = useI18n()
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
    tableData.value = res.data?.items || []
    total.value = res.data?.total || 0
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
  } catch { /* 错误已由统一处理 */ }
}

// ----- 生成代码 -----
const generateVisible = ref(false)
const generateFormRef = ref<FormInstance>()
const generating = ref(false)
const selectedTable = ref<TableInfo | null>(null)
const generateForm = reactive({ output_dir: '' })
const generateRules = computed<FormRules>(() => ({
  output_dir: [
    { required: true, whitespace: true, message: t('tools.generator.outputDirectoryRequired'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (isAbsoluteOutputPath(String(value || ''))) {
          callback()
        } else {
          callback(new Error(t('tools.generator.backendOutputPathRequired')))
        }
      },
      trigger: ['blur', 'change'],
    },
  ],
}))

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
    if (!res.data) throw new Error(t('tools.generator.responseMissing'))
    const { written, skipped } = res.data
    const message = skipped.length > 0
      ? t('tools.generator.generateSuccessWithSkipped', { written: written.length, skipped: skipped.length })
      : t('tools.generator.generateSuccess', { written: written.length })
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
