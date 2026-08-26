<template>
  <div class="target-table-wrap">
    <el-table v-loading="loading" :data="targets" row-key="key" border stripe class="target-table">
      <el-table-column
        prop="key"
        :label="t('tenantData.targetKey')"
        min-width="180"
        fixed="left"
        show-overflow-tooltip
      />
      <el-table-column :label="t('tenantData.mode')" width="112" align="center">
        <template #default="{ row }">
          <el-tag :type="row.mode === 'dedicated' ? 'warning' : 'info'" effect="plain">
            {{ t(`tenantData.${row.mode}`) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="kind" :label="t('tenantData.kind')" width="112" />
      <el-table-column prop="region" :label="t('tenantData.region')" min-width="120">
        <template #default="{ row }">{{ row.region || t('tenantData.notAvailable') }}</template>
      </el-table-column>
      <el-table-column :label="t('tenantData.health')" width="122" align="center">
        <template #default="{ row }">
          <el-tag :type="healthTagType(row.health)">{{ healthLabel(row.health) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="schema_fingerprint"
        :label="t('tenantData.schemaFingerprint')"
        min-width="230"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <code>{{ row.schema_fingerprint || t('tenantData.notAvailable') }}</code>
        </template>
      </el-table-column>
      <el-table-column :label="t('tenantData.poolConnected')" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="row.connected ? 'success' : 'info'" effect="plain">
            {{ row.connected ? t('tenantData.connected') : t('tenantData.disconnected') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="pool_max_connections"
        :label="t('tenantData.poolMax')"
        width="120"
        align="right"
      >
        <template #default="{ row }">
          {{ row.pool_max_connections ?? t('tenantData.notAvailable') }}
        </template>
      </el-table-column>
      <el-table-column
        prop="active_leases"
        :label="t('tenantData.poolActive')"
        width="110"
        align="right"
      />
      <el-table-column :label="t('tenantData.actions')" width="100" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" link @click="emit('detail', row.key)">
            {{ t('tenantData.details') }}
          </el-button>
        </template>
      </el-table-column>
      <template #empty><el-empty :description="t('tenantData.noTargets')" /></template>
    </el-table>
  </div>

  <div v-loading="loading" class="target-card-list" aria-live="polite">
    <el-empty v-if="!loading && targets.length === 0" :description="t('tenantData.noTargets')" />
    <article v-for="target in targets" :key="target.key" class="target-mobile-card">
      <header>
        <strong>{{ target.key }}</strong>
        <el-tag :type="healthTagType(target.health)" size="small">
          {{ healthLabel(target.health) }}
        </el-tag>
      </header>
      <dl>
        <div>
          <dt>{{ t('tenantData.mode') }}</dt>
          <dd>{{ t(`tenantData.${target.mode}`) }}</dd>
        </div>
        <div>
          <dt>{{ t('tenantData.kind') }}</dt>
          <dd>{{ target.kind }}</dd>
        </div>
        <div>
          <dt>{{ t('tenantData.region') }}</dt>
          <dd>{{ target.region || t('tenantData.notAvailable') }}</dd>
        </div>
        <div>
          <dt>{{ t('tenantData.poolConnected') }}</dt>
          <dd>{{ target.connected ? t('tenantData.connected') : t('tenantData.disconnected') }}</dd>
        </div>
        <div>
          <dt>{{ t('tenantData.poolMax') }}</dt>
          <dd>{{ target.pool_max_connections ?? t('tenantData.notAvailable') }}</dd>
        </div>
        <div>
          <dt>{{ t('tenantData.poolActive') }}</dt>
          <dd>{{ target.active_leases }}</dd>
        </div>
        <div class="fingerprint">
          <dt>{{ t('tenantData.schemaFingerprint') }}</dt>
          <dd>{{ target.schema_fingerprint || t('tenantData.notAvailable') }}</dd>
        </div>
      </dl>
      <el-button type="primary" plain @click="emit('detail', target.key)">
        {{ t('tenantData.details') }}
      </el-button>
    </article>
  </div>

  <el-pagination
    v-if="total > 0"
    v-model:current-page="page"
    v-model:page-size="pageSize"
    :total="total"
    :page-sizes="[20, 50, 100]"
    layout="total, sizes, prev, pager, next"
    background
    class="target-pagination"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DataTargetSummary } from '@/api/modules/dataTarget'
import { healthTagType } from '@/features/tenant-data/presentation'

defineProps<{
  healthLabel: (health: string) => string
  loading: boolean
  targets: DataTargetSummary[]
  total: number
}>()

const emit = defineEmits<{
  detail: [targetKey: string]
}>()

const page = defineModel<number>('page', { required: true })
const pageSize = defineModel<number>('pageSize', { required: true })
const { t } = useI18n()
</script>

<style scoped>
.target-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.target-table {
  min-width: 1220px;
}

code {
  font-size: 12px;
}

.target-card-list {
  display: none;
}

.target-pagination {
  justify-content: flex-end;
  margin-top: 18px;
}

@media (width <= 767px) {
  .target-table-wrap {
    display: none;
  }

  .target-card-list {
    display: grid;
    gap: 12px;
    min-height: 120px;
  }

  .target-mobile-card {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--el-border-color);
    border-radius: 10px;
  }

  .target-mobile-card header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .target-mobile-card strong {
    overflow-wrap: anywhere;
  }

  .target-mobile-card dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 14px 0 0;
  }

  .target-mobile-card dl > div {
    min-width: 0;
  }

  .target-mobile-card .fingerprint {
    grid-column: 1 / -1;
  }

  dt {
    margin-bottom: 4px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .target-pagination {
    overflow-x: auto;
    justify-content: flex-start;
  }
}
</style>
