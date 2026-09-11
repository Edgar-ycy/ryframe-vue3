import { createApp, defineComponent, h, onMounted, ref } from 'vue'
import { i18n, setApplicationLocale } from '@/i18n'
import { monitorJobsZhCNMessages } from '@/i18n/catalog/monitor-jobs/zh-CN'
import { configureHttpSession } from '@/shared/http/client'
import { getServerStateScope, transitionServerStateScope } from '@/shared/query/client'
import ScheduleFormDialog from '@/views/monitor/schedules/ScheduleFormDialog.vue'

i18n.global.mergeLocaleMessage('zh-CN', monitorJobsZhCNMessages)
setApplicationLocale('zh-CN', { persist: false })

transitionServerStateScope(
  {
    authorizationFingerprint: 'cron-builder-harness',
    subjectId: 'cron-builder-harness',
    tenantId: 'cron-builder-harness',
  },
  () => undefined,
  { force: true },
)
configureHttpSession({
  getSnapshot: () => {
    const scope = getServerStateScope()
    return scope
      ? {
          accessToken: 'cron-builder-harness',
          sessionEpoch: scope.sessionEpoch,
          signal: scope.signal,
          tenantId: scope.tenantId,
        }
      : undefined
  },
  handleRefreshFailure: () => Promise.resolve(),
  observeTenantContext: () => undefined,
  refreshAccessToken: () => Promise.resolve('cron-builder-harness'),
})

const ScheduleFormHarness = defineComponent({
  name: 'ScheduleFormHarness',
  setup() {
    const visible = ref(false)
    const submittedPayload = ref('')
    onMounted(() => {
      visible.value = true
    })
    return () =>
      h('main', [
        h(ScheduleFormDialog, {
          modelValue: visible.value,
          targets: [
            {
              available: true,
              display_name: '数据清理',
              handler_key: 'cleanup',
              job_type: 'cleanup',
              scope: 'tenant',
            },
          ],
          targetName: () => '数据清理',
          saving: false,
          'onUpdate:modelValue': (value: boolean) => {
            visible.value = value
          },
          onSave: (payload: unknown) => {
            submittedPayload.value = JSON.stringify(payload)
          },
        }),
        h('output', { 'data-testid': 'submitted-schedule' }, submittedPayload.value),
      ])
  },
})

createApp(ScheduleFormHarness).use(i18n).mount('#app')
