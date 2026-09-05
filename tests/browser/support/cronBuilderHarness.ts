import { createApp, defineComponent, h, ref } from 'vue'
import { i18n } from '@/i18n'
import CronScheduleBuilder from '@/views/monitor/schedules/CronScheduleBuilder.vue'

const cronExpression = ref('0 15 8 * * MON,WED *')
const disabled = ref(false)

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
        h(CronScheduleBuilder, {
          disabled: disabled.value,
          modelValue: cronExpression.value,
          'onUpdate:modelValue': (value: string) => {
            cronExpression.value = value
          },
        }),
        h('output', { 'data-testid': 'cron-value' }, cronExpression.value),
      ])
  },
})

createApp(Harness).use(i18n).mount('#app')
