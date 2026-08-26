<template>
  <section aria-labelledby="service-audits-heading">
    <div class="panel-heading">
      <div>
        <h2 id="service-audits-heading">{{ t('serviceAccounts.audits') }}</h2>
        <p>{{ t('serviceAccounts.auditHint') }}</p>
      </div>
      <el-button :loading="loading" :disabled="loading" @click="emit('refresh')">
        {{ t('serviceAccounts.refresh') }}
      </el-button>
    </div>

    <el-alert
      v-if="hasError"
      :title="t('serviceAccounts.loadFailed')"
      type="error"
      show-icon
      :closable="false"
      class="panel-alert"
    />
    <el-skeleton v-if="loading && items.length === 0" :rows="6" animated />
    <el-empty v-else-if="items.length === 0" :description="t('serviceAccounts.emptyAudits')" />
    <template v-else>
      <div class="desktop-table" role="region" :aria-label="t('serviceAccounts.audits')">
        <el-table :data="items" border stripe row-key="id">
          <el-table-column
            prop="request_id"
            :label="t('serviceAccounts.requestId')"
            min-width="250"
            show-overflow-tooltip
          />
          <el-table-column
            prop="operation_id"
            :label="t('serviceAccounts.operation')"
            min-width="230"
            show-overflow-tooltip
          />
          <el-table-column
            prop="capability_key"
            :label="t('serviceAccounts.capability')"
            min-width="210"
            show-overflow-tooltip
          />
          <el-table-column :label="t('serviceAccounts.accessMode')" width="105">
            <template #default="{ row }">{{ accessModeLabel(row.access_mode) }}</template>
          </el-table-column>
          <el-table-column :label="t('serviceAccounts.result')" width="100">
            <template #default="{ row }">
              <el-tag :type="resultType(row.result)">{{ resultLabel(row.result) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="reason_code"
            :label="t('serviceAccounts.reasonCode')"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column prop="http_status" :label="t('serviceAccounts.httpStatus')" width="86" />
          <el-table-column prop="row_count" :label="t('serviceAccounts.rowCount')" width="82" />
          <el-table-column
            prop="response_bytes"
            :label="t('serviceAccounts.responseBytes')"
            min-width="120"
          />
          <el-table-column :label="t('serviceAccounts.startedAt')" min-width="180">
            <template #default="{ row }">{{ formatLocalizedDate(row.started_at) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div class="mobile-list">
        <article v-for="audit in items" :key="audit.id" class="mobile-card">
          <div class="mobile-card__heading">
            <code>{{ audit.request_id }}</code>
            <el-tag :type="resultType(audit.result)">{{ resultLabel(audit.result) }}</el-tag>
          </div>
          <dl>
            <div>
              <dt>{{ t('serviceAccounts.operation') }}</dt>
              <dd>{{ audit.operation_id }}</dd>
            </div>
            <div>
              <dt>{{ t('serviceAccounts.capability') }}</dt>
              <dd>{{ audit.capability_key }}</dd>
            </div>
            <div>
              <dt>{{ t('serviceAccounts.accessMode') }}</dt>
              <dd>{{ accessModeLabel(audit.access_mode) }}</dd>
            </div>
            <div>
              <dt>{{ t('serviceAccounts.reasonCode') }}</dt>
              <dd>{{ audit.reason_code }}</dd>
            </div>
            <div>
              <dt>{{ t('serviceAccounts.httpStatus') }}</dt>
              <dd>{{ audit.http_status }}</dd>
            </div>
            <div>
              <dt>{{ t('serviceAccounts.startedAt') }}</dt>
              <dd>{{ formatLocalizedDate(audit.started_at) }}</dd>
            </div>
          </dl>
        </article>
      </div>

      <el-pagination
        v-if="total > 0"
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        background
        class="pagination"
        @change="emit('page-change')"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type { ServiceAccessAudit } from '@/api/modules/serviceAccount'
import { formatLocalizedDate } from '@/i18n'

defineProps<{
  items: readonly ServiceAccessAudit[]
  total: number
  loading: boolean
  hasError: boolean
}>()

const emit = defineEmits<{ refresh: []; 'page-change': [] }>()
const page = defineModel<number>('page', { required: true })
const pageSize = defineModel<number>('pageSize', { required: true })
const { t } = useI18n()

function accessModeLabel(mode: string): string {
  if (mode === 'direct') return t('serviceAccounts.direct')
  if (mode === 'delegated') return t('serviceAccounts.delegated')
  return t('serviceAccounts.unknown')
}

function resultLabel(result: string): string {
  if (result === 'success') return t('serviceAccounts.success')
  if (result === 'denied') return t('serviceAccounts.denied')
  return t('serviceAccounts.failure')
}

function resultType(result: string): TagProps['type'] {
  if (result === 'success') return 'success'
  if (result === 'denied') return 'warning'
  return 'danger'
}
</script>

<style scoped>
.panel-heading,
.mobile-card__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-heading h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
}

.panel-heading p {
  margin: 6px 0 0;
  color: var(--el-text-color-secondary);
  line-height: 1.55;
}

.panel-alert {
  margin: 14px 0;
}

.desktop-table {
  max-width: 100%;
  margin-top: 16px;
  overflow-x: auto;
}

.desktop-table :deep(.el-table) {
  min-width: 1500px;
}

.mobile-list {
  display: none;
}

.pagination {
  justify-content: flex-end;
  margin-top: 16px;
}

@media (width < 768px) {
  .desktop-table {
    display: none;
  }

  .mobile-list {
    display: grid;
    gap: 12px;
    margin-top: 16px;
  }

  .mobile-card {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
    background: var(--el-fill-color-blank);
  }

  .mobile-card__heading code {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .mobile-card dl {
    display: grid;
    gap: 8px;
    margin: 14px 0 0;
  }

  .mobile-card dl > div {
    display: grid;
    grid-template-columns: minmax(100px, 38%) minmax(0, 1fr);
    gap: 8px;
  }

  .mobile-card dt {
    color: var(--el-text-color-secondary);
  }

  .mobile-card dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
    text-align: right;
  }

  .pagination {
    justify-content: center;
  }
}

@media (width < 480px) {
  .panel-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .panel-heading :deep(.el-button) {
    width: 100%;
    min-height: 44px;
  }
}
</style>
