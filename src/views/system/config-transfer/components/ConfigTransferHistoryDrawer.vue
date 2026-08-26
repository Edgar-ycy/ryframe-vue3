<template>
  <el-drawer
    v-model="visible"
    :title="t('tenantConfigTransfer.historyTitle')"
    size="min(760px, 100vw)"
    class="config-transfer-history-drawer"
    @open="emit('open')"
    @closed="emit('closed')"
  >
    <p class="drawer-hint">{{ t('tenantConfigTransfer.historyHint') }}</p>
    <el-button
      v-perm="'system:config-transfer:list'"
      icon="Refresh"
      :loading="loading"
      class="refresh-button"
      @click="emit('refresh')"
    >
      {{ t('tenantConfigTransfer.refresh') }}
    </el-button>

    <el-empty
      v-if="!loading && transfers.length === 0"
      :description="t('tenantConfigTransfer.historyEmpty')"
    />
    <div v-loading="loading" class="history-list" aria-live="polite">
      <article
        v-for="transfer in transfers"
        :key="transfer.id"
        class="history-card"
        :class="{ 'is-selected': selectedTransferId === transfer.id }"
      >
        <header>
          <div>
            <strong>{{ transfer.bundle_summary.source_tenant_name }}</strong>
            <small>{{ transfer.bundle_summary.source_tenant_key }}</small>
          </div>
          <el-tag :type="statusTag(transfer.status)" size="small">{{
            statusLabel(transfer.status)
          }}</el-tag>
        </header>
        <dl>
          <div>
            <dt>{{ t('tenantConfigTransfer.itemCount') }}</dt>
            <dd>{{ transfer.bundle_summary.item_count }}</dd>
          </div>
          <div>
            <dt>{{ t('tenantConfigTransfer.createdAt') }}</dt>
            <dd>{{ formatLocalizedDate(transfer.created_at) }}</dd>
          </div>
          <div>
            <dt>{{ t('tenantConfigTransfer.previewedAt') }}</dt>
            <dd>{{ formatOptionalLocalizedDate(transfer.preview_calculated_at) }}</dd>
          </div>
          <div v-if="transfer.rollback_expires_at">
            <dt>{{ t('tenantConfigTransfer.rollbackUntil') }}</dt>
            <dd>{{ formatOptionalLocalizedDate(transfer.rollback_expires_at) }}</dd>
          </div>
        </dl>
        <el-alert
          v-if="transfer.error_summary"
          :title="transfer.error_summary"
          type="error"
          :closable="false"
          class="history-error"
        />
        <footer>
          <el-button
            v-perm="'system:config-transfer:list'"
            type="primary"
            :plain="selectedTransferId !== transfer.id"
            @click="emit('select', transfer)"
          >
            {{ t('tenantConfigTransfer.select') }}
          </el-button>
        </footer>
      </article>
    </div>

    <el-pagination
      v-if="total > pageSize"
      :current-page="page"
      :page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      background
      @current-change="(nextPage: number) => emit('page-change', nextPage, pageSize)"
      @size-change="(size: number) => emit('page-change', 1, size)"
    />
  </el-drawer>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type { TenantConfigTransfer } from '@/api/modules/tenantConfigTransfer'
import { formatLocalizedDate, formatOptionalLocalizedDate } from '@/i18n'

defineProps<{
  transfers: TenantConfigTransfer[]
  loading: boolean
  selectedTransferId?: string
  page: number
  pageSize: number
  total: number
}>()

const emit = defineEmits<{
  open: []
  closed: []
  refresh: []
  select: [transfer: TenantConfigTransfer]
  'page-change': [page: number, pageSize: number]
}>()

const visible = defineModel<boolean>({ required: true })
const { t } = useI18n()

function statusLabel(status: string): string {
  const suffix =
    {
      preview_ready: 'PreviewReady',
      preview_pending: 'PreviewPending',
      previewing: 'Previewing',
      previewed: 'Previewed',
      apply_pending: 'ApplyPending',
      applying: 'Applying',
      applied: 'Applied',
      rollback_pending: 'RollbackPending',
      rolling_back: 'RollingBack',
      rolled_back: 'RolledBack',
      failed: 'Failed',
    }[status] ?? 'Unknown'
  return t(`tenantConfigTransfer.status${suffix}`)
}

function statusTag(status: string): TagProps['type'] {
  if (status === 'applied' || status === 'previewed') return 'success'
  if (status === 'rolled_back') return 'info'
  if (status === 'failed') return 'danger'
  if (status.includes('pending')) return 'warning'
  return 'primary'
}
</script>

<style scoped lang="scss">
.drawer-hint {
  margin: 0 0 12px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.refresh-button {
  margin-bottom: 12px;
}

.history-list {
  display: grid;
  gap: 12px;
}

.history-card {
  padding: 14px;
  border: 1px solid var(--border-color-base);
  border-radius: 10px;
  background: var(--el-fill-color-blank);

  &.is-selected {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary) inset;
  }

  header,
  footer {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  header > div {
    min-width: 0;
  }

  header small {
    display: block;
    margin-top: 4px;
    color: var(--color-text-secondary);
    overflow-wrap: anywhere;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 14px 0;
  }

  dl > div {
    display: grid;
    gap: 3px;
  }

  dt {
    color: var(--color-text-secondary);
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  footer {
    justify-content: flex-end;
  }
}

.history-error {
  margin-bottom: 12px;
}

@media (width <= 480px) {
  .history-card {
    padding: 12px;

    dl {
      grid-template-columns: 1fr;
    }

    footer :deep(.el-button) {
      width: 100%;
      min-height: 40px;
    }
  }
}
</style>
