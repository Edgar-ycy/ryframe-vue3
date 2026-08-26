<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline>
        <el-form-item :label="t('system.notice.title')">
          <el-input
            v-model="queryParams.title"
            :placeholder="t('system.notice.enterTitle')"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item :label="t('system.common.type')">
          <el-select
            v-model="queryParams.notice_type"
            :placeholder="t('system.notice.typePlaceholder')"
            clearable
            style="width: 120px"
          >
            <el-option :label="t('system.notice.notice')" value="notice" />
            <el-option :label="t('system.notice.announcement')" value="announcement" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('system.common.status')">
          <el-select
            v-model="queryParams.status"
            :placeholder="t('system.common.status')"
            clearable
            style="width: 100px"
          >
            <el-option :label="t('system.notice.published')" value="1" />
            <el-option :label="t('system.notice.draft')" value="0" />
            <el-option :label="t('system.notice.closed')" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            v-perm="'system:notice:list'"
            type="primary"
            icon="Search"
            @click="handleSearch"
            >{{ t('system.common.search') }}</el-button
          >
          <el-button v-perm="'system:notice:list'" icon="Refresh" @click="handleReset">{{
            t('system.common.reset')
          }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <NoticeTable
      v-model:page="queryParams.page"
      :limit="queryParams.page_size"
      :loading="loading"
      :table-data="tableResponse?.items ?? []"
      :total="tableResponse?.total ?? 0"
      :publishing-id="publishingId"
      :deleting-id="deletingId"
      @add="handleAdd"
      @edit="handleEdit"
      @publish-message="handlePublishMessage"
      @delete="handleDelete"
      @update:limit="queryParams.page_size = $event"
      @pagination-change="fetchData"
    />

    <NoticeEditorDialog
      v-model:visible="dialog.visible"
      v-model:form="form"
      :title="dialog.title"
      :is-edit="dialog.isEdit"
      :rules="rules"
      :rendered-content="renderedContent"
      :submit-loading="submitLoading"
      @close="resetDialog"
      @form-ready="setFormRef"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import NoticeEditorDialog from './NoticeEditorDialog.vue'
import NoticeTable from './NoticeTable.vue'
import { useNoticeManagement } from './useNoticeManagement'

const {
  deletingId,
  dialog,
  fetchData,
  form,
  handleAdd,
  handleDelete,
  handleEdit,
  handlePublishMessage,
  handleReset,
  handleSearch,
  loading,
  publishingId,
  queryParams,
  renderedContent,
  resetDialog,
  rules,
  setFormRef,
  submitLoading,
  tableResponse,
  t,
  handleSubmit,
} = useNoticeManagement()
</script>
