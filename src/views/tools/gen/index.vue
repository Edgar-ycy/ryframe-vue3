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
      <el-table v-loading="loading" :data="tableResponse?.items ?? []" border stripe>
        <el-table-column prop="table_name" :label="t('tools.generator.tableName')" min-width="160" show-overflow-tooltip />
        <el-table-column prop="comment" :label="t('tools.generator.tableDescription')" min-width="200" show-overflow-tooltip />
        <el-table-column :label="t('tools.generator.columnCount')" width="100" align="center">
          <template #default="{ row }">{{ row.columns.length }}</template>
        </el-table-column>
        <el-table-column :label="t('tools.generator.operation')" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-perm="'tools:gen:list'"
              type="primary"
              link
              icon="View"
              :loading="previewingTable === row.table_name"
              @click="handlePreview(row)"
            >
              {{ t('tools.generator.preview') }}
            </el-button>
            <el-button
              v-perm="'tools:gen:add'"
              type="success"
              link
              icon="FolderAdd"
              :disabled="generating"
              @click="handleGen(row)"
            >
              {{ t('tools.generator.generate') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.page_size"
        :total="tableResponse?.total ?? 0" :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper" background
        @change="fetchData"
      />
    </el-card>

    <!-- 预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="t('tools.generator.previewTitle')"
      width="800px"
      top="5vh"
    >
      <div v-loading="previewLoading">
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
      </div>
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
        :ref="setGenerateFormRef"
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
import { useGeneratorManagement } from './useGeneratorManagement'

const { t } = useI18n()
const {
  fetchData,
  generateForm,
  generateRules,
  generateVisible,
  generating,
  handleGen,
  handlePreview,
  handleReset,
  handleSearch,
  loading,
  previewFiles,
  previewLoading,
  previewTab,
  previewVisible,
  previewingTable,
  queryParams,
  resetGenerateForm,
  selectedTable,
  setGenerateFormRef,
  submitGeneration,
  tableResponse,
} = useGeneratorManagement(t)
</script>
