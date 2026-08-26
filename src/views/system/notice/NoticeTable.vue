<template>
  <el-card shadow="never" class="content-card">
    <template #header>
      <div class="card-header">
        <span>{{ t('system.notice.list') }}</span>
        <el-button v-perm="'system:notice:add'" type="primary" icon="Plus" @click="emit('add')">{{
          t('system.common.add')
        }}</el-button>
      </div>
    </template>
    <el-table v-loading="loading" :data="tableData" border stripe>
      <el-table-column prop="id" :label="t('system.common.id')" width="70" align="center" />
      <el-table-column
        prop="title"
        :label="t('system.notice.shortTitle')"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        prop="content_markdown"
        :label="t('system.common.content')"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column :label="t('system.common.type')" align="center">
        <template #default="{ row }">
          <el-tag :type="row.notice_type === 'notice' ? 'primary' : 'warning'" size="small">
            {{
              row.notice_type === 'notice'
                ? t('system.notice.notice')
                : t('system.notice.announcement')
            }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" :label="t('system.common.status')" align="center">
        <template #default="{ row }">
          <el-tag
            :type="row.status === '1' ? 'success' : row.status === '2' ? 'info' : 'warning'"
            size="small"
          >
            {{
              row.status === '1'
                ? t('system.notice.published')
                : row.status === '2'
                  ? t('system.notice.closed')
                  : t('system.notice.draft')
            }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('system.common.createdAt')" min-width="160">
        <template #default="{ row }">{{ formatLocalizedDate(row.created_at) }}</template>
      </el-table-column>
      <el-table-column :label="t('system.common.actions')" fixed="right" align="center">
        <template #default="{ row }">
          <el-button
            v-if="row.status === '1'"
            v-perm="'system:message:publish'"
            type="primary"
            link
            :loading="publishingId === row.id"
            @click="emit('publish-message', row)"
          >
            {{ t('system.notice.publishToMessageCenter') }}
          </el-button>
          <el-button
            v-perm="'system:notice:edit'"
            type="primary"
            link
            icon="Edit"
            @click="emit('edit', row)"
            >{{ t('system.common.edit') }}</el-button
          >
          <el-button
            v-perm="'system:notice:remove'"
            type="danger"
            link
            icon="Delete"
            :loading="deletingId === row.id"
            @click="emit('delete', row)"
          >
            {{ t('system.common.delete') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      :current-page="props.page ?? 1"
      :page-size="props.limit ?? 10"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      background
      @update:current-page="emit('update:page', $event)"
      @update:page-size="emit('update:limit', $event)"
      @change="emit('pagination-change')"
    />
  </el-card>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { NoticeRecord } from '@/generated/resources/notice/api'
import { formatLocalizedDate } from '@/i18n'
import type { Id } from '@/shared/http/types'

const props = defineProps<{
  page?: number
  limit?: number
  loading: boolean
  tableData: NoticeRecord[]
  total: number
  publishingId: Id | null
  deletingId: Id | null
}>()

const emit = defineEmits<{
  'update:page': [value: number]
  'update:limit': [value: number]
  add: []
  edit: [notice: NoticeRecord]
  'publish-message': [notice: NoticeRecord]
  delete: [notice: NoticeRecord]
  'pagination-change': []
}>()

const { t } = useI18n()
</script>
