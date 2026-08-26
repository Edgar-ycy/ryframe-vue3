import { describe, expect, it } from 'vitest'
import {
  buildSchedulePayload,
  createDefaultScheduleForm,
  isScheduleFormComplete,
} from '@/views/monitor/schedules/schedule-form/model'

describe('定时任务表单模型', () => {
  it('校验可执行目标、预览状态和运行时边界', () => {
    const form = { ...createDefaultScheduleForm('Asia/Shanghai'), name: '数据清理' }

    expect(isScheduleFormComplete(form, true, true)).toBe(true)
    expect(isScheduleFormComplete(form, false, true)).toBe(false)
    expect(isScheduleFormComplete({ ...form, max_runtime_seconds: 86401 }, true, true)).toBe(false)
  })

  it('规范化保存字段并仅为编辑请求附加版本', () => {
    const form = {
      ...createDefaultScheduleForm('Asia/Shanghai'),
      name: '  数据清理  ',
      cron_expression: '  0 0 0 * * * *  ',
      timezone: '  Asia/Shanghai  ',
      handler_key: 'cleanup',
    }

    expect(buildSchedulePayload(form)).toMatchObject({
      name: '数据清理',
      cron_expression: '0 0 0 * * * *',
      timezone: 'Asia/Shanghai',
    })
    expect(buildSchedulePayload(form, 7)).toMatchObject({ version: 7 })
  })
})
