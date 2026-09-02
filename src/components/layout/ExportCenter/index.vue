<template>
  <el-badge
    :value="badgeCount() > 99 ? '99+' : badgeCount()"
    :hidden="badgeCount() === 0"
    :max="99"
    class="export-center-trigger"
  >
    <el-button
      text
      circle
      class="navbar-action"
      :aria-label="triggerLabel()"
      :title="triggerLabel()"
      @click="openDrawer"
    >
      <el-icon :size="20"><Download /></el-icon>
    </el-button>
  </el-badge>

  <ExportJobDrawer
    v-if="visible"
    v-model:visible="visible"
    :jobs="recentJobs()"
    :loading="listLoading"
    :error="listError"
    :cancelling-job-id="cancellingJobId"
    :deleting-job-ids="deletingJobIds"
    :downloading-job-id="downloadingJobId"
    @drawer-open="handleDrawerOpen"
    @refresh="refreshJobs"
    @cancel="cancel"
    @delete="remove"
    @download="download"
    @view-all="viewAll"
  />

  <span class="export-center-live" aria-live="polite" aria-atomic="true">
    {{ liveMessage }}
  </span>
</template>

<script setup lang="ts">
import { ElMessage, ElNotification } from 'element-plus'
import { useRouter } from 'vue-router'
import { CircleCheckFilled, Download, WarningFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { ExportJob } from '@/api/modules/exportJob'
import { exportJobDisplayName } from '@/app/exports/exportJobPresentation'
import { isTerminalExportJob } from '@/app/exports/exportJobCache'
import { useExportJobTracker } from '@/app/exports/useExportJobs'
import { HttpError } from '@/shared/http/client'
import { useServerStateScope } from '@/shared/query/client'
import {
  beginServerStatePageOperation,
  type ServerStatePageOperation,
} from '@/shared/query/pageOperationScope'
import { useUserStore } from '@/stores/user'
import { confirmAction } from '@/utils/confirmAction'
import ExportJobDrawer from './ExportJobDrawer.vue'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()
const visible = ref(false)
const liveMessage = ref('')
const notifiedTransitions = new Set<string>()
const localNotices = new Set<{ close: () => void }>()
let notificationGeneration = 0

const {
  jobs,
  listLoading,
  listError,
  activeCount,
  unreadCount,
  refresh,
  markVisibleNotificationsRead,
  cancelJob,
  cancellingJobId,
  deleteJobs,
  deletingJobIds,
  downloadJob,
  downloadingJobId,
  startTracking,
  stopTracking,
} = useExportJobTracker({
  enabled: () => Boolean(userStore.tenantId && userStore.userId),
  onTransition: notifyTerminalTransition,
})

const stopScopeWatch = watch(useServerStateScope(), resetExportCenterState, { flush: 'sync' })

onMounted(() => {
  void initializeTracker()
})

onUnmounted(() => {
  resetExportCenterState()
  stopScopeWatch()
  stopTracking()
})

function notificationMessage(
  job: ExportJob,
): { message: string; type: 'success' | 'error' | 'info' } | undefined {
  if (job.status === 'succeeded') {
    return {
      message: t('exportCenter.notifySucceeded', { name: exportJobDisplayName(job) }),
      type: 'success',
    }
  }
  if (job.status === 'failed') {
    return {
      message: t('exportCenter.notifyFailed', { name: exportJobDisplayName(job) }),
      type: 'error',
    }
  }
  if (job.status === 'cancelled') {
    return {
      message: t('exportCenter.notifyCancelled', { name: exportJobDisplayName(job) }),
      type: 'info',
    }
  }
  return undefined
}

async function initializeTracker(): Promise<void> {
  try {
    await refresh()
  } catch {
    // 首次加载错误由抽屉内联状态展示，不在登录完成时额外打断用户。
  } finally {
    startTracking()
  }
}

function triggerLabel(): string {
  if ((unreadCount.value ?? 0) > 0) {
    return t('exportCenter.openWithUnread', { count: unreadCount.value })
  }
  if (activeCount.value > 0) {
    return t('exportCenter.openWithActive', { count: activeCount.value })
  }
  return t('exportCenter.open')
}

function badgeCount(): number {
  const unread = unreadCount.value ?? 0
  return unread > 0 ? unread : activeCount.value
}

function recentJobs(): ExportJob[] {
  return (jobs.value ?? []).slice(0, 10)
}

function notifyTerminalTransition(previous: ExportJob, current: ExportJob): void {
  if (previous.status !== 'queued' && previous.status !== 'running') return
  const notification = notificationMessage(current)
  if (!notification) return
  const dedupeKey = `${current.id}:${current.status}`
  if (notifiedTransitions.has(dedupeKey)) return
  notifiedTransitions.add(dedupeKey)
  liveMessage.value = ''
  const generation = notificationGeneration
  void nextTick(() => {
    if (notificationGeneration === generation) liveMessage.value = notification.message
  })
  if (current.status === 'succeeded' || current.status === 'failed') {
    let notice!: { close: () => void }
    notice = ElNotification({
      title: t(
        current.status === 'succeeded'
          ? 'exportCenter.notifyTitleSucceeded'
          : 'exportCenter.notifyTitleFailed',
      ),
      message: notification.message,
      type: notification.type,
      icon: current.status === 'succeeded' ? CircleCheckFilled : WarningFilled,
      duration: 8_000,
      showClose: false,
      onClose: () => localNotices.delete(notice),
      onClick: () => {
        notice.close()
        void viewAll()
      },
    })
    localNotices.add(notice)
    if (visible.value || router.currentRoute.value.path === '/profile/exports') {
      void markVisibleNotificationsRead([current]).catch(() => undefined)
    }
    return
  }
  let notice!: { close: () => void }
  notice = ElMessage.info({
    message: notification.message,
    showClose: false,
    onClose: () => localNotices.delete(notice),
  })
  localNotices.add(notice)
}

function openDrawer(): void {
  visible.value = true
}

async function handleDrawerOpen(): Promise<void> {
  const operation = beginServerStatePageOperation()
  if (!(await refreshForOperation(operation))) return
  try {
    await markVisibleNotificationsRead(recentJobs())
  } catch {
    // 已读确认失败时保留徽标，下次打开或刷新继续确认。
  }
}

async function refreshJobs(): Promise<void> {
  const operation = beginServerStatePageOperation()
  try {
    await refresh()
    operation.assertCurrent()
  } catch (error) {
    if (!canReportActionError(operation, error)) return
    ElMessage.warning(t('exportCenter.loadFailed'))
  }
}

async function cancel(job: ExportJob): Promise<void> {
  const operation = beginServerStatePageOperation()
  if (
    !(await confirmAction(
      t('exportCenter.cancelConfirm', { name: exportJobDisplayName(job) }),
      t('exportCenter.cancelConfirmTitle'),
      { type: 'warning' },
    ))
  )
    return

  try {
    operation.assertCurrent()
    await cancelJob(job.id, operation.scope)
  } catch (error) {
    if (!canReportActionError(operation, error)) return
    if (!(await refreshForOperation(operation))) return
    const current = jobs.value?.find((item) => item.id === job.id)
    if (current && current.status !== 'queued' && current.status !== 'running') {
      ElMessage.info(`${exportJobDisplayName(current)}：${t(`exportCenter.${current.status}`)}`)
      return
    }
    ElMessage.error(t('exportCenter.cancelFailed'))
  }
}

async function download(job: ExportJob): Promise<void> {
  const operation = beginServerStatePageOperation()
  try {
    await downloadJob(job, operation.scope)
  } catch (error) {
    if (!canReportActionError(operation, error)) return
    if (!(await refreshForOperation(operation))) return
    const current = jobs.value?.find((item) => item.id === job.id)
    if (current?.status === 'expired' || isExpired(current?.expires_at ?? job.expires_at)) {
      ElMessage.error(t('exportCenter.downloadExpired'))
    } else if (error instanceof HttpError && error.status === 403) {
      ElMessage.error(t('exportCenter.downloadForbidden'))
    } else if (error instanceof HttpError && error.status === 404) {
      ElMessage.error(t('exportCenter.downloadMissing'))
    } else {
      ElMessage.error(t('exportCenter.downloadFailed'))
    }
  }
}

async function remove(job: ExportJob): Promise<void> {
  if (!isTerminalExportJob(job) || deletingJobIds.value.length > 0) return
  const operation = beginServerStatePageOperation()
  if (
    !(await confirmAction(
      t('exportCenter.deleteConfirm', { name: exportJobDisplayName(job) }),
      t('exportCenter.deleteConfirmTitle'),
      { type: 'warning', confirmButtonText: t('exportCenter.delete') },
    ))
  )
    return

  try {
    operation.assertCurrent()
    await deleteJobs([job.id], operation.scope)
    operation.apply(() => ElMessage.success(t('exportCenter.deleteSuccess')))
  } catch (error) {
    if (!canReportActionError(operation, error)) return
    if (error instanceof HttpError && error.status === 409) {
      if (!(await refreshForOperation(operation))) return
      ElMessage.warning(t('exportCenter.deleteConflict'))
      return
    }
    ElMessage.error(t('exportCenter.deleteFailed'))
  }
}

async function refreshForOperation(operation: ServerStatePageOperation): Promise<boolean> {
  if (!operation.isCurrent()) return false
  try {
    await refresh()
  } catch {
    // 动作失败后的补拉只负责对账，保留原始动作错误作为唯一提示。
  }
  return operation.isCurrent()
}

function canReportActionError(operation: ServerStatePageOperation, error: unknown): boolean {
  const cancelled = error instanceof HttpError && error.kind === 'cancelled'
  return operation.isCurrent() && !cancelled
}

function resetExportCenterState(): void {
  notificationGeneration += 1
  for (const notice of localNotices) notice.close()
  localNotices.clear()
  notifiedTransitions.clear()
  liveMessage.value = ''
  visible.value = false
}

function isExpired(value: string | null | undefined): boolean {
  if (!value) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp <= Date.now()
}

async function viewAll(): Promise<void> {
  visible.value = false
  await router.push('/profile/exports')
}
</script>

<style scoped lang="scss">
.export-center-trigger :deep(.el-badge__content) {
  transform: translateY(-4px) translateX(4px);
}

.export-center-live {
  position: fixed;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
