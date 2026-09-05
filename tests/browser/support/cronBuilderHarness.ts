import { createApp, defineComponent, h, ref } from 'vue'
import { i18n } from '@/i18n'
import CronScheduleBuilder from '@/views/monitor/schedules/CronScheduleBuilder.vue'

const cronExpression = ref('0 15 8 * * MON,WED *')

window.addEventListener('cron-expression', (event) => {
  cronExpression.value = (event as CustomEvent<string>).detail
})

const Harness = defineComponent({
  name: 'CronBuilderHarness',
  setup() {
    return () =>
      h(CronScheduleBuilder, {
        modelValue: cronExpression.value,
        'onUpdate:modelValue': (value: string) => {
          cronExpression.value = value
        },
      })
  },
})

createApp(Harness).use(i18n).mount('#app')
