import { createApp, defineComponent, h, ref } from 'vue'
import { i18n, setApplicationLocale } from '@/i18n'
import { monitorJobsZhCNMessages } from '@/i18n/catalog/monitor-jobs/zh-CN'
import CronScheduleBuilder from '@/views/monitor/schedules/CronScheduleBuilder.vue'

i18n.global.mergeLocaleMessage('zh-CN', monitorJobsZhCNMessages)
setApplicationLocale('zh-CN', { persist: false })

const cronExpression = ref('0 15 8 * * MON,WED *')
const disabled = ref(false)
const submittedCronExpression = ref('')

window.addEventListener('cron-expression', (event) => {
  cronExpression.value = (event as CustomEvent<string>).detail
})
window.addEventListener('cron-disabled', (event) => {
  disabled.value = (event as CustomEvent<boolean>).detail
})

const Harness = defineComponent({
  name: 'CronBuilderHarness',
  setup() {
    return () =>
      h('main', [
        h(
          'form',
          {
            onSubmit: (event: Event) => {
              event.preventDefault()
              submittedCronExpression.value = cronExpression.value
            },
          },
          [
            h(CronScheduleBuilder, {
              disabled: disabled.value,
              modelValue: cronExpression.value,
              'onUpdate:modelValue': (value: string) => {
                cronExpression.value = value
              },
            }),
            h('button', { type: 'submit', 'data-testid': 'submit-cron' }, '提交规则'),
          ],
        ),
        h('output', { 'data-testid': 'cron-value' }, cronExpression.value),
        h('output', { 'data-testid': 'submitted-cron' }, submittedCronExpression.value),
      ])
  },
})

createApp(Harness).use(i18n).mount('#app')
