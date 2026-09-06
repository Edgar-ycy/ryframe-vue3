<template>
  <el-col :xs="24" :lg="12">
    <el-card shadow="never" class="monitor-metric-card runtime-backup-card">
      <div class="monitor-metric-header runtime-backup-card__header">
        <span>{{ t('monitor.runtime.backupHealth') }}</span>
        <el-tag :type="statusTagType" size="small">{{ statusText }}</el-tag>
      </div>

      <div class="runtime-backup-card__summary">
        <div>
          <span>{{ t('monitor.runtime.backupLastSuccess') }}</span>
          <strong>{{ formatTime(backup?.last_success_at) }}</strong>
        </div>
        <div>
          <span>{{ t('monitor.runtime.backupRequiredResources') }}</span>
          <strong>{{ health?.required_resources ?? '—' }}</strong>
        </div>
        <div>
          <span>{{ t('monitor.runtime.backupProblemCount') }}</span>
          <strong :class="{ 'runtime-backup-card__danger': problemCount > 0 }">
            {{ health ? problemCount : '—' }}
          </strong>
        </div>
      </div>

      <div class="runtime-backup-card__details">
        <span>
          {{ t('monitor.runtime.backupOldestCapture') }}：{{ formatTime(health?.oldest_capture) }}
        </span>
        <span>
          {{ t('monitor.runtime.backupLastRestore') }}：{{
            formatTime(health?.last_restore_completed)
          }}
        </span>
        <span> {{ t('monitor.runtime.backupRestoreResult') }}：{{ restoreResultText }} </span>
        <span>
          {{ t('monitor.runtime.backupRestoreDuration') }}：{{
            formatSeconds(health?.restore_duration_seconds)
          }}
        </span>
        <span>
          {{ t('monitor.runtime.backupRecoveryPointAge') }}：{{
            formatSeconds(health?.recovery_point_age_seconds)
          }}
        </span>
        <span>
          {{ t('monitor.runtime.backupRestoreRunning') }}：{{ health?.restore_running ?? '—' }}
        </span>
        <span>
          {{ t('monitor.runtime.backupRestoreOverdue') }}：{{ health?.restore_overdue ?? '—' }}
        </span>
        <span>
          {{ t('monitor.runtime.backupMissingResources') }}：{{ health?.missing_resources ?? '—' }}
        </span>
        <span>
          {{ t('monitor.runtime.backupExpiredResources') }}：{{ health?.expired_resources ?? '—' }}
        </span>
        <span>
          {{ t('monitor.runtime.backupInvalidResources') }}：{{ health?.invalid_resources ?? '—' }}
        </span>
      </div>

      <p v-if="health && problemCount > 0" class="runtime-backup-card__notice">
        {{ t('monitor.runtime.backupProblemCountHelp') }}
      </p>
      <p v-if="backup && !backup.available" class="runtime-backup-card__notice">
        {{ t('monitor.runtime.backupSnapshotUnavailable') }}
      </p>
    </el-card>
  </el-col>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RuntimeBackupViewModel } from './backupPresentation'
import {
  backupProblemCount,
  backupRestoreTranslationKey,
  backupStatusTagType,
  backupStatusTranslationKey,
  formatBackupSeconds,
  formatBackupTime,
} from './backupPresentation'

const props = defineProps<{
  backup?: RuntimeBackupViewModel | null
}>()

const { locale, t } = useI18n()
const health = computed(() => props.backup?.health)
const problemCount = computed(() => backupProblemCount(health.value))
const statusTagType = computed(() => backupStatusTagType(props.backup?.collector_status))
const statusText = computed(() => t(backupStatusTranslationKey(props.backup?.collector_status)))
const restoreResultText = computed(() => t(backupRestoreTranslationKey(health.value)))

function formatTime(value?: string | null): string {
  return formatBackupTime(value, locale.value)
}

function formatSeconds(value?: number | null): string {
  return formatBackupSeconds(value, (key, params) => t(key, params))
}
</script>

<style scoped>
.runtime-backup-card {
  min-height: 218px;
}

.runtime-backup-card__header {
  justify-content: space-between;
}

.runtime-backup-card__header :deep(.el-tag) {
  color: var(--el-text-color-primary);
  background-color: color-mix(in srgb, var(--el-tag-text-color) 12%, var(--el-bg-color));
}

.runtime-backup-card__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}

.runtime-backup-card__summary div,
.runtime-backup-card__details {
  display: grid;
  gap: 5px;
}

.runtime-backup-card__summary span,
.runtime-backup-card__details,
.runtime-backup-card__notice {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.runtime-backup-card__summary strong {
  color: var(--el-text-color-primary);
  font-size: 18px;
}

.runtime-backup-card__details {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  line-height: 1.6;
}

.runtime-backup-card__summary .runtime-backup-card__danger {
  color: color-mix(in srgb, var(--el-color-danger) 55%, var(--el-text-color-primary));
}

.runtime-backup-card__notice {
  margin: 12px 0 0;
}

@media (width <= 767px) {
  .runtime-backup-card__summary,
  .runtime-backup-card__details {
    grid-template-columns: 1fr;
  }
}
</style>
