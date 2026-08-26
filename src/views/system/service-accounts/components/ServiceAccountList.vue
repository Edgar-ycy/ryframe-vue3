<template>
  <div class="accounts-panel">
    <div class="panel-toolbar">
      <span>{{ t('serviceAccounts.totalAccounts', { count: accounts?.total ?? 0 }) }}</span>
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
    <el-skeleton v-if="loading && !accounts?.items.length" :rows="6" animated />
    <el-empty
      v-else-if="!accounts?.items.length"
      :description="t('serviceAccounts.emptyAccounts')"
    />

    <template v-else>
      <div class="accounts-table" role="region" :aria-label="t('serviceAccounts.accountsTab')">
        <el-table :data="accounts.items" border stripe row-key="id">
          <el-table-column
            prop="code"
            :label="t('serviceAccounts.code')"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column
            prop="name"
            :label="t('serviceAccounts.name')"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column
            prop="description"
            :label="t('serviceAccounts.description')"
            min-width="210"
            show-overflow-tooltip
          />
          <el-table-column :label="t('serviceAccounts.status')" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === '1' ? 'success' : 'info'">
                {{
                  row.status === '1' ? t('serviceAccounts.enabled') : t('serviceAccounts.disabled')
                }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="max_requests_per_minute"
            :label="t('serviceAccounts.maxRequests')"
            min-width="140"
            align="right"
          />
          <el-table-column :label="t('serviceAccounts.updatedAt')" min-width="180">
            <template #default="{ row }">{{ formatLocalizedDate(row.updated_at) }}</template>
          </el-table-column>
          <el-table-column :label="t('serviceAccounts.actions')" min-width="310" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="emit('details', row)">
                {{ t('serviceAccounts.details') }}
              </el-button>
              <el-button
                v-perm="'system:service-account:edit'"
                type="primary"
                link
                @click="emit('edit', row)"
              >
                {{ t('serviceAccounts.edit') }}
              </el-button>
              <el-button
                v-perm="'system:service-account:edit'"
                :type="row.status === '1' ? 'warning' : 'success'"
                link
                :loading="statusPending && pendingAccountId === row.id"
                :disabled="statusPending"
                @click="emit('status', row)"
              >
                {{
                  row.status === '1' ? t('serviceAccounts.disable') : t('serviceAccounts.enable')
                }}
              </el-button>
              <el-button
                v-perm="'system:service-account:remove'"
                type="danger"
                link
                :loading="removePending && pendingAccountId === row.id"
                :disabled="removePending"
                @click="emit('remove', row)"
              >
                {{ t('serviceAccounts.remove') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="accounts-mobile">
        <article v-for="account in accounts.items" :key="account.id" class="account-card">
          <div class="account-card__heading">
            <div>
              <strong>{{ account.name }}</strong>
              <code>{{ account.code }}</code>
            </div>
            <el-tag :type="account.status === '1' ? 'success' : 'info'">
              {{
                account.status === '1'
                  ? t('serviceAccounts.enabled')
                  : t('serviceAccounts.disabled')
              }}
            </el-tag>
          </div>
          <p>{{ account.description || t('serviceAccounts.notAvailable') }}</p>
          <dl>
            <div>
              <dt>{{ t('serviceAccounts.maxRequests') }}</dt>
              <dd>{{ account.max_requests_per_minute }}</dd>
            </div>
            <div>
              <dt>{{ t('serviceAccounts.updatedAt') }}</dt>
              <dd>{{ formatLocalizedDate(account.updated_at) }}</dd>
            </div>
          </dl>
          <div class="account-card__actions">
            <el-button type="primary" plain @click="emit('details', account)">
              {{ t('serviceAccounts.details') }}
            </el-button>
            <el-button v-perm="'system:service-account:edit'" @click="emit('edit', account)">
              {{ t('serviceAccounts.edit') }}
            </el-button>
            <el-button
              v-perm="'system:service-account:edit'"
              :type="account.status === '1' ? 'warning' : 'success'"
              plain
              :loading="statusPending && pendingAccountId === account.id"
              :disabled="statusPending"
              @click="emit('status', account)"
            >
              {{
                account.status === '1' ? t('serviceAccounts.disable') : t('serviceAccounts.enable')
              }}
            </el-button>
            <el-button
              v-perm="'system:service-account:remove'"
              type="danger"
              plain
              :loading="removePending && pendingAccountId === account.id"
              :disabled="removePending"
              @click="emit('remove', account)"
            >
              {{ t('serviceAccounts.remove') }}
            </el-button>
          </div>
        </article>
      </div>

      <el-pagination
        v-if="accounts.total > 0"
        :current-page="page"
        :page-size="pageSize"
        :total="accounts.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        background
        class="pagination"
        @current-change="emit('update:page', $event)"
        @size-change="emit('update:page-size', $event)"
        @change="emit('page-change')"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ServiceAccount } from '@/api/modules/serviceAccount'
import { formatLocalizedDate } from '@/i18n'

defineProps<{
  accounts?: { items: ServiceAccount[]; total: number }
  hasError: boolean
  loading: boolean
  page: number
  pageSize: number
  pendingAccountId?: string
  removePending: boolean
  statusPending: boolean
}>()

const emit = defineEmits<{
  refresh: []
  details: [account: ServiceAccount]
  edit: [account: ServiceAccount]
  status: [account: ServiceAccount]
  remove: [account: ServiceAccount]
  'update:page': [page: number]
  'update:page-size': [pageSize: number]
  'page-change': []
}>()

const { t } = useI18n()
</script>

<style scoped>
.panel-toolbar,
.account-card__heading,
.account-card__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-toolbar {
  align-items: center;
  margin-bottom: 14px;
  color: var(--el-text-color-secondary);
}

.panel-alert {
  margin-bottom: 14px;
}

.accounts-table {
  max-width: 100%;
  overflow-x: auto;
}

.accounts-table :deep(.el-table) {
  min-width: 1200px;
}

.accounts-mobile {
  display: none;
}

.pagination {
  justify-content: flex-end;
  margin-top: 16px;
}

@media (width < 768px) {
  .accounts-table {
    display: none;
  }

  .accounts-mobile {
    display: grid;
    gap: 12px;
  }

  .account-card {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
    background: var(--el-fill-color-blank);
  }

  .account-card__heading > div {
    display: grid;
    min-width: 0;
    gap: 5px;
  }

  .account-card__heading code,
  .account-card p {
    overflow-wrap: anywhere;
  }

  .account-card p {
    color: var(--el-text-color-secondary);
    line-height: 1.55;
  }

  .account-card dl {
    display: grid;
    gap: 8px;
    margin: 14px 0;
  }

  .account-card dl > div {
    display: grid;
    grid-template-columns: minmax(110px, 45%) minmax(0, 1fr);
    gap: 8px;
  }

  .account-card dt {
    color: var(--el-text-color-secondary);
  }

  .account-card dd {
    margin: 0;
    text-align: right;
  }

  .account-card__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .account-card__actions :deep(.el-button) {
    width: 100%;
    min-height: 44px;
    margin-left: 0;
  }

  .pagination {
    justify-content: center;
  }
}

@media (width < 480px) {
  .panel-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .panel-toolbar :deep(.el-button) {
    width: 100%;
    min-height: 44px;
  }

  .account-card__actions {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
