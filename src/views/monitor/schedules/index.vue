<template>
  <div class="page-container schedules-page">
    <el-card shadow="never" class="search-card">
      <el-form :model="queryParams" inline @submit.prevent="handleSearch">
        <el-form-item :label="t('monitor.schedules.name')">
          <el-input
            v-model="queryParams.name"
            :placeholder="t('monitor.schedules.namePlaceholder')"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item :label="t('monitor.schedules.target')">
          <el-select
            v-model="queryParams.handler_key"
            :placeholder="t('monitor.schedules.targetPlaceholder')"
            clearable
            filterable
          >
            <el-option
              v-for="target in targets"
              :key="target.handler_key"
              :label="targetName(target.handler_key)"
              :value="target.handler_key"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('monitor.schedules.status')">
          <el-select
            v-model="queryParams.enabled"
            :placeholder="t('monitor.schedules.statusPlaceholder')"
            clearable
          >
            <el-option :label="t('monitor.schedules.enabled')" :value="true" />
            <el-option :label="t('monitor.schedules.disabled')" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            v-perm="'monitor:schedule:list'"
            type="primary"
            icon="Search"
            @click="handleSearch"
            >{{ t('monitor.schedules.search') }}</el-button
          >
          <el-button v-perm="'monitor:schedule:list'" icon="Refresh" @click="handleReset">{{
            t('monitor.schedules.reset')
          }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="schedules-card">
      <template #header>
        <div class="card-header">
          <span>{{ t('monitor.schedules.listTitle') }}</span>
          <div>
            <el-button
              v-perm="'monitor:schedule:list'"
              icon="Refresh"
              :loading="loading || targetLoading"
              @click="refresh"
              >{{ t('monitor.schedules.refresh') }}</el-button
            >
            <el-button
              v-if="hasPermission('monitor:schedule:add')"
              type="primary"
              icon="Plus"
              :disabled="availableTargets().length === 0 || hasPendingWrite"
              @click="openCreate"
              >{{ t('monitor.schedules.add') }}</el-button
            >
          </div>
        </div>
      </template>

      <el-alert
        v-if="availableTargets().length === 0 && targetsLoaded"
        :title="t('monitor.schedules.noTargetsHint')"
        type="info"
        show-icon
        :closable="false"
        class="schedules-alert"
      />
      <el-alert
        v-if="schedulesError?.message || targetsError?.message"
        :title="schedulesError?.message || targetsError?.message || ''"
        type="error"
        show-icon
        :closable="false"
        class="schedules-alert"
      />

      <div class="table-scroll">
        <el-table
          v-loading="loading"
          :data="schedules?.items ?? []"
          border
          stripe
          class="schedules-table"
          :empty-text="t('common.noData')"
        >
          <el-table-column
            prop="name"
            :label="t('monitor.schedules.name')"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column
            :label="t('monitor.schedules.target')"
            min-width="180"
            show-overflow-tooltip
          >
            <template #default="{ row }">{{ targetName(row.handler_key) }}</template>
          </el-table-column>
          <el-table-column
            prop="cron_expression"
            :label="t('monitor.schedules.cron')"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column
            prop="timezone"
            :label="t('monitor.schedules.timezone')"
            min-width="150"
            show-overflow-tooltip
          />
          <el-table-column :label="t('monitor.schedules.status')" width="108" align="center">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'info'" size="small">{{
                row.enabled ? t('monitor.schedules.enabled') : t('monitor.schedules.disabled')
              }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('monitor.schedules.lastRunAt')" min-width="160">
            <template #default="{ row }">{{
              formatOptionalLocalizedDate(row.last_run_at)
            }}</template>
          </el-table-column>
          <el-table-column :label="t('monitor.schedules.nextRunAt')" min-width="160">
            <template #default="{ row }">{{
              formatOptionalLocalizedDate(row.next_run_at)
            }}</template>
          </el-table-column>
          <el-table-column
            :label="t('monitor.schedules.operation')"
            min-width="350"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <el-button
                v-if="hasPermission('monitor:schedule:edit')"
                type="primary"
                link
                icon="Edit"
                :loading="editingId === row.id"
                :disabled="hasPendingWrite"
                @click="openEdit(row)"
                >{{ t('monitor.schedules.edit') }}</el-button
              >
              <el-button
                v-if="hasPermission('monitor:schedule:edit')"
                :type="row.enabled ? 'warning' : 'success'"
                link
                :loading="statusPendingId === row.id"
                :disabled="hasPendingWrite"
                @click="handleStatus(row, !row.enabled)"
                >{{
                  row.enabled ? t('monitor.schedules.disable') : t('monitor.schedules.enable')
                }}</el-button
              >
              <el-button
                v-if="hasPermission('monitor:schedule:run')"
                type="primary"
                link
                icon="VideoPlay"
                :loading="runPendingId === row.id"
                :disabled="hasPendingWrite"
                @click="handleRun(row)"
                >{{ t('monitor.schedules.run') }}</el-button
              >
              <el-button
                type="info"
                link
                icon="Clock"
                :disabled="hasPendingWrite"
                @click="openHistory(row)"
                >{{ t('monitor.schedules.history') }}</el-button
              >
              <el-button
                v-if="hasPermission('monitor:schedule:remove')"
                type="danger"
                link
                icon="Delete"
                :loading="removePendingId === row.id"
                :disabled="hasPendingWrite"
                @click="handleRemove(row)"
                >{{ t('monitor.schedules.delete') }}</el-button
              >
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.page_size"
        :total="schedules?.total ?? 0"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @change="fetchData"
      />
    </el-card>

    <ScheduleFormDialog
      v-model="formVisible"
      :schedule="editingSchedule"
      :targets="targets ?? []"
      :target-name="targetName"
      :saving="formSaving"
      @save="saveSchedule"
    />
    <ScheduleHistoryDrawer v-model="historyVisible" :schedule="historySchedule" />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { formatOptionalLocalizedDate } from '@/i18n'
import { usePermission } from '@/hooks/usePermission'
import ScheduleFormDialog from './ScheduleFormDialog.vue'
import ScheduleHistoryDrawer from './ScheduleHistoryDrawer.vue'
import { useScheduleManagement } from './useScheduleManagement'

const { t } = useI18n()
const { hasPermission } = usePermission()
const {
  availableTargets,
  editingId,
  editingSchedule,
  fetchData,
  formSaving,
  formVisible,
  handleRemove,
  handleReset,
  handleRun,
  handleSearch,
  handleStatus,
  hasPendingWrite,
  historySchedule,
  historyVisible,
  loading,
  openCreate,
  openEdit,
  openHistory,
  queryParams,
  refresh,
  removePendingId,
  runPendingId,
  saveSchedule,
  schedules,
  schedulesError,
  statusPendingId,
  targetLoading,
  targetsLoaded,
  targetName,
  targets,
  targetsError,
} = useScheduleManagement(t)
</script>

<style scoped lang="scss">
.schedules-page {
  min-width: 0;
  max-width: 100%;
}

.schedules-card {
  margin-top: 12px;
}

.schedules-alert {
  margin-bottom: 12px;
}

.table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.schedules-table {
  min-width: 1280px;
}
</style>
