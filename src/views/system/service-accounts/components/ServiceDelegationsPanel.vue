<template>
  <section aria-labelledby="service-delegations-heading">
    <div class="panel-heading">
      <div>
        <h2 id="service-delegations-heading">{{ t('serviceAccounts.delegations') }}</h2>
        <p>{{ t('serviceAccounts.delegationHint') }}</p>
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
    <el-skeleton v-if="loading && items.length === 0" :rows="5" animated />
    <el-empty v-else-if="items.length === 0" :description="t('serviceAccounts.emptyDelegations')" />
    <template v-else>
      <div class="desktop-table" role="region" :aria-label="t('serviceAccounts.delegations')">
        <el-table :data="[...items]" border stripe row-key="id">
          <el-table-column prop="id" label="ID" min-width="90" />
          <el-table-column
            prop="account_id"
            :label="t('serviceAccounts.accountId')"
            min-width="130"
          />
          <el-table-column prop="user_id" :label="t('serviceAccounts.userId')" min-width="130" />
          <el-table-column :label="t('serviceAccounts.mode')" min-width="230">
            <template #default="{ row }">
              <div class="capability-tags">
                <el-tag v-for="key in row.capability_keys" :key="key" size="small" type="info">
                  {{ key }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="reason"
            :label="t('serviceAccounts.reason')"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column :label="t('serviceAccounts.status')" width="105">
            <template #default="{ row }">
              <el-tag :type="delegationStatusTypeById(row.id)">{{
                delegationStatusLabelById(row.id)
              }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('serviceAccounts.expiresAt')" min-width="180">
            <template #default="{ row }">{{ formatLocalizedDate(row.expires_at) }}</template>
          </el-table-column>
          <el-table-column :label="t('serviceAccounts.actions')" width="110" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="isDelegationActiveById(row.id)"
                v-perm="'system:service-delegation:revoke'"
                type="danger"
                link
                :loading="revokingId === row.id"
                :disabled="Boolean(revokingId)"
                @click="revokeDelegation(row.id)"
              >
                {{ t('serviceAccounts.revoke') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="mobile-list">
        <article v-for="delegation in items" :key="delegation.id" class="mobile-card">
          <div class="mobile-card__heading">
            <strong>#{{ delegation.id }}</strong>
            <el-tag :type="delegationStatusType(delegation)">{{
              delegationStatusLabel(delegation)
            }}</el-tag>
          </div>
          <dl>
            <div>
              <dt>{{ t('serviceAccounts.accountId') }}</dt>
              <dd>{{ delegation.account_id }}</dd>
            </div>
            <div>
              <dt>{{ t('serviceAccounts.userId') }}</dt>
              <dd>{{ delegation.user_id }}</dd>
            </div>
            <div>
              <dt>{{ t('serviceAccounts.reason') }}</dt>
              <dd>{{ delegation.reason }}</dd>
            </div>
            <div>
              <dt>{{ t('serviceAccounts.expiresAt') }}</dt>
              <dd>{{ formatLocalizedDate(delegation.expires_at) }}</dd>
            </div>
          </dl>
          <div class="capability-tags">
            <el-tag v-for="key in delegation.capability_keys" :key="key" size="small" type="info">
              {{ key }}
            </el-tag>
          </div>
          <el-button
            v-if="isDelegationActive(delegation)"
            v-perm="'system:service-delegation:revoke'"
            type="danger"
            plain
            :loading="revokingId === delegation.id"
            :disabled="Boolean(revokingId)"
            @click="emit('revoke', delegation)"
          >
            {{ t('serviceAccounts.revoke') }}
          </el-button>
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
import type { ServiceDelegation } from '@/api/modules/serviceAccount'
import { formatLocalizedDate } from '@/i18n'

const props = defineProps<{
  items: readonly ServiceDelegation[]
  total: number
  loading: boolean
  hasError: boolean
  revokingId?: string
}>()

const emit = defineEmits<{
  refresh: []
  revoke: [delegation: ServiceDelegation]
  'page-change': []
}>()

const page = defineModel<number>('page', { required: true })
const pageSize = defineModel<number>('pageSize', { required: true })
const { t } = useI18n()

function isDelegationActive(item: ServiceDelegation): boolean {
  return item.status === 'active' && !item.revoked_at && Date.parse(item.expires_at) > Date.now()
}

function delegationStatusLabel(item: ServiceDelegation): string {
  if (item.revoked_at || item.status === 'revoked') return t('serviceAccounts.revoked')
  if (Date.parse(item.expires_at) <= Date.now()) return t('serviceAccounts.expired')
  return t('serviceAccounts.active')
}

function delegationStatusType(item: ServiceDelegation): TagProps['type'] {
  if (item.revoked_at || item.status === 'revoked') return 'info'
  if (Date.parse(item.expires_at) <= Date.now()) return 'warning'
  return 'success'
}

function findDelegation(id: string): ServiceDelegation | undefined {
  return props.items.find((delegation) => delegation.id === id)
}

function isDelegationActiveById(id: string): boolean {
  const delegation = findDelegation(id)
  return delegation ? isDelegationActive(delegation) : false
}

function delegationStatusLabelById(id: string): string {
  const delegation = findDelegation(id)
  return delegation ? delegationStatusLabel(delegation) : t('serviceAccounts.expired')
}

function delegationStatusTypeById(id: string): TagProps['type'] {
  const delegation = findDelegation(id)
  return delegation ? delegationStatusType(delegation) : 'info'
}

function revokeDelegation(id: string): void {
  const delegation = findDelegation(id)
  if (delegation) emit('revoke', delegation)
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
  min-width: 1080px;
}

.capability-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
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
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
    background: var(--el-fill-color-blank);
  }

  .mobile-card dl {
    display: grid;
    gap: 8px;
    margin: 0;
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

  .mobile-card :deep(.el-button) {
    width: 100%;
    min-height: 44px;
    margin-left: 0;
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
